import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Layout } from '@/components/layout/Layout'
import { LoginPage } from '@/components/auth/LoginPage'
import { UnitsPage } from '@/pages/units/UnitsPage'
import { DuesPage } from '@/pages/dues/DuesPage'
import { PaymentsPage } from '@/pages/payments/PaymentsPage'
import { ComplaintsPage } from '@/pages/complaints/ComplaintsPage'
import { VisitorsPage } from '@/pages/visitors/VisitorsPage'
import { AnnouncementsPage } from '@/pages/announcements/AnnouncementsPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { AuditLogPage } from '@/pages/audit/AuditLogPage'

function ProtectedApp() {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard"     element={<DashboardPage />} />
        <Route path="/units"         element={<UnitsPage />} />
        <Route path="/dues"          element={<DuesPage />} />
        <Route path="/payments"      element={<PaymentsPage />} />
        <Route path="/complaints"    element={<ComplaintsPage />} />
        <Route path="/visitors"      element={<VisitorsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/audit"         element={<AuditLogPage />} />
        <Route path="*"              element={<Navigate to="/units" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const { session, setSession, loadProfile, loading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadProfile()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadProfile()
    })

    return () => subscription.unsubscribe()
  }, [setSession, loadProfile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="*"
          element={session ? <ProtectedApp /> : <LoginPage />}
        />
      </Routes>
    </BrowserRouter>
  )
}
