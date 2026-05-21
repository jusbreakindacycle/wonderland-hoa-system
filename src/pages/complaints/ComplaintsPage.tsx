import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MessageSquare, Plus } from 'lucide-react'
import { useComplaints, useSubmitComplaint, useUpdateComplaint, type ComplaintRow } from '@/hooks/useComplaints'
import { useAuthStore } from '@/stores/authStore'
import { canManageComplaints } from '@/lib/auth'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
]

function SubmitComplaintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [unitId, setUnitId] = useState('')
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({})
  const submitComplaint = useSubmitComplaint()

  function handleClose() {
    setSubject('')
    setDescription('')
    setUnitId('')
    setErrors({})
    onClose()
  }

  async function handleSubmit() {
    const newErrors: { subject?: string; description?: string } = {}
    if (!subject.trim()) newErrors.subject = 'Subject is required'
    if (!description.trim()) newErrors.description = 'Description is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    await submitComplaint.mutateAsync({
      subject: subject.trim(),
      description: description.trim(),
      ...(unitId.trim() ? { unit_id: unitId.trim() } : {}),
    })
    handleClose()
  }

  return (
    <Modal
      open={open}
      title="Submit a Complaint"
      onClose={handleClose}
      width="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" loading={submitComplaint.isPending} onClick={handleSubmit}>Submit</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Unit (optional)"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          placeholder="e.g. B1-L5"
        />
        <Input
          label="Subject"
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: undefined })) }}
          placeholder="Brief description of the issue"
          error={errors.subject}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={4}
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: undefined })) }}
            placeholder="Provide full details of your complaint"
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
        </div>
      </div>
    </Modal>
  )
}

function ComplaintDetailModal({
  complaint,
  onClose,
  canManage,
}: {
  complaint: ComplaintRow | null
  onClose: () => void
  canManage: boolean
}) {
  const [status, setStatus] = useState<'open' | 'in_progress' | 'resolved'>(complaint?.status ?? 'open')
  const [assignedTo, setAssignedTo] = useState(complaint?.assigned_to_profile?.full_name ?? '')
  const updateComplaint = useUpdateComplaint()

  if (!complaint) return null

  async function handleSave() {
    if (!complaint) return
    await updateComplaint.mutateAsync({
      id: complaint.id,
      status,
      assigned_to: assignedTo.trim() || null,
    })
    onClose()
  }

  return (
    <Modal
      open={!!complaint}
      title="Complaint Details"
      onClose={onClose}
      width="lg"
      footer={
        canManage ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={updateComplaint.isPending} onClick={handleSave}>Save Changes</Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Unit</p>
            <p className="text-sm font-medium text-gray-900">{complaint.units?.unit_code ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted By</p>
            <p className="text-sm font-medium text-gray-900">{complaint.submitted_by_profile?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Date Filed</p>
            <p className="text-sm font-medium text-gray-900">{new Date(complaint.created_at).toLocaleDateString('en-PH')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current Status</p>
            <div className="mt-0.5"><Badge status={complaint.status} /></div>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Subject</p>
          <p className="text-sm font-semibold text-gray-900">{complaint.subject}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-md bg-gray-50 p-3">{complaint.description}</p>
        </div>

        {complaint.resolved_at && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Resolved At</p>
            <p className="text-sm text-gray-900">{new Date(complaint.resolved_at).toLocaleString('en-PH')}</p>
          </div>
        )}

        {canManage && (
          <div className="border-t pt-4 space-y-4">
            <Select
              label="Update Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'open' | 'in_progress' | 'resolved')}
            />
            <Input
              label="Assign To (name or ID)"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Officer name or user ID"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

export function ComplaintsPage() {
  const { profile } = useAuthStore()
  const { data: allComplaints, isLoading } = useComplaints()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [selected, setSelected] = useState<ComplaintRow | null>(null)

  const canManage = canManageComplaints(profile?.role)

  const complaints = canManage
    ? (allComplaints ?? [])
    : (allComplaints ?? []).filter(
        (c) => c.submitted_by_profile?.full_name === profile?.full_name
      )

  const columns: ColumnDef<ComplaintRow, unknown>[] = [
    {
      id: 'unit',
      header: 'Unit',
      cell: ({ row }) => row.original.units?.unit_code ?? '—',
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.subject}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge status={row.original.status} />,
    },
    {
      id: 'submitted_by',
      header: 'Submitted By',
      cell: ({ row }) => row.original.submitted_by_profile?.full_name ?? '—',
    },
    {
      id: 'assigned_to',
      header: 'Assigned To',
      cell: ({ row }) => row.original.assigned_to_profile?.full_name ?? '—',
    },
    {
      id: 'created_at',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString('en-PH'),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
            <p className="text-sm text-gray-500">
              {canManage ? 'Manage all submitted complaints' : 'View and submit your complaints'}
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setSubmitOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Submit Complaint
        </Button>
      </div>

      <DataTable
        data={complaints}
        columns={columns}
        loading={isLoading}
        onRowClick={(row) => setSelected(row as ComplaintRow)}
      />

      <SubmitComplaintModal open={submitOpen} onClose={() => setSubmitOpen(false)} />

      <ComplaintDetailModal
        complaint={selected}
        onClose={() => setSelected(null)}
        canManage={canManage}
      />
    </div>
  )
}
