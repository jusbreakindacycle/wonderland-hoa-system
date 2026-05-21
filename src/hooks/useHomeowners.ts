import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface HomeownerInput {
  unit_id: string
  full_name: string
  email?: string
  contact_number?: string
  move_in_date?: string
}

export function useAddHomeowner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: HomeownerInput) => {
      await supabase.from('homeowners').update({ is_active: false }).eq('unit_id', input.unit_id).eq('is_active', true)
      const { data, error } = await supabase.from('homeowners').insert({ ...input, is_active: true }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['unit-detail'] })
      toast.success('Homeowner assigned.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateHomeowner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HomeownerInput> & { id: string }) => {
      const { data, error } = await supabase.from('homeowners').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['unit-detail'] })
      toast.success('Homeowner updated.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useMarkMovedOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ homeownerId, unitId }: { homeownerId: string; unitId: string }) => {
      const today = new Date().toISOString().split('T')[0]
      const { error: hwErr } = await supabase
        .from('homeowners')
        .update({ is_active: false, move_out_date: today })
        .eq('id', homeownerId)
      if (hwErr) throw hwErr
      const { error: unitErr } = await supabase
        .from('units')
        .update({ status: 'vacant' })
        .eq('id', unitId)
      if (unitErr) throw unitErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] })
      qc.invalidateQueries({ queryKey: ['unit-detail'] })
      toast.success('Homeowner marked as moved out. Unit is now vacant.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
