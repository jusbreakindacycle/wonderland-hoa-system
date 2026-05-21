export type Role =
  | 'admin'
  | 'president'
  | 'vice_president'
  | 'treasurer'
  | 'secretary'
  | 'auditor'
  | 'pro'
  | 'board_member'
  | 'security'
  | 'resident'

export type DueStatus = 'unpaid' | 'partial' | 'paid' | 'waived' | 'void'
export type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer' | 'credit'
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved'
export type UnitStatus = 'occupied' | 'vacant'
export type CreditTransactionType =
  | 'credit_added'
  | 'credit_applied'
  | 'refund_requested'
  | 'refund_approved'
export type AnnouncementTarget = 'all' | 'block' | 'unit'

export type AllocationPreview = {
  unit_id: string
  payment_amount: number
  credit_available: number
  total_available: number
  allocations: {
    due_id: string
    billing_month: string
    due_date: string
    balance: number
    allocated: number
    will_be_paid: boolean
  }[]
  overpayment: number
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: Role | null
          position_label: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: Role | null
          position_label?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          full_name?: string | null
          role?: Role | null
          position_label?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      units: {
        Row: {
          id: string
          house_no: string
          unit_code: string
          status: UnitStatus
          created_at: string
        }
        Insert: {
          id?: string
          house_no: string
          status?: UnitStatus
          created_at?: string
        }
        Update: {
          house_no?: string
          status?: UnitStatus
        }
        Relationships: []
      }
      homeowners: {
        Row: {
          id: string
          unit_id: string
          profile_id: string | null
          full_name: string
          email: string | null
          contact_number: string | null
          move_in_date: string | null
          move_out_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          profile_id?: string | null
          full_name: string
          email?: string | null
          contact_number?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          unit_id?: string
          profile_id?: string | null
          full_name?: string
          email?: string | null
          contact_number?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'homeowners_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          }
        ]
      }
      system_config: {
        Row: {
          key: string
          value: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          value?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dues: {
        Row: {
          id: string
          unit_id: string
          billing_month: string
          amount: number
          due_date: string
          status: DueStatus
          amount_paid: number
          balance: number
          void_waive_reason: string | null
          voided_waived_by: string | null
          voided_waived_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          billing_month: string
          amount: number
          due_date: string
          status?: DueStatus
          amount_paid?: number
          void_waive_reason?: string | null
          voided_waived_by?: string | null
          voided_waived_at?: string | null
          created_at?: string
        }
        Update: {
          status?: DueStatus
          amount_paid?: number
          void_waive_reason?: string | null
          voided_waived_by?: string | null
          voided_waived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'dues_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          }
        ]
      }
      payments: {
        Row: {
          id: string
          unit_id: string
          amount: number
          payment_method: PaymentMethod | null
          reference_number: string | null
          payment_date: string
          received_by: string | null
          credit_used: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          amount: number
          payment_method?: PaymentMethod | null
          reference_number?: string | null
          payment_date?: string
          received_by?: string | null
          credit_used?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          payment_method?: PaymentMethod | null
          reference_number?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payments_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          }
        ]
      }
      payment_allocations: {
        Row: {
          id: string
          payment_id: string
          due_id: string
          amount_allocated: number
          created_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          due_id: string
          amount_allocated: number
          created_at?: string
        }
        Update: {
          amount_allocated?: number
        }
        Relationships: [
          {
            foreignKeyName: 'payment_allocations_payment_id_fkey'
            columns: ['payment_id']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_allocations_due_id_fkey'
            columns: ['due_id']
            isOneToOne: false
            referencedRelation: 'dues'
            referencedColumns: ['id']
          }
        ]
      }
      unit_credits: {
        Row: {
          id: string
          unit_id: string
          balance: number
          updated_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          balance?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'unit_credits_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: true
            referencedRelation: 'units'
            referencedColumns: ['id']
          }
        ]
      }
      credit_transactions: {
        Row: {
          id: string
          unit_id: string | null
          type: CreditTransactionType
          amount: number | null
          reference_payment_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          unit_id?: string | null
          type: CreditTransactionType
          amount?: number | null
          reference_payment_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          type?: CreditTransactionType
          amount?: number | null
          notes?: string | null
        }
        Relationships: []
      }
      complaints: {
        Row: {
          id: string
          unit_id: string | null
          submitted_by: string | null
          subject: string
          description: string
          status: ComplaintStatus
          assigned_to: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          unit_id?: string | null
          submitted_by?: string | null
          subject: string
          description: string
          status?: ComplaintStatus
          assigned_to?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          status?: ComplaintStatus
          assigned_to?: string | null
          resolved_at?: string | null
        }
        Relationships: []
      }
      visitors: {
        Row: {
          id: string
          unit_id: string | null
          visitor_name: string
          purpose: string | null
          time_in: string
          time_out: string | null
          logged_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          unit_id?: string | null
          visitor_name: string
          purpose?: string | null
          time_in?: string
          logged_by?: string | null
          created_at?: string
        }
        Update: {
          time_out?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          id: string
          title: string
          body: string
          target: AnnouncementTarget
          target_value: string | null
          posted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          target?: AnnouncementTarget
          target_value?: string | null
          posted_by?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          body?: string
          target?: AnnouncementTarget
          target_value?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_value: Record<string, unknown> | null
          new_value: Record<string, unknown> | null
          remarks: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_value?: Record<string, unknown> | null
          new_value?: Record<string, unknown> | null
          remarks?: string | null
          created_at?: string
        }
        Update: {
          remarks?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: string
      }
      has_any_role: {
        Args: { allowed_roles: string[] }
        Returns: boolean
      }
      process_payment: {
        Args: {
          p_unit_id: string
          p_amount: number
          p_method: string
          p_reference?: string | null
          p_received_by?: string | null
          p_notes?: string | null
        }
        Returns: string
      }
      void_or_waive_due: {
        Args: {
          p_due_id: string
          p_action: string
          p_reason: string
          p_actor_id: string
        }
        Returns: undefined
      }
      approve_credit_refund: {
        Args: {
          p_unit_id: string
          p_actor_id: string
          p_notes?: string | null
        }
        Returns: undefined
      }
      generate_monthly_dues: {
        Args: { p_billing_month?: string }
        Returns: Record<string, unknown>
      }
      preview_payment_allocation: {
        Args: { p_unit_id: string; p_amount: number }
        Returns: AllocationPreview
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
