import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export interface VisitorRow {
  id: string
  unit_id: string | null
  visitor_name: string
  purpose: string | null
  time_in: string
  time_out: string | null
  created_at: string
  units: { unit_code: string; house_no: string } | null
  logged_by_profile: { full_name: string } | null
}

export function useVisitors(date?: string) {
  return useQuery({
    queryKey: ['visitors', date],
    queryFn: async () => {
      let q = supabase
        .from('visitors')
        .select(`
          *,
          units(unit_code, house_no),
          logged_by_profile:profiles!logged_by(full_name)
        `)
        .order('time_in', { ascending: false })

      if (date) {
        q = q.gte('time_in', `${date}T00:00:00`).lte('time_in', `${date}T23:59:59`)
      }

      const { data, error } = await q
      if (error) throw error
      return data as unknown as VisitorRow[]
    },
  })
}

export function useLogVisitor() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (input: { unit_id?: string; visitor_name: string; purpose?: string }) => {
      const { data, error } = await supabase.from('visitors').insert({
        ...input,
        logged_by: user!.id,
        time_in: new Date().toISOString(),
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      toast.success('Visitor logged in.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useLogVisitorOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (visitorId: string) => {
      const { error } = await supabase
        .from('visitors')
        .update({ time_out: new Date().toISOString() })
        .eq('id', visitorId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      toast.success('Visitor logged out.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
