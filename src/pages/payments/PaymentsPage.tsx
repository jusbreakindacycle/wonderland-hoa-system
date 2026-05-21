import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Printer } from 'lucide-react'
import { printPaymentReceipt } from '@/lib/printPDF'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { usePayments, useRecordPayment, usePreviewAllocation, type PaymentRow } from '@/hooks/usePayments'
import { useUnits } from '@/hooks/useUnits'
import { useAuthStore } from '@/stores/authStore'
import { canRecordPayments } from '@/lib/auth'

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-PH')

function AllocationPreview({ unitId, amount }: { unitId: string; amount: number }) {
  const { data, isLoading, isError } = usePreviewAllocation(unitId, amount)

  if (isLoading) return <div className="text-xs text-gray-400 py-1">Calculating allocation...</div>
  if (isError || !data) return null

  const allocations    = Array.isArray(data.allocations) ? data.allocations : []
  const creditAvail    = Number(data.credit_available) || 0
  const totalAvail     = Number(data.total_available)  || 0
  const overpayment    = Number(data.overpayment)      || 0

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Credit available</span>
        <span className="font-medium text-blue-700">{fmt(creditAvail)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Total to allocate</span>
        <span className="font-medium">{fmt(totalAvail)}</span>
      </div>
      {allocations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Will be applied to:</p>
          <div className="space-y-1">
            {allocations.map((a, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {a.billing_month}
                  {a.will_be_paid
                    ? <span className="ml-1 text-xs text-green-600 font-medium">Full</span>
                    : <span className="ml-1 text-xs text-amber-600 font-medium">Partial</span>
                  }
                </span>
                <span>{fmt(Number(a.allocated) || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {overpayment > 0 && (
        <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
          <span className="text-gray-600">Stored as credit</span>
          <span className="font-medium text-blue-700">{fmt(overpayment)}</span>
        </div>
      )}
      {allocations.length === 0 && (
        <p className="text-sm text-gray-500">No unpaid dues — full amount stored as credit.</p>
      )}
    </div>
  )
}

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const { data: units = [] } = useUnits()
  const recordPayment = useRecordPayment()

  const [form, setForm] = useState({
    unit_id: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  })
  const [refError, setRefError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'reference_number') setRefError('')
    if (field === 'payment_method') setRefError('')
  }

  const requiresRef = form.payment_method !== 'cash'

  async function handleSubmit() {
    if (requiresRef && !form.reference_number.trim()) {
      setRefError('Reference number is required for this payment method')
      return
    }
    await recordPayment.mutateAsync({
      unit_id: form.unit_id,
      amount: parseFloat(form.amount),
      payment_method: form.payment_method,
      reference_number: form.reference_number || undefined,
      notes: form.notes || undefined,
    })
    onClose()
  }

  const unitOptions = units.map(u => ({
    value: u.id,
    label: `${u.unit_code} — ${u.homeowners.find(h => h.is_active)?.full_name ?? 'Vacant'}`,
  }))

  const amount = parseFloat(form.amount) || 0

  return (
    <Modal
      open title="Record Payment" onClose={onClose} width="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            loading={recordPayment.isPending}
            disabled={!form.unit_id || !(amount > 0)}
          >
            Record Payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Unit *"
          value={form.unit_id}
          onChange={e => set('unit_id', e.target.value)}
          options={unitOptions}
          placeholder="Select unit..."
        />
        <Input
          label="Amount (₱) *"
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={e => set('amount', e.target.value)}
          placeholder="0.00"
        />
        <Select
          label="Payment Method *"
          value={form.payment_method}
          onChange={e => set('payment_method', e.target.value)}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'gcash', label: 'GCash' },
            { value: 'bank_transfer', label: 'Bank Transfer' },
          ]}
        />
        <Input
          label={requiresRef ? 'Reference Number *' : 'Reference Number'}
          value={form.reference_number}
          onChange={e => set('reference_number', e.target.value)}
          placeholder={requiresRef ? 'GCash/bank reference number' : 'Optional'}
          error={refError}
        />
        <Input
          label="Notes"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Optional"
        />

        {form.unit_id && amount > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Allocation Preview</p>
            <AllocationPreview unitId={form.unit_id} amount={amount} />
          </div>
        )}
      </div>
    </Modal>
  )
}

function PaymentDetailModal({ payment, onClose }: { payment: PaymentRow; onClose: () => void }) {
  return (
    <Modal
      open title="Payment Details" onClose={onClose}
      footer={
        <div className="flex justify-between w-full">
          <Button variant="secondary" onClick={() => printPaymentReceipt(payment)}>
            <Printer className="h-4 w-4 mr-1" /> Print Receipt
          </Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500 block">Unit</span>{payment.units?.unit_code}</div>
          <div><span className="text-gray-500 block">Date</span>{fmtDate(payment.payment_date)}</div>
          <div><span className="text-gray-500 block">Amount</span><span className="font-semibold">{fmt(payment.amount)}</span></div>
          <div><span className="text-gray-500 block">Method</span><span className="capitalize">{payment.payment_method}</span></div>
          <div><span className="text-gray-500 block">Reference</span>{payment.reference_number || '—'}</div>
          <div><span className="text-gray-500 block">Received by</span>{payment.received_by_profile?.full_name ?? '—'}</div>
          {payment.credit_used > 0 && (
            <div><span className="text-gray-500 block">Credit used</span>{fmt(payment.credit_used)}</div>
          )}
          {payment.notes && (
            <div className="col-span-2"><span className="text-gray-500 block">Notes</span>{payment.notes}</div>
          )}
        </div>

        {payment.payment_allocations.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Allocation Breakdown</p>
            <div className="rounded-md border border-gray-200 divide-y text-sm">
              {payment.payment_allocations.map(a => (
                <div key={a.id} className="flex justify-between px-4 py-2">
                  <span>{a.dues?.billing_month ?? '—'}</span>
                  <span className="font-medium">{fmt(a.amount_allocated)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function PaymentsPage() {
  const { data = [], isLoading } = usePayments()
  const { profile } = useAuthStore()
  const canRecord = canRecordPayments(profile?.role)

  const [recordOpen, setRecordOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null)

  const columns: ColumnDef<PaymentRow, unknown>[] = [
    { accessorKey: 'payment_date', header: 'Date', cell: ({ row }) => fmtDate(row.original.payment_date) },
    { id: 'unit', header: 'Unit', cell: ({ row }) => row.original.units?.unit_code ?? '—' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => fmt(row.original.amount) },
    {
      accessorKey: 'payment_method', header: 'Method',
      cell: ({ row }) => <span className="capitalize">{row.original.payment_method}</span>,
    },
    { accessorKey: 'reference_number', header: 'Reference', cell: ({ row }) => row.original.reference_number || '—' },
    {
      id: 'received_by',
      header: 'Received By',
      cell: ({ row }) => row.original.received_by_profile?.full_name ?? '—',
    },
    {
      id: 'allocations',
      header: 'Applied To',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.payment_allocations.map((a, i) => (
            <span key={i} className="text-xs bg-gray-100 rounded px-1.5 py-0.5">
              {a.dues?.billing_month}
            </span>
          ))}
        </div>
      ),
    },
  ]

  const totalThisMonth = data
    .filter(p => p.payment_date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Collected this month: {fmt(totalThisMonth)}</p>
        </div>
        {canRecord && (
          <Button onClick={() => setRecordOpen(true)}>
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        )}
      </div>

      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        onRowClick={row => setSelectedPayment(row)}
      />

      {recordOpen && <RecordPaymentModal onClose={() => setRecordOpen(false)} />}
      {selectedPayment && <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
    </div>
  )
}
