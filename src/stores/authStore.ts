import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/database.types'

interface Profile {
  id: string
  full_name: string | null
  role: Role | null
  position_label: string | null
  is_active: boolean
}

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean

  setSession: (session: Session | null) => void
  loadProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  reset: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null })
  },

  loadProfile: async () => {
    const { user } = get()
    if (!user) {
      set({ profile: null, loading: false })
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, position_label, is_active')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      set({ profile: null, loading: false })
      return
    }

    set({ profile: data as Profile, loading: false })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ loading: false })
      return { error }
    }
    set({ session: data.session, user: data.user })
    await get().loadProfile()
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, session: null, loading: false })
  },

  reset: () => {
    set({ user: null, profile: null, session: null, loading: false })
  },
}))
