import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AuditLogRow {
  id: string
  actor_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  remarks: string | null
  created_at: string
  actor: { full_name: string | null } | null
}

const ACTION_LABELS: Record<string, string> = {
  'payment.created':        'Payment Recorded',
  'due.void':               'Due Voided',
  'due.waive':              'Due Waived',
  'credit.refund_approved': 'Credit Refund Approved',
  'dues.generated':         'Dues Generated',
}

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function useAuditLogs(actionFilter?: string) {
  return useQuery({
    queryKey: ['audit-logs', actionFilter],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('*, actor:profiles!actor_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(500)

      if (actionFilter) q = q.eq('action', actionFilter)

      const { data, error } = await q
      if (error) throw error
      return data as unknown as AuditLogRow[]
    },
  })
}
