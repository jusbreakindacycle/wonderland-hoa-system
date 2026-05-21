import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export interface PaymentRow {
  id: string
  unit_id: string
  amount: number
  payment_method: string | null
  reference_number: string | null
  payment_date: string
  credit_used: number
  notes: string | null
  created_at: string
  units: { unit_code: string; homeowners: { full_name: string; is_active: boolean }[] } | null
  received_by_profile: { full_name: string } | null
  payment_allocations: {
    id: string
    amount_allocated: number
    dues: { billing_month: string; due_date: string } | null
  }[]
}

export interface AllocationPreview {
  unit_id: string
  payment_amount: number
  credit_available: number
  total_available: number
  allocations: {
    due_id: string
    billing_month: string
    due_date: string
    balance: number
    allocated: number
    will_be_paid: boolean
  }[]
  overpayment: number
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          units(unit_code, homeowners(full_name, is_active)),
          received_by_profile:profiles!received_by(full_name),
          payment_allocations(id, amount_allocated, dues(billing_month, due_date))
        `)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as PaymentRow[]
    },
  })
}

export function usePreviewAllocation(unitId: string, amount: number) {
  return useQuery({
    queryKey: ['preview-allocation', unitId, amount],
    enabled: !!unitId && amount > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('preview_payment_allocation', {
        p_unit_id: unitId,
        p_amount:  amount,
      })
      if (error) throw error

      // PostgREST wraps scalar RETURNS jsonb in an array or keyed object — normalise it
      const raw = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
      if (!raw || typeof raw !== 'object') return null

      // If PostgREST wrapped under the function name key, unwrap it
      const preview = (raw['preview_payment_allocation'] ?? raw) as Record<string, unknown>

      return {
        unit_id:          String(preview.unit_id          ?? ''),
        payment_amount:   Number(preview.payment_amount   ?? 0),
        credit_available: Number(preview.credit_available ?? 0),
        total_available:  Number(preview.total_available  ?? 0),
        overpayment:      Number(preview.overpayment      ?? 0),
        allocations:      Array.isArray(preview.allocations) ? preview.allocations : [],
      } as AllocationPreview
    },
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (input: {
      unit_id: string
      amount: number
      payment_method: string
      reference_number?: string
      notes?: string
    }) => {
      const { data, error } = await supabase.rpc('process_payment', {
        p_unit_id:     input.unit_id,
        p_amount:      input.amount,
        p_method:      input.payment_method,
        p_reference:   input.reference_number ?? null,
        p_received_by: profile!.id,
        p_notes:       input.notes ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
      qc.invalidateQueries({ queryKey: ['unit-detail'] })
      qc.invalidateQueries({ queryKey: ['preview-allocation'] })
      toast.success('Payment recorded.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
