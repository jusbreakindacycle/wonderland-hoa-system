import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { ShieldCheck } from 'lucide-react'
import { useAuditLogs, getActionLabel, type AuditLogRow } from '@/hooks/useAuditLogs'
import { DataTable } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const ACTION_OPTIONS = [
  { value: 'payment.created',        label: 'Payment Recorded' },
  { value: 'due.void',               label: 'Due Voided' },
  { value: 'due.waive',              label: 'Due Waived' },
  { value: 'credit.refund_approved', label: 'Credit Refund Approved' },
  { value: 'dues.generated',         label: 'Dues Generated' },
]

const ACTION_COLORS: Record<string, string> = {
  'payment.created':        'bg-green-100 text-green-700',
  'due.void':               'bg-red-100 text-red-700',
  'due.waive':              'bg-amber-100 text-amber-700',
  'credit.refund_approved': 'bg-blue-100 text-blue-700',
  'dues.generated':         'bg-purple-100 text-purple-700',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {getActionLabel(action)}
    </span>
  )
}

function DetailModal({ log, onClose }: { log: AuditLogRow; onClose: () => void }) {
  return (
    <Modal open title="Audit Log Detail" onClose={onClose} width="lg"
      footer={<div className="flex justify-end"><Button variant="secondary" onClick={onClose}>Close</Button></div>}
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Date / Time</p>
            <p className="font-medium">{new Date(log.created_at).toLocaleString('en-PH')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Actor</p>
            <p className="font-medium">{log.actor?.full_name ?? 'System'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Action</p>
            <ActionBadge action={log.action} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Table</p>
            <p>{log.table_name ?? '—'}</p>
          </div>
        </div>

        {log.remarks && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Remarks / Reason</p>
            <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">{log.remarks}</p>
          </div>
        )}

        {log.new_value && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Details</p>
            <pre className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs overflow-auto whitespace-pre-wrap">
              {JSON.stringify(log.new_value, null, 2)}
            </pre>
          </div>
        )}

        {log.old_value && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Previous State</p>
            <pre className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs overflow-auto whitespace-pre-wrap">
              {JSON.stringify(log.old_value, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('')
  const { data = [], isLoading } = useAuditLogs(actionFilter || undefined)
  const [selected, setSelected] = useState<AuditLogRow | null>(null)

  const columns: ColumnDef<AuditLogRow, unknown>[] = [
    {
      id: 'created_at',
      header: 'Date / Time',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString('en-PH'),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: ({ row }) => row.original.actor?.full_name ?? <span className="text-gray-400">System</span>,
    },
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => <ActionBadge action={row.original.action} />,
    },
    {
      id: 'table_name',
      header: 'Table',
      cell: ({ row }) => <span className="text-gray-500 text-xs">{row.original.table_name ?? '—'}</span>,
    },
    {
      id: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => row.original.remarks
        ? <span className="text-gray-700 truncate max-w-xs block">{row.original.remarks}</span>
        : <span className="text-gray-400">—</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Full history of all financial and administrative actions</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Select
          placeholder="All actions"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          options={ACTION_OPTIONS}
          className="w-56"
        />
        {actionFilter && (
          <button
            onClick={() => setActionFilter('')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear
          </button>
        )}
      </div>

      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        onRowClick={row => setSelected(row)}
      />

      {selected && <DetailModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
