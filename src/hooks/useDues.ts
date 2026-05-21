import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export interface DueRow {
  id: string
  unit_id: string
  billing_month: string
  amount: number
  amount_paid: number
  balance: number
  due_date: string
  status: 'unpaid' | 'partial' | 'paid' | 'waived' | 'void'
  void_waive_reason: string | null
  voided_waived_at: string | null
  units: { unit_code: string; house_no: string; homeowners: { full_name: string }[] } | null
}

interface DueFilters {
  billing_month?: string
  status?: string
}

export function useDues(filters?: DueFilters) {
  return useQuery({
    queryKey: ['dues', filters],
    queryFn: async () => {
      let q = supabase
        .from('dues')
        .select('*, units(unit_code, house_no, homeowners(full_name))')
        .order('due_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters?.billing_month) q = q.eq('billing_month', filters.billing_month)
      if (filters?.status)        q = q.eq('status', filters.status as DueRow['status'])

      const { data, error } = await q
      if (error) throw error

      return data as DueRow[]
    },
  })
}

export function useVoidOrWaiveDue() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async ({ due_id, action, reason }: { due_id: string; action: 'void' | 'waive'; reason: string }) => {
      const { error } = await supabase.rpc('void_or_waive_due', {
        p_due_id:   due_id,
        p_action:   action,
        p_reason:   reason,
        p_actor_id: profile!.id,
      })
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['dues'] })
      qc.invalidateQueries({ queryKey: ['unit-detail'] })
      toast.success(`Due ${vars.action === 'void' ? 'voided' : 'waived'}.`)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
