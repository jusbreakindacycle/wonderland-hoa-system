import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export interface ComplaintRow {
  id: string
  unit_id: string | null
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  resolved_at: string | null
  created_at: string
  submitted_by_profile: { full_name: string } | null
  assigned_to_profile: { full_name: string } | null
  units: { unit_code: string } | null
}

export function useComplaints() {
  return useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          units(unit_code),
          submitted_by_profile:profiles!submitted_by(full_name),
          assigned_to_profile:profiles!assigned_to(full_name)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ComplaintRow[]
    },
  })
}

export function useSubmitComplaint() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (input: { unit_id?: string; subject: string; description: string }) => {
      const { data, error } = await supabase.from('complaints').insert({
        ...input,
        submitted_by: user!.id,
        status: 'open',
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] })
      toast.success('Complaint submitted.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateComplaint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      status?: 'open' | 'in_progress' | 'resolved'
      assigned_to?: string | null
    }) => {
      const { id, ...rest } = input
      const updateData: { status?: 'open' | 'in_progress' | 'resolved'; assigned_to?: string | null; resolved_at?: string | null } = { ...rest }
      if (input.status === 'resolved') updateData.resolved_at = new Date().toISOString()
      const { data, error } = await supabase.from('complaints').update(updateData).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] })
      toast.success('Complaint updated.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
