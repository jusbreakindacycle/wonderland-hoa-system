import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export interface AnnouncementRow {
  id: string
  title: string
  body: string
  target: 'all' | 'block' | 'unit'
  target_value: string | null
  created_at: string
  posted_by_profile: { full_name: string } | null
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, posted_by_profile:profiles!posted_by(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as AnnouncementRow[]
    },
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (input: { title: string; body: string; target: 'all' | 'block' | 'unit'; target_value?: string }) => {
      const { data, error } = await supabase.from('announcements').insert({
        ...input,
        posted_by: user!.id,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement posted.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
