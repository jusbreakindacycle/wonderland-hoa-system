import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { Street } from '@/lib/database.types'

export type UnitWithHomeowner = {
  id: string
  house_no: string
  street: Street
  /** Generated: `"<house_no> <street>"`, e.g. `"113 Sunflower"`. */
  unit_code: string
  status: 'occupied' | 'vacant'
  homeowners: {
    id: string
    full_name: string
    email: string | null
    contact_number: string | null
    move_in_date: string | null
    is_active: boolean
  }[]
}

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*, homeowners(id, full_name, email, contact_number, move_in_date, is_active)')
        .order('street')
        .order('house_no')
      if (error) throw error
      return data as UnitWithHomeowner[]
    },
  })
}

export function useUnitDetail(unitId: string | null) {
  return useQuery({
    queryKey: ['unit-detail', unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const [unitRes, duesRes, paymentsRes, creditRes] = await Promise.all([
        supabase.from('units').select('*, homeowners(*)').eq('id', unitId!).single(),
        supabase.from('dues').select('*').eq('unit_id', unitId!).order('due_date', { ascending: false }),
        supabase.from('payments').select('*, payment_allocations(*, dues(billing_month))').eq('unit_id', unitId!).order('payment_date', { ascending: false }),
        supabase.from('unit_credits').select('balance').eq('unit_id', unitId!).maybeSingle(),
      ])
      if (unitRes.error) throw unitRes.error
      return {
        unit: unitRes.data,
        dues: duesRes.data ?? [],
        payments: paymentsRes.data ?? [],
        credit: creditRes.data?.balance ?? 0,
      }
    },
  })
}

export function useAddUnit() {
  const qc = useQueryClient()
  return useMutation({
    // `street` is NOT NULL and constrained to STREETS — an insert without it is rejected.
    mutationFn: async (unit: { house_no: string; street: Street; status?: 'occupied' | 'vacant' }) => {
      const { data, error } = await supabase.from('units').insert(unit).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); toast.success('Unit added.') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: 'occupied' | 'vacant'; house_no?: string; street?: Street }) => {
      const { data, error } = await supabase.from('units').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units'] }); toast.success('Unit updated.') },
    onError: (e: Error) => toast.error(e.message),
  })
}
