import { NavLink } from 'react-router-dom'
import {
  Home, FileText, CreditCard, MessageSquare,
  Users, Megaphone, LayoutDashboard, LogOut, ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { canViewFinancials, canManageVisitors, canViewAuditLog } from '@/lib/auth'

const allNavItems = [
  { to: '/dashboard',    label: 'Dashboard',         icon: LayoutDashboard, financeOnly: true },
  { to: '/units',        label: 'Units & Homeowners', icon: Home },
  { to: '/dues',         label: 'Dues',               icon: FileText, financeOnly: true },
  { to: '/payments',     label: 'Payments',           icon: CreditCard, financeOnly: true },
  { to: '/complaints',   label: 'Complaints',         icon: MessageSquare },
  { to: '/visitors',     label: 'Visitors',           icon: Users, securityOnly: true },
  { to: '/announcements',label: 'Announcements',      icon: Megaphone },
  { to: '/audit',        label: 'Audit Log',          icon: ShieldCheck, auditOnly: true },
]

export function Sidebar() {
  const { profile, signOut } = useAuthStore()
  const role = profile?.role ?? null

  const navItems = allNavItems.filter(item => {
    if (item.financeOnly && !canViewFinancials(role)) return false
    if (item.securityOnly && !canManageVisitors(role)) return false
    if (item.auditOnly && !canViewAuditLog(role)) return false
    return true
  })

  return (
    <aside className="w-56 bg-gray-900 min-h-screen flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-gray-700">
        <p className="text-white font-bold text-sm leading-snug">Wonderland<br />Townhomes</p>
        <p className="text-gray-400 text-xs mt-0.5">HOA System</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-gray-300 text-sm font-medium truncate">{profile?.full_name}</p>
        <p className="text-gray-500 text-xs capitalize mt-0.5">
          {profile?.position_label || profile?.role?.replace('_', ' ')}
        </p>
        <button
          onClick={signOut}
          className="mt-3 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
