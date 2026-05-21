import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Users, Plus, LogOut, CalendarDays } from 'lucide-react'
import { useVisitors, useLogVisitor, useLogVisitorOut, type VisitorRow } from '@/hooks/useVisitors'
import { useAuthStore } from '@/stores/authStore'
import { canManageVisitors } from '@/lib/auth'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

function todayString(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function LogVisitorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [visitorName, setVisitorName] = useState('')
  const [unitId, setUnitId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [nameError, setNameError] = useState('')
  const logVisitor = useLogVisitor()

  function handleClose() {
    setVisitorName('')
    setUnitId('')
    setPurpose('')
    setNameError('')
    onClose()
  }

  async function handleSubmit() {
    if (!visitorName.trim()) {
      setNameError('Visitor name is required')
      return
    }
    await logVisitor.mutateAsync({
      visitor_name: visitorName.trim(),
      ...(unitId.trim() ? { unit_id: unitId.trim() } : {}),
      ...(purpose.trim() ? { purpose: purpose.trim() } : {}),
    })
    handleClose()
  }

  return (
    <Modal
      open={open}
      title="Log Visitor"
      onClose={handleClose}
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" loading={logVisitor.isPending} onClick={handleSubmit}>Log In</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Visitor Name"
          value={visitorName}
          onChange={(e) => { setVisitorName(e.target.value); setNameError('') }}
          placeholder="Full name of visitor"
          error={nameError}
        />
        <Input
          label="Unit (optional)"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          placeholder="e.g. B1-L5"
        />
        <Input
          label="Purpose (optional)"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g. Delivery, Family visit"
        />
      </div>
    </Modal>
  )
}

export function VisitorsPage() {
  const { profile } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [search, setSearch] = useState('')
  const [logOpen, setLogOpen] = useState(false)
  const { data: visitors, isLoading } = useVisitors(selectedDate)
  const logVisitorOut = useLogVisitorOut()

  const canManage = canManageVisitors(profile?.role)

  const filtered = useMemo(() => {
    if (!visitors) return []
    if (!search.trim()) return visitors
    const q = search.trim().toLowerCase()
    return visitors.filter(
      (v) =>
        v.visitor_name.toLowerCase().includes(q) ||
        v.units?.unit_code.toLowerCase().includes(q) ||
        v.units?.house_no.toLowerCase().includes(q)
    )
  }, [visitors, search])

  const totalToday = visitors?.length ?? 0
  const currentlyInside = visitors?.filter((v) => !v.time_out).length ?? 0

  const columns: ColumnDef<VisitorRow, unknown>[] = [
    {
      id: 'unit',
      header: 'Unit',
      cell: ({ row }) => row.original.units?.unit_code ?? '—',
    },
    {
      id: 'visitor_name',
      header: 'Visitor Name',
      cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.visitor_name}</span>,
    },
    {
      id: 'purpose',
      header: 'Purpose',
      cell: ({ row }) => row.original.purpose ?? '—',
    },
    {
      id: 'time_in',
      header: 'Time In',
      cell: ({ row }) => new Date(row.original.time_in).toLocaleString('en-PH'),
    },
    {
      id: 'time_out',
      header: 'Time Out',
      cell: ({ row }) =>
        row.original.time_out
          ? new Date(row.original.time_out).toLocaleString('en-PH')
          : <Badge status="open" />,
    },
    {
      id: 'logged_by',
      header: 'Logged By',
      cell: ({ row }) => row.original.logged_by_profile?.full_name ?? '—',
    },
    ...(canManage
      ? [{
          id: 'action',
          header: '',
          cell: ({ row }: { row: { original: VisitorRow } }) =>
            !row.original.time_out ? (
              <Button
                variant="ghost"
                size="sm"
                loading={logVisitorOut.isPending}
                onClick={(e) => {
                  e.stopPropagation()
                  logVisitorOut.mutate(row.original.id)
                }}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Log Out
              </Button>
            ) : null,
        } as ColumnDef<VisitorRow, unknown>]
      : []),
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Visitor Log</h1>
            <p className="text-sm text-gray-500">Track visitor entries and exits</p>
          </div>
        </div>
        {canManage && (
          <Button variant="primary" onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Log Visitor
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Visitors Today</p>
          <p className="mt-1 text-3xl font-bold text-blue-700">{totalToday}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Currently Inside</p>
          <p className="mt-1 text-3xl font-bold text-green-700">{currentlyInside}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm focus:outline-none"
          />
        </div>
        <Input
          label=""
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by visitor, unit or block..."
        />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
      />

      <LogVisitorModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  )
}
