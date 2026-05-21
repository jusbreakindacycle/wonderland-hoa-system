import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useDues, useVoidOrWaiveDue, type DueRow } from '@/hooks/useDues'
import { useAuthStore } from '@/stores/authStore'
import { canVoidOrWaive } from '@/lib/auth'

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-PH')

function VoidWaiveModal({
  due,
  action,
  onClose,
}: {
  due: DueRow
  action: 'void' | 'waive'
  onClose: () => void
}) {
  const mutation = useVoidOrWaiveDue()
  const [reason, setReason] = useState('')

  async function handleSubmit() {
    await mutation.mutateAsync({ due_id: due.id, action, reason })
    onClose()
  }

  return (
    <Modal
      open
      title={action === 'void' ? 'Void Due' : 'Waive Due'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant={action === 'void' ? 'danger' : 'primary'}
            onClick={handleSubmit}
            loading={mutation.isPending}
            disabled={!reason.trim()}
          >
            Confirm {action === 'void' ? 'Void' : 'Waive'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-md p-4 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Unit</span><span>{due.units?.unit_code}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Month</span><span>{due.billing_month}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Balance</span><span className="font-medium">{fmt(due.balance)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge status={due.status} /></div>
        </div>

        {action === 'void' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
            Voiding will reverse all payments allocated to this due back to the unit credit wallet.
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Reason <span className="text-red-500">*</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for this action..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </Modal>
  )
}

function buildMonthOptions() {
  const now = new Date()
  const start = new Date(now.getFullYear() - 1, 0, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 1)
  const months: { value: string; label: string }[] = []
  const d = new Date(start)
  while (d <= end) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({ value, label: d.toLocaleString('en-PH', { month: 'long', year: 'numeric' }) })
    d.setMonth(d.getMonth() + 1)
  }
  return months
}
const MONTHS = buildMonthOptions()

export function DuesPage() {
  const { profile } = useAuthStore()
  const canAction = canVoidOrWaive(profile?.role)

  const [billingMonth, setBillingMonth] = useState('')
  const [status, setStatus] = useState('')

  const { data = [], isLoading } = useDues({
    billing_month: billingMonth || undefined,
    status: status || undefined,
  })

  const [voidWaive, setVoidWaive] = useState<{ due: DueRow; action: 'void' | 'waive' } | null>(null)

  const columns: ColumnDef<DueRow, unknown>[] = [
    { id: 'unit_code', header: 'Unit', cell: ({ row }) => row.original.units?.unit_code ?? '—' },
    {
      id: 'homeowner',
      header: 'Homeowner',
      cell: ({ row }) => row.original.units?.homeowners?.[0]?.full_name ?? <span className="text-gray-400">—</span>,
    },
    { accessorKey: 'billing_month', header: 'Month' },
    { accessorKey: 'amount',      header: 'Amount',  cell: ({ row }) => fmt(row.original.amount) },
    { accessorKey: 'amount_paid', header: 'Paid',    cell: ({ row }) => fmt(row.original.amount_paid) },
    { accessorKey: 'balance',     header: 'Balance', cell: ({ row }) => fmt(row.original.balance) },
    { accessorKey: 'due_date',    header: 'Due Date', cell: ({ row }) => fmtDate(row.original.due_date) },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge status={row.original.status} />,
    },
    ...(canAction ? [{
      id: 'actions',
      header: '',
      cell: ({ row }: { row: { original: DueRow } }) => {
        const due = row.original
        if (['void', 'waived', 'paid'].includes(due.status)) return null
        return (
          <div className="flex gap-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => setVoidWaive({ due, action: 'waive' })}>Waive</Button>
            <Button size="sm" variant="ghost" onClick={() => setVoidWaive({ due, action: 'void' })}>Void</Button>
          </div>
        )
      },
    } as ColumnDef<DueRow, unknown>] : []),
  ]

  const totalOutstanding = data
    .filter(d => ['unpaid', 'partial'].includes(d.status))
    .reduce((sum, d) => sum + d.balance, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dues Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Outstanding: {fmt(totalOutstanding)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          placeholder="All months"
          value={billingMonth}
          onChange={e => setBillingMonth(e.target.value)}
          options={MONTHS}
          className="w-48"
        />
        <Select
          placeholder="All statuses"
          value={status}
          onChange={e => setStatus(e.target.value)}
          options={[
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
            { value: 'waived', label: 'Waived' },
            { value: 'void', label: 'Void' },
          ]}
          className="w-40"
        />
        {(billingMonth || status) && (
          <Button variant="ghost" size="sm" onClick={() => { setBillingMonth(''); setStatus('') }}>
            Clear filters
          </Button>
        )}
      </div>

      <DataTable data={data} columns={columns} loading={isLoading} />

      {voidWaive && (
        <VoidWaiveModal
          due={voidWaive.due}
          action={voidWaive.action}
          onClose={() => setVoidWaive(null)}
        />
      )}
    </div>
  )
}
