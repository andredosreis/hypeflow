// Auto-generated types from Supabase schema
// Run: npm run db:types to regenerate

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan: string
          settings: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['agencies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['agencies']['Insert']>
      }
      users: {
        Row: {
          id: string
          agency_id: string
          full_name: string
          email: string
          role: string
          avatar_url: string | null
          is_active: boolean
          last_login: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      clients: {
        Row: {
          id: string
          agency_id: string
          account_manager_id: string | null
          name: string
          slug: string
          niche: string
          logo_url: string | null
          website: string | null
          primary_email: string | null
          primary_phone: string | null
          billing_email: string | null
          mrr: number
          contract_start: string | null
          contract_end: string | null
          status: string
          health_score: number
          monthly_lead_target: number | null
          settings: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      leads: {
        Row: {
          id: string
          agency_id: string
          client_id: string
          agent_id: string | null
          pipeline_stage_id: string | null
          full_name: string
          email: string | null
          phone: string | null
          company: string | null
          source: string
          source_type: string
          campaign_id: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          referral_source: string | null
          status: string
          score: number
          temperature: 'cold' | 'warm' | 'hot'
          tags: string[]
          notes: string | null
          lost_reason: string | null
          stage_entered_at: string | null
          last_contact_at: string | null
          first_contact_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      calls: {
        Row: {
          id: string
          agency_id: string
          client_id: string
          lead_id: string | null
          agent_id: string | null
          scheduled_at: string
          duration_min: number
          meet_link: string | null
          calendar_event_id: string | null
          calendar_id: string | null
          google_channel_id: string | null
          status: string
          outcome: string | null
          notes: string | null
          actual_duration_min: number | null
          reminder_sent: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['calls']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['calls']['Insert']>
      }
      traffic_metrics: {
        Row: {
          id: string
          agency_id: string
          client_id: string
          integration_id: string | null
          campaign_id: string | null
          date: string
          platform: string
          source_type: string
          impressions: number
          clicks: number
          leads: number
          conversions: number
          spend: number
          ctr: number | null
          cpl: number | null
          roas: number | null
          platform_metrics: Record<string, unknown>
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['traffic_metrics']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['traffic_metrics']['Insert']>
      }
      integrations: {
        Row: {
          id: string
          agency_id: string
          client_id: string | null
          provider: string
          access_token: string | null
          refresh_token: string | null
          token_expiry: string | null
          external_account_id: string | null
          external_account_name: string | null
          status: string
          last_sync: string | null
          error_message: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['integrations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>
      }
      pipeline_stages: {
        Row: {
          id: string
          pipeline_id: string | null
          agency_id: string
          name: string
          position: number
          color: string | null
          sla_hours: number | null
          automation_rules: unknown[]
          is_terminal: boolean
          is_won: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pipeline_stages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pipeline_stages']['Insert']>
      }
      automation_rules: {
        Row: {
          id: string
          agency_id: string
          client_id: string | null
          name: string
          is_active: boolean
          trigger_type: string
          trigger_config: Record<string, unknown>
          conditions: unknown[]
          actions: unknown[]
          execution_count: number
          last_executed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['automation_rules']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['automation_rules']['Insert']>
      }
      automation_logs: {
        Row: {
          id: string
          rule_id: string | null
          agency_id: string
          lead_id: string | null
          trigger_data: Record<string, unknown>
          actions_executed: unknown[]
          status: string
          error_message: string | null
          executed_at: string
        }
        Insert: Omit<Database['public']['Tables']['automation_logs']['Row'], 'id' | 'executed_at'>
        Update: Partial<Database['public']['Tables']['automation_logs']['Insert']>
      }
      lead_interactions: {
        Row: {
          id: string
          lead_id: string
          agency_id: string
          user_id: string | null
          type: string
          direction: string | null
          subject: string | null
          content: string | null
          outcome: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['lead_interactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['lead_interactions']['Insert']>
      }
    }
    Functions: {
      get_user_agency_id: { Args: Record<never, never>; Returns: string }
      get_client_user_client_id: { Args: Record<never, never>; Returns: string }
      is_agency_admin: { Args: Record<never, never>; Returns: boolean }
    }
  }
}
