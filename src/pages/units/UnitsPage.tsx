import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Eye, Pencil, LogOut } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useUnits, useAddUnit, useUnitDetail, type UnitWithHomeowner } from '@/hooks/useUnits'
import { useAddHomeowner, useUpdateHomeowner, useMarkMovedOut } from '@/hooks/useHomeowners'
import { useAuthStore } from '@/stores/authStore'
import { canManageHomeowners } from '@/lib/auth'

type DetailHomeowner = {
  id: string
  full_name: string
  email: string | null
  contact_number: string | null
  is_active: boolean
}

type DetailDue = {
  id: string
  billing_month: string
  amount: number
  amount_paid: number
  balance: number
  due_date: string
  status: 'unpaid' | 'partial' | 'paid' | 'waived' | 'void'
}

type DetailPayment = {
  id: string
  payment_date: string
  amount: number
  payment_method: string | null
  reference_number: string | null
  payment_allocations: { dues: { billing_month: string } | null }[]
}

function UnitDetailModal({ unitId, onClose }: { unitId: string; onClose: () => void }) {
  const { data, isLoading } = useUnitDetail(unitId)
  const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-PH')

  return (
    <Modal open title="Unit Details" onClose={onClose} width="xl">
      {isLoading || !data ? (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Unit {data.unit.unit_code}</h3>
            {(data.unit.homeowners as DetailHomeowner[]).filter(h => h.is_active).map(h => (
              <div key={h.id} className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Name</span><p className="font-medium">{h.full_name}</p></div>
                <div><span className="text-gray-500">Email</span><p>{h.email || '—'}</p></div>
                <div><span className="text-gray-500">Contact</span><p>{h.contact_number || '—'}</p></div>
              </div>
            ))}
            <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md text-sm font-medium">
              Credit balance: {fmt(data.credit)}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Dues History</h3>
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full text-sm divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Month', 'Amount', 'Paid', 'Balance', 'Due Date', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data.dues as DetailDue[]).map(d => (
                    <tr key={d.id}>
                      <td className="px-3 py-2">{d.billing_month}</td>
                      <td className="px-3 py-2">{fmt(d.amount)}</td>
                      <td className="px-3 py-2">{fmt(d.amount_paid)}</td>
                      <td className="px-3 py-2">{fmt(d.balance)}</td>
                      <td className="px-3 py-2">{fmtDate(d.due_date)}</td>
                      <td className="px-3 py-2"><Badge status={d.status} /></td>
                    </tr>
                  ))}
                  {data.dues.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400">No dues yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment History</h3>
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full text-sm divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Amount', 'Method', 'Reference', 'Applied to'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data.payments as DetailPayment[]).map(p => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">{fmtDate(p.payment_date)}</td>
                      <td className="px-3 py-2">{fmt(p.amount)}</td>
                      <td className="px-3 py-2 capitalize">{p.payment_method}</td>
                      <td className="px-3 py-2">{p.reference_number || '—'}</td>
                      <td className="px-3 py-2">
                        {p.payment_allocations.map((a, i) => (
                          <span key={i} className="inline-block bg-gray-100 rounded px-1 mr-1 text-xs">
                            {a.dues?.billing_month}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {data.payments.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No payments yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </Modal>
  )
}

function AddUnitModal({ onClose }: { onClose: () => void }) {
  const addUnit = useAddUnit()
  const [houseNo, setHouseNo] = useState('')
  const [status, setStatus] = useState<'occupied' | 'vacant'>('vacant')

  async function handleSubmit() {
    await addUnit.mutateAsync({ house_no: houseNo.trim(), status })
    onClose()
  }

  return (
    <Modal
      open title="Add Unit" onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={addUnit.isPending} disabled={!houseNo.trim()}>Add Unit</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="House No."
          value={houseNo}
          onChange={e => setHouseNo(e.target.value)}
          placeholder="e.g. 12, 12A, 14B"
        />
        <Select
          label="Status" value={status}
          onChange={e => setStatus(e.target.value as 'occupied' | 'vacant')}
          options={[{ value: 'vacant', label: 'Vacant' }, { value: 'occupied', label: 'Occupied' }]}
        />
      </div>
    </Modal>
  )
}

function AssignHomeownerModal({ unitId, onClose }: { unitId: string; onClose: () => void }) {
  const addHomeowner = useAddHomeowner()
  const [form, setForm] = useState({ full_name: '', email: '', contact_number: '', move_in_date: '' })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    await addHomeowner.mutateAsync({ unit_id: unitId, ...form })
    onClose()
  }

  return (
    <Modal
      open title="Assign Homeowner" onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={addHomeowner.isPending} disabled={!form.full_name}>
            Assign
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Full Name *" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        <Input label="Contact Number" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} />
        <Input label="Move-in Date" type="date" value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
      </div>
    </Modal>
  )
}

type ActiveHomeowner = {
  id: string
  full_name: string
  email: string | null
  contact_number: string | null
  move_in_date: string | null
}

function EditHomeownerModal({
  homeowner,
  onClose,
}: {
  homeowner: ActiveHomeowner
  onClose: () => void
}) {
  const updateHomeowner = useUpdateHomeowner()
  const [form, setForm] = useState({
    full_name: homeowner.full_name,
    email: homeowner.email ?? '',
    contact_number: homeowner.contact_number ?? '',
    move_in_date: homeowner.move_in_date ?? '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    await updateHomeowner.mutateAsync({
      id: homeowner.id,
      full_name: form.full_name,
      email: form.email || undefined,
      contact_number: form.contact_number || undefined,
      move_in_date: form.move_in_date || undefined,
    })
    onClose()
  }

  return (
    <Modal
      open title="Edit Homeowner" onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={updateHomeowner.isPending} disabled={!form.full_name}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Full Name *" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        <Input label="Contact Number" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} />
        <Input label="Move-in Date" type="date" value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
      </div>
    </Modal>
  )
}

function MarkMovedOutModal({
  unit,
  homeowner,
  onClose,
}: {
  unit: UnitWithHomeowner
  homeowner: ActiveHomeowner
  onClose: () => void
}) {
  const markMovedOut = useMarkMovedOut()

  async function handleConfirm() {
    await markMovedOut.mutateAsync({ homeownerId: homeowner.id, unitId: unit.id })
    onClose()
  }

  return (
    <Modal
      open
      title="Mark as Moved Out"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm} loading={markMovedOut.isPending}>
            Confirm Move Out
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          This will mark <strong>{homeowner.full_name}</strong> as moved out and set House No. <strong>{unit.house_no}</strong> to <strong>Vacant</strong>. This action does not delete any records.
        </div>
        <p className="text-sm text-gray-600">Today's date will be recorded as the move-out date. You can assign a new homeowner to this unit at any time.</p>
      </div>
    </Modal>
  )
}

export function UnitsPage() {
  const { data = [], isLoading } = useUnits()
  const { profile } = useAuthStore()
  const canManage = canManageHomeowners(profile?.role)

  const [addOpen, setAddOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [assignUnitId, setAssignUnitId] = useState<string | null>(null)
  const [editHomeowner, setEditHomeowner] = useState<{ unit: UnitWithHomeowner; homeowner: ActiveHomeowner } | null>(null)
  const [movedOutTarget, setMovedOutTarget] = useState<{ unit: UnitWithHomeowner; homeowner: ActiveHomeowner } | null>(null)
  const [search, setSearch] = useState('')

  const filtered = data.filter(u => {
    const q = search.toLowerCase()
    const owner = u.homeowners.find(h => h.is_active)?.full_name ?? ''
    return u.unit_code.toLowerCase().includes(q) || owner.toLowerCase().includes(q)
  })

  const columns: ColumnDef<UnitWithHomeowner, unknown>[] = [
    { accessorKey: 'house_no', header: 'House No.' },
    {
      id: 'homeowner',
      header: 'Homeowner',
      cell: ({ row }) => row.original.homeowners.find(h => h.is_active)?.full_name ?? <span className="text-gray-400">—</span>,
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: ({ row }) => row.original.homeowners.find(h => h.is_active)?.contact_number ?? <span className="text-gray-400">—</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const unit = row.original
        const activeHomeowner = unit.homeowners.find(h => h.is_active) ?? null
        return (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => setDetailId(unit.id)}>
              <Eye className="h-3.5 w-3.5" /> View
            </Button>
            {canManage && (
              <>
                {activeHomeowner ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditHomeowner({ unit, homeowner: activeHomeowner })}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMovedOutTarget({ unit, homeowner: activeHomeowner })}>
                      <LogOut className="h-3.5 w-3.5" /> Moved Out
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setAssignUnitId(unit.id)}>
                    <Plus className="h-3.5 w-3.5" /> Assign
                  </Button>
                )}
              </>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Units & Homeowners</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data.length} units total</p>
        </div>
        {canManage && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Unit
          </Button>
        )}
      </div>

      <input
        type="search"
        placeholder="Search by house no. or homeowner name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        onRowClick={row => setDetailId(row.id)}
      />

      {addOpen && <AddUnitModal onClose={() => setAddOpen(false)} />}
      {detailId && <UnitDetailModal unitId={detailId} onClose={() => setDetailId(null)} />}
      {assignUnitId && <AssignHomeownerModal unitId={assignUnitId} onClose={() => setAssignUnitId(null)} />}
      {editHomeowner && (
        <EditHomeownerModal
          homeowner={editHomeowner.homeowner}
          onClose={() => setEditHomeowner(null)}
        />
      )}
      {movedOutTarget && (
        <MarkMovedOutModal
          unit={movedOutTarget.unit}
          homeowner={movedOutTarget.homeowner}
          onClose={() => setMovedOutTarget(null)}
        />
      )}
    </div>
  )
}
