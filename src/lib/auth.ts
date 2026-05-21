import { supabase } from './supabase'
import type { Role } from './database.types'

export type { Role }

export async function getCurrentUser() {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return null

  return { ...user, profile }
}

export function hasRole(userRole: Role | null | undefined, allowed: Role[]): boolean {
  if (!userRole) return false
  return allowed.includes(userRole)
}

export function isAdminLevel(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president'])
}

export function isFinanceRole(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president', 'treasurer'])
}

export function canViewFinancials(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president', 'treasurer', 'auditor', 'board_member'])
}

export function canRecordPayments(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president', 'treasurer'])
}

export function canVoidOrWaive(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president'])
}

export function canManageHomeowners(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president', 'secretary'])
}

export function canManageComplaints(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president', 'secretary'])
}

export function canPostAnnouncements(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president', 'secretary', 'pro'])
}

export function canManageVisitors(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president', 'security'])
}

export function canViewFullDashboard(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president', 'treasurer', 'auditor', 'board_member'])
}

export function canViewAuditLog(role: Role | null | undefined): boolean {
  return hasRole(role, ['admin', 'president', 'vice_president', 'treasurer', 'auditor'])
}
