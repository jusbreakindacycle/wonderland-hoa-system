import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, TrendingUp, AlertTriangle, CreditCard,
  Wallet, MessageSquare, Users, Settings, RefreshCw,
} from 'lucide-react'
import { printDelinquencyReport } from '@/lib/printPDF'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { canViewFinancials, canManageComplaints, canManageVisitors, isAdminLevel } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

// ─── helpers ────────────────────────────────────────────────
const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
const ym = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
const today = () => new Date().toISOString().split('T')[0]
const todayStart = () => `${today()}T00:00:00`
const todayEnd   = () => `${today()}T23:59:59`
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-PH')
const daysOverdue = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

// ─── data hooks ─────────────────────────────────────────────
function useSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const m = ym()
      const [yr, mo] = m.split('-').map(Number)
      const nextMonth = mo === 12 ? `${yr+1}-01-01` : `${yr}-${String(mo+1).padStart(2,'0')}-01`

      const [pRes, oRes, dRes, cRes] = await Promise.all([
        supabase.from('payments').select('amount').gte('payment_date', `${m}-01`).lt('payment_date', nextMonth),
        supabase.from('dues').select('balance').in('status', ['unpaid','partial']),
        supabase.from('dues').select('unit_id').in('status', ['unpaid','partial']).lt('due_date', today()),
        supabase.from('unit_credits').select('balance'),
      ])
      if (pRes.error) throw pRes.error
      return {
        collected:   (pRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
        outstanding: (oRes.data ?? []).reduce((s, r) => s + (r.balance ?? 0), 0),
        delinquent:  new Set((dRes.data ?? []).map(r => r.unit_id)).size,
        credits:     (cRes.data ?? []).reduce((s, r) => s + (r.balance ?? 0), 0),
      }
    },
  })
}

function useRecentPayments() {
  return useQuery({
    queryKey: ['dashboard-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, payment_method, payment_date, units(unit_code)')
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as unknown as { id: string; amount: number; payment_method: string | null; payment_date: string; units: { unit_code: string } | null }[]
    },
  })
}

function useDelinquency() {
  return useQuery({
    queryKey: ['dashboard-delinquency'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dues')
        .select('id, unit_id, billing_month, balance, due_date, status, units(unit_code, homeowners(full_name, is_active))')
        .in('status', ['unpaid','partial'])
        .lt('due_date', today())
        .order('due_date', { ascending: true })
      if (error) throw error
      return data as unknown as { id: string; unit_id: string; billing_month: string; balance: number; due_date: string; status: 'unpaid' | 'partial'; units: { unit_code: string; homeowners: { full_name: string; is_active: boolean }[] } | null }[]
    },
  })
}

function useComplaintsSummary() {
  return useQuery({
    queryKey: ['dashboard-complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('id, subject, status, created_at, units(unit_code), submitted_by_profile:profiles!submitted_by(full_name)')
        .order('created_at', { ascending: true })
      if (error) throw error
      const rows = data as unknown as { id: string; subject: string; status: string; created_at: string; units: { unit_code: string } | null; submitted_by_profile: { full_name: string } | null }[]
      return {
        open:        rows.filter(r => r.status === 'open').length,
        in_progress: rows.filter(r => r.status === 'in_progress').length,
        resolved:    rows.filter(r => r.status === 'resolved').length,
        openList:    rows.filter(r => r.status === 'open').slice(0, 8),
      }
    },
  })
}

function useVisitorActivity() {
  return useQuery({
    queryKey: ['dashboard-visitors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitors')
        .select('id, visitor_name, time_in, time_out, units(unit_code)')
        .gte('time_in', todayStart())
        .lte('time_in', todayEnd())
        .order('time_in', { ascending: false })
      if (error) throw error
      const rows = data as unknown as { id: string; visitor_name: string; time_in: string; time_out: string | null; units: { unit_code: string } | null }[]
      return {
        todayCount: rows.length,
        inside:     rows.filter(r => !r.time_out),
        all:        rows,
      }
    },
  })
}

function useSystemConfig() {
  return useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
      if (error) throw error
      const cfg: Record<string, string> = {}
      ;(data ?? []).forEach(r => { if (r.key && r.value) cfg[r.key] = r.value })
      return cfg
    },
  })
}

// ─── sub-components ─────────────────────────────────────────
function SummaryCard({ title, value, icon, color, bg, border }: {
  title: string; value: string
  icon: React.ReactNode; color: string; bg: string; border: string
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wide ${color} opacity-70`}>{title}</p>
          <p className={`mt-2 text-2xl font-bold ${color} truncate`}>{value}</p>
        </div>
        <div className={`shrink-0 rounded-full p-2 ${bg} opacity-80`}>{icon}</div>
      </div>
    </div>
  )
}

function Section({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function SystemConfigPanel() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  const { data: cfg, isLoading } = useSystemConfig()
  const [editOpen, setEditOpen] = useState(false)
  const [newAmount, setNewAmount] = useState('')
  const [triggerOpen, setTriggerOpen] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async (amount: string) => {
      const { error } = await supabase
        .from('system_config')
        .update({ value: amount, updated_by: profile!.id })
        .eq('key', 'monthly_dues_amount')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-config'] })
      toast.success('Monthly dues amount updated.')
      setEditOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('generate_monthly_dues', {})
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['dashboard-delinquency'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
      toast.success('Monthly dues generated successfully.')
      setTriggerOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const currentAmount = cfg?.['monthly_dues_amount'] ?? '—'

  return (
    <>
      <Section title="System Config" subtitle="Admin only">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Monthly Dues Amount</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {isLoading ? '—' : `₱${Number(currentAmount).toLocaleString('en-PH')}`}
              </p>
            </div>
            <Button
              variant="secondary" size="sm"
              onClick={() => { setNewAmount(currentAmount); setEditOpen(true) }}
            >
              <Settings className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <div>
              <p className="text-xs text-amber-700 uppercase font-medium tracking-wide">Manual Dues Generation</p>
              <p className="text-sm text-amber-600 mt-0.5">Generate dues for the current billing month</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setTriggerOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> Run Now
            </Button>
          </div>
        </div>
      </Section>

      <Modal
        open={editOpen} title="Edit Monthly Dues Amount" onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(newAmount)}
              loading={saveMutation.isPending}
              disabled={!newAmount || isNaN(Number(newAmount))}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Monthly Dues Amount (₱)"
          type="number" min="0" step="1"
          value={newAmount}
          onChange={e => setNewAmount(e.target.value)}
          placeholder="e.g. 2000"
        />
      </Modal>

      <Modal
        open={triggerOpen} title="Generate Monthly Dues" onClose={() => setTriggerOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTriggerOpen(false)}>Cancel</Button>
            <Button onClick={() => triggerMutation.mutate()} loading={triggerMutation.isPending}>
              Confirm & Generate
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-700">
          <p>This will generate dues for <strong>all units</strong> for the current billing month.</p>
          <p className="text-gray-500">The operation is idempotent — running it again for the same month will not create duplicate records.</p>
          <p className="text-gray-500">Any existing unit credit balances will be auto-applied via FIFO.</p>
        </div>
      </Modal>
    </>
  )
}


// ─── main dashboard ──────────────────────────────────────────
function DashboardContent() {
  const { profile } = useAuthStore()
  const summary       = useSummary()
  const payments      = useRecentPayments()
  const delinquency   = useDelinquency()
  const complaints    = useComplaintsSummary()
  const visitors      = useVisitorActivity()

  const showComplaints = canManageComplaints(profile?.role)
  const showVisitors   = canManageVisitors(profile?.role)
  const showConfig     = isAdminLevel(profile?.role)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title="Collected This Month"
          value={summary.isLoading ? '…' : fmt(summary.data?.collected ?? 0)}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          color="text-green-700" bg="bg-green-50" border="border-green-200"
        />
        <SummaryCard
          title="Total Outstanding"
          value={summary.isLoading ? '…' : fmt(summary.data?.outstanding ?? 0)}
          icon={<Wallet className="h-5 w-5 text-red-600" />}
          color="text-red-700" bg="bg-red-50" border="border-red-200"
        />
        <SummaryCard
          title="Delinquent Units"
          value={summary.isLoading ? '…' : String(summary.data?.delinquent ?? 0)}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          color="text-amber-700" bg="bg-amber-50" border="border-amber-200"
        />
        <SummaryCard
          title="Active Credits"
          value={summary.isLoading ? '…' : fmt(summary.data?.credits ?? 0)}
          icon={<CreditCard className="h-5 w-5 text-blue-600" />}
          color="text-blue-700" bg="bg-blue-50" border="border-blue-200"
        />
      </div>

      {/* Row 2: Recent payments + Delinquency report */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Recent Payments" subtitle="Last 10 recorded">
          <div className="divide-y divide-gray-100">
            {payments.isLoading && (
              <div className="space-y-2 p-4">
                {Array.from({length:5}).map((_,i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
              </div>
            )}
            {!payments.isLoading && (payments.data ?? []).length === 0 && (
              <p className="p-5 text-center text-sm text-gray-400">No payments recorded yet.</p>
            )}
            {(payments.data ?? []).map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.units?.unit_code ?? '—'}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.payment_method ?? 'N/A'} · {fmtDate(p.payment_date)}</p>
                </div>
                <span className="text-sm font-semibold text-green-700">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Delinquency Report"
          subtitle="Overdue unpaid and partial dues"
          action={
            <Button variant="secondary" size="sm" onClick={() => printDelinquencyReport(delinquency.data ?? [])}>
              <FileText className="h-3.5 w-3.5" /> PDF
            </Button>
          }
        >
          <div className="overflow-auto max-h-80">
            {delinquency.isLoading && (
              <div className="space-y-2 p-4">
                {Array.from({length:4}).map((_,i) => <div key={i} className="h-7 bg-gray-100 rounded animate-pulse" />)}
              </div>
            )}
            {!delinquency.isLoading && (delinquency.data ?? []).length === 0 && (
              <p className="p-5 text-center text-sm text-gray-400">No delinquent accounts.</p>
            )}
            {(delinquency.data ?? []).length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                    {['Unit','Month','Balance','Days Over','Status'].map(h => (
                      <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(delinquency.data ?? []).map(d => (
                    <tr key={d.id} className={`hover:bg-gray-50 ${daysOverdue(d.due_date) >= 90 ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-2 font-medium">{d.units?.unit_code ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600">{d.billing_month}</td>
                      <td className="px-4 py-2 font-semibold text-red-700">{fmt(d.balance)}</td>
                      <td className={`px-4 py-2 font-medium ${daysOverdue(d.due_date) >= 90 ? 'text-red-600' : 'text-amber-600'}`}>
                        {daysOverdue(d.due_date)}d
                      </td>
                      <td className="px-4 py-2"><Badge status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>
      </div>

      {/* Row 3: Complaints + Visitors (role-gated) */}
      {(showComplaints || showVisitors) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {showComplaints && (
            <Section title="Complaints Overview" subtitle="Open issues requiring attention">
              <div className="p-5 space-y-4">
                {/* Status counts */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Open',        value: complaints.data?.open ?? 0,        color: 'text-red-600 bg-red-50 border-red-200' },
                    { label: 'In Progress', value: complaints.data?.in_progress ?? 0, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                    { label: 'Resolved',    value: complaints.data?.resolved ?? 0,    color: 'text-green-600 bg-green-50 border-green-200' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-lg border p-3 ${color}`}>
                      <p className="text-2xl font-bold">{complaints.isLoading ? '—' : value}</p>
                      <p className="text-xs font-medium mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Open complaints list */}
                {(complaints.data?.openList ?? []).length > 0 && (
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {(complaints.data?.openList ?? []).map(c => (
                      <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.subject}</p>
                          <p className="text-xs text-gray-400">
                            {c.units?.unit_code ?? 'No unit'} · {c.submitted_by_profile?.full_name ?? 'Unknown'} · {fmtDate(c.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!complaints.isLoading && (complaints.data?.openList ?? []).length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-2">No open complaints.</p>
                )}
              </div>
            </Section>
          )}

          {showVisitors && (
            <Section title="Visitor Activity" subtitle="Today's log">
              <div className="p-5 space-y-4">
                {/* Summary tiles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">
                      {visitors.isLoading ? '—' : visitors.data?.todayCount ?? 0}
                    </p>
                    <p className="text-xs font-medium text-blue-600 mt-0.5">Visitors Today</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">
                      {visitors.isLoading ? '—' : visitors.data?.inside.length ?? 0}
                    </p>
                    <p className="text-xs font-medium text-green-600 mt-0.5">Currently Inside</p>
                  </div>
                </div>

                {/* Currently inside list */}
                {(visitors.data?.inside ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Inside Now</p>
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                      {(visitors.data?.inside ?? []).map(v => (
                        <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                          <Users className="h-4 w-4 text-green-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{v.visitor_name}</p>
                            <p className="text-xs text-gray-400">
                              {v.units?.unit_code ?? 'Walk-in'} · In: {new Date(v.time_in).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded px-2 py-0.5">Inside</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!visitors.isLoading && (visitors.data?.inside ?? []).length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-2">No visitors currently inside.</p>
                )}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Row 4: System Config (admin only) */}
      {showConfig && <SystemConfigPanel />}
    </div>
  )
}

export function DashboardPage() {
  const { profile } = useAuthStore()

  if (!canViewFinancials(profile?.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
        <h2 className="text-lg font-bold text-gray-800">Access Denied</h2>
        <p className="text-sm text-gray-500 mt-1">You don't have permission to view the dashboard.</p>
      </div>
    )
  }

  return <DashboardContent />
}
