import { useState } from 'react'
import { Megaphone, Plus, Globe, Building2, Home } from 'lucide-react'
import {
  useAnnouncements,
  useCreateAnnouncement,
  type AnnouncementRow,
} from '@/hooks/useAnnouncements'
import { useAuthStore } from '@/stores/authStore'
import { canPostAnnouncements } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Residents' },
  { value: 'unit', label: 'Specific Unit (House No.)' },
]

function TargetBadge({ target, target_value }: { target: AnnouncementRow['target']; target_value: string | null }) {
  if (target === 'all') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        <Globe className="h-3 w-3" />
        All Residents
      </span>
    )
  }
  if (target === 'block') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
        <Building2 className="h-3 w-3" />
        Block {target_value ?? '—'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Home className="h-3 w-3" />
      Unit {target_value ?? '—'}
    </span>
  )
}

function PostAnnouncementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<'all' | 'unit'>('all')
  const [targetValue, setTargetValue] = useState('')
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({})
  const createAnnouncement = useCreateAnnouncement()

  function handleClose() {
    setTitle('')
    setBody('')
    setTarget('all')
    setTargetValue('')
    setErrors({})
    onClose()
  }

  async function handleSubmit() {
    const newErrors: { title?: string; body?: string } = {}
    if (!title.trim()) newErrors.title = 'Title is required'
    if (!body.trim()) newErrors.body = 'Body is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    await createAnnouncement.mutateAsync({
      title: title.trim(),
      body: body.trim(),
      target,
      ...(target !== 'all' && targetValue.trim() ? { target_value: targetValue.trim() } : {}),
    })
    handleClose()
  }

  return (
    <Modal
      open={open}
      title="Post Announcement"
      onClose={handleClose}
      width="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" loading={createAnnouncement.isPending} onClick={handleSubmit}>
            Post
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })) }}
          placeholder="Announcement title"
          error={errors.title}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={5}
            value={body}
            onChange={(e) => { setBody(e.target.value); setErrors((p) => ({ ...p, body: undefined })) }}
            placeholder="Write your announcement here..."
          />
          {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body}</p>}
        </div>
        <Select
          label="Target Audience"
          options={TARGET_OPTIONS}
          value={target}
          onChange={(e) => {
            setTarget(e.target.value as 'all' | 'unit')
            setTargetValue('')
          }}
        />
        {target === 'unit' && (
          <Input
            label="House No."
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="e.g. 12, 12A, 14B"
          />
        )}
      </div>
    </Modal>
  )
}

export function AnnouncementsPage() {
  const { profile } = useAuthStore()
  const { data: announcements, isLoading } = useAnnouncements()
  const [postOpen, setPostOpen] = useState(false)
  const canPost = canPostAnnouncements(profile?.role)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
            <p className="text-sm text-gray-500">Community news and updates</p>
          </div>
        </div>
        {canPost && (
          <Button variant="primary" onClick={() => setPostOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Post Announcement
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!announcements || announcements.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Megaphone className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No announcements yet</p>
          <p className="text-sm text-gray-400 mt-1">Check back later for updates from the HOA board.</p>
        </div>
      )}

      <div className="space-y-4">
        {(announcements ?? []).map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))}
      </div>

      <PostAnnouncementModal open={postOpen} onClose={() => setPostOpen(false)} />
    </div>
  )
}

function AnnouncementCard({ announcement }: { announcement: AnnouncementRow }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-900 truncate">{announcement.title}</h2>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{announcement.body}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TargetBadge target={announcement.target} target_value={announcement.target_value} />
          {announcement.posted_by_profile?.full_name && (
            <span className="text-xs text-gray-500">
              Posted by{' '}
              <span className="font-medium text-gray-700">{announcement.posted_by_profile.full_name}</span>
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {new Date(announcement.created_at).toLocaleDateString('en-PH')}
        </span>
      </div>
    </div>
  )
}
