export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string | null
          daily_budget: number | null
          ended_at: string | null
          external_id: string
          id: string
          integration_id: string | null
          name: string
          objective: string | null
          platform: string
          started_at: string | null
          status: string | null
          total_budget: number | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string | null
          daily_budget?: number | null
          ended_at?: string | null
          external_id: string
          id?: string
          integration_id?: string | null
          name: string
          objective?: string | null
          platform: string
          started_at?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string | null
          daily_budget?: number | null
          ended_at?: string | null
          external_id?: string
          id?: string
          integration_id?: string | null
          name?: string
          objective?: string | null
          platform?: string
          started_at?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          plan: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          bucket_key: string
          id: number
          ts: string
        }
        Insert: {
          bucket_key: string
          id?: number
          ts?: string
        }
        Update: {
          bucket_key?: string
          id?: number
          ts?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          actions_executed: Json | null
          agency_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          lead_id: string | null
          rule_id: string | null
          status: string | null
          trigger_data: Json | null
        }
        Insert: {
          actions_executed?: Json | null
          agency_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          rule_id?: string | null
          status?: string | null
          trigger_data?: Json | null
        }
        Update: {
          actions_executed?: Json | null
          agency_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          rule_id?: string | null
          status?: string | null
          trigger_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json | null
          agency_id: string
          client_id: string | null
          conditions: Json | null
          created_at: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          agency_id: string
          client_id?: string | null
          conditions?: Json | null
          created_at?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          agency_id?: string
          client_id?: string | null
          conditions?: Json | null
          created_at?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          actual_duration_min: number | null
          agency_id: string
          agent_id: string | null
          calendar_event_id: string | null
          calendar_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          duration_min: number | null
          google_channel_id: string | null
          id: string
          lead_id: string | null
          meet_link: string | null
          notes: string | null
          outcome: string | null
          reminder_sent: boolean | null
          scheduled_at: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_duration_min?: number | null
          agency_id: string
          agent_id?: string | null
          calendar_event_id?: string | null
          calendar_id?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          duration_min?: number | null
          google_channel_id?: string | null
          id?: string
          lead_id?: string | null
          meet_link?: string | null
          notes?: string | null
          outcome?: string | null
          reminder_sent?: boolean | null
          scheduled_at: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_duration_min?: number | null
          agency_id?: string
          agent_id?: string | null
          calendar_event_id?: string | null
          calendar_id?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          duration_min?: number | null
          google_channel_id?: string | null
          id?: string
          lead_id?: string | null
          meet_link?: string | null
          notes?: string | null
          outcome?: string | null
          reminder_sent?: boolean | null
          scheduled_at?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          role: string | null
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          last_login?: string | null
          role?: string | null
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_id: string | null
          agency_id: string
          billing_email: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string | null
          health_score: number | null
          id: string
          logo_url: string | null
          monthly_lead_target: number | null
          mrr: number | null
          name: string
          niche: string
          primary_email: string | null
          primary_phone: string | null
          settings: Json | null
          slug: string
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          account_manager_id?: string | null
          agency_id: string
          billing_email?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          logo_url?: string | null
          monthly_lead_target?: number | null
          mrr?: number | null
          name: string
          niche?: string
          primary_email?: string | null
          primary_phone?: string | null
          settings?: Json | null
          slug: string
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          account_manager_id?: string | null
          agency_id?: string
          billing_email?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          logo_url?: string | null
          monthly_lead_target?: number | null
          mrr?: number | null
          name?: string
          niche?: string
          primary_email?: string | null
          primary_phone?: string | null
          settings?: Json | null
          slug?: string
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      form_answers: {
        Row: {
          agency_id: string
          answer: string | null
          field_id: string
          form_id: string
          id: string
          lead_id: string | null
          submitted_at: string | null
        }
        Insert: {
          agency_id: string
          answer?: string | null
          field_id: string
          form_id: string
          id?: string
          lead_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          agency_id?: string
          answer?: string | null
          field_id?: string
          form_id?: string
          id?: string
          lead_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_answers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_answers_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_answers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string | null
          description: string | null
          fields: Json | null
          id: string
          is_published: boolean | null
          name: string
          settings: Json | null
          slug: string
          submission_count: number | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          id?: string
          is_published?: boolean | null
          name: string
          settings?: Json | null
          slug: string
          submission_count?: number | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          id?: string
          is_published?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string
          submission_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          agency_id: string
          client_id: string | null
          created_at: string | null
          error_message: string | null
          external_account_id: string | null
          external_account_name: string | null
          id: string
          last_sync: string | null
          metadata: Json | null
          provider: string
          refresh_token: string | null
          status: string | null
          token_expiry: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          agency_id: string
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          last_sync?: string | null
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          status?: string | null
          token_expiry?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          agency_id?: string
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          last_sync?: string | null
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          status?: string | null
          token_expiry?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          agency_id: string
          content: string | null
          created_at: string | null
          direction: string | null
          id: string
          lead_id: string
          metadata: Json | null
          outcome: string | null
          subject: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          agency_id: string
          content?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          outcome?: string | null
          subject?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string
          content?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          outcome?: string | null
          subject?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agency_id: string
          agent_id: string | null
          campaign_id: string | null
          client_id: string
          company: string | null
          created_at: string | null
          deduplication_info: Json | null
          email: string | null
          email_normalized: string | null
          event_id: string | null
          first_contact_at: string | null
          full_name: string
          id: string
          last_contact_at: string | null
          lost_reason: string | null
          metadata: Json
          notes: string | null
          phone: string | null
          phone_normalized: string | null
          pipeline_stage_id: string | null
          provider: string | null
          raw_payload: Json | null
          referral_source: string | null
          schema_version: string
          score: number | null
          score_breakdown: Json | null
          score_error: boolean
          score_weights_version: string | null
          source: string
          source_platform: string | null
          source_type: string | null
          stage_entered_at: string | null
          status: string | null
          tags: string[] | null
          temperature: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          agency_id: string
          agent_id?: string | null
          campaign_id?: string | null
          client_id: string
          company?: string | null
          created_at?: string | null
          deduplication_info?: Json | null
          email?: string | null
          email_normalized?: string | null
          event_id?: string | null
          first_contact_at?: string | null
          full_name: string
          id?: string
          last_contact_at?: string | null
          lost_reason?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          pipeline_stage_id?: string | null
          provider?: string | null
          raw_payload?: Json | null
          referral_source?: string | null
          schema_version?: string
          score?: number | null
          score_breakdown?: Json | null
          score_error?: boolean
          score_weights_version?: string | null
          source?: string
          source_platform?: string | null
          source_type?: string | null
          stage_entered_at?: string | null
          status?: string | null
          tags?: string[] | null
          temperature?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          agency_id?: string
          agent_id?: string | null
          campaign_id?: string | null
          client_id?: string
          company?: string | null
          created_at?: string | null
          deduplication_info?: Json | null
          email?: string | null
          email_normalized?: string | null
          event_id?: string | null
          first_contact_at?: string | null
          full_name?: string
          id?: string
          last_contact_at?: string | null
          lost_reason?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          pipeline_stage_id?: string | null
          provider?: string | null
          raw_payload?: Json | null
          referral_source?: string | null
          schema_version?: string
          score?: number | null
          score_breakdown?: Json | null
          score_error?: boolean
          score_weights_version?: string | null
          source?: string
          source_platform?: string | null
          source_type?: string | null
          stage_entered_at?: string | null
          status?: string | null
          tags?: string[] | null
          temperature?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_configs: {
        Row: {
          agency_id: string
          client_id: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_configs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          agency_id: string
          automation_rules: Json | null
          color: string | null
          created_at: string | null
          id: string
          is_terminal: boolean | null
          is_won: boolean | null
          name: string
          pipeline_id: string | null
          position: number
          sla_hours: number | null
        }
        Insert: {
          agency_id: string
          automation_rules?: Json | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_terminal?: boolean | null
          is_won?: boolean | null
          name: string
          pipeline_id?: string | null
          position: number
          sla_hours?: number | null
        }
        Update: {
          agency_id?: string
          automation_rules?: Json | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_terminal?: boolean | null
          is_won?: boolean | null
          name?: string
          pipeline_id?: string | null
          position?: number
          sla_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      pixel_events: {
        Row: {
          agency_id: string
          client_id: string
          custom_data: Json | null
          error_message: string | null
          event_id: string | null
          event_name: string
          event_source_url: string | null
          id: string
          lead_id: string | null
          pixel_id: string
          platform_response: Json | null
          sent_at: string | null
          status: string | null
          user_data: Json | null
        }
        Insert: {
          agency_id: string
          client_id: string
          custom_data?: Json | null
          error_message?: string | null
          event_id?: string | null
          event_name: string
          event_source_url?: string | null
          id?: string
          lead_id?: string | null
          pixel_id: string
          platform_response?: Json | null
          sent_at?: string | null
          status?: string | null
          user_data?: Json | null
        }
        Update: {
          agency_id?: string
          client_id?: string
          custom_data?: Json | null
          error_message?: string | null
          event_id?: string | null
          event_name?: string
          event_source_url?: string | null
          id?: string
          lead_id?: string | null
          pixel_id?: string
          platform_response?: Json | null
          sent_at?: string | null
          status?: string | null
          user_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pixel_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_pixel_id_fkey"
            columns: ["pixel_id"]
            isOneToOne: false
            referencedRelation: "pixels"
            referencedColumns: ["id"]
          },
        ]
      }
      pixels: {
        Row: {
          access_token: string | null
          agency_id: string
          client_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          pixel_id: string
          platform: string
          test_event_code: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          agency_id: string
          client_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          pixel_id: string
          platform: string
          test_event_code?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          agency_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          pixel_id?: string
          platform?: string
          test_event_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pixels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_tokens: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          label: string | null
          last_used_at: string | null
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_tokens_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string | null
          file_url: string | null
          generated_at: string | null
          id: string
          period_end: string
          period_start: string
          sent_at: string | null
          status: string | null
          type: string
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string | null
          file_url?: string | null
          generated_at?: string | null
          id?: string
          period_end: string
          period_start: string
          sent_at?: string | null
          status?: string | null
          type: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string | null
          file_url?: string | null
          generated_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          sent_at?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_actions: {
        Row: {
          action_config: Json | null
          action_type: string
          agency_id: string
          attempts: number | null
          created_at: string | null
          executed_at: string | null
          id: string
          last_error: string | null
          lead_id: string | null
          rule_id: string | null
          scheduled_for: string
          status: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          agency_id: string
          attempts?: number | null
          created_at?: string | null
          executed_at?: string | null
          id?: string
          last_error?: string | null
          lead_id?: string | null
          rule_id?: string | null
          scheduled_for: string
          status?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          agency_id?: string
          attempts?: number | null
          created_at?: string | null
          executed_at?: string | null
          id?: string
          last_error?: string | null
          lead_id?: string | null
          rule_id?: string | null
          scheduled_for?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_actions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_actions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_metrics: {
        Row: {
          agency_id: string
          campaign_id: string | null
          clicks: number | null
          client_id: string
          conversions: number | null
          cpl: number | null
          created_at: string | null
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          integration_id: string | null
          leads: number | null
          platform: string
          platform_metrics: Json | null
          roas: number | null
          source_type: string
          spend: number | null
        }
        Insert: {
          agency_id: string
          campaign_id?: string | null
          clicks?: number | null
          client_id: string
          conversions?: number | null
          cpl?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          integration_id?: string | null
          leads?: number | null
          platform: string
          platform_metrics?: Json | null
          roas?: number | null
          source_type?: string
          spend?: number | null
        }
        Update: {
          agency_id?: string
          campaign_id?: string | null
          clicks?: number | null
          client_id?: string
          conversions?: number | null
          cpl?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          integration_id?: string | null
          leads?: number | null
          platform?: string
          platform_metrics?: Json | null
          roas?: number | null
          source_type?: string
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "traffic_metrics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_metrics_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          bootstrapped: boolean
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          role: string
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          bootstrapped?: boolean
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          last_login?: string | null
          role?: string
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          bootstrapped?: boolean
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_templates: {
        Row: {
          agency_id: string
          base_url: string
          client_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          platform: string | null
          updated_at: string | null
          use_count: number | null
          utm_campaign: string
          utm_content: string | null
          utm_medium: string
          utm_source: string
          utm_term: string | null
        }
        Insert: {
          agency_id: string
          base_url: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          platform?: string | null
          updated_at?: string | null
          use_count?: number | null
          utm_campaign: string
          utm_content?: string | null
          utm_medium: string
          utm_source: string
          utm_term?: string | null
        }
        Update: {
          agency_id?: string
          base_url?: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          platform?: string | null
          updated_at?: string | null
          use_count?: number | null
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_failures: {
        Row: {
          agency_id: string | null
          attempt_count: number
          client_id: string | null
          created_at: string
          error_detail: string | null
          id: string
          last_attempt_at: string
          provider: string
          raw_payload: Json
          reason: string
          received_at: string
          replayed_at: string | null
        }
        Insert: {
          agency_id?: string | null
          attempt_count?: number
          client_id?: string | null
          created_at?: string
          error_detail?: string | null
          id?: string
          last_attempt_at?: string
          provider: string
          raw_payload: Json
          reason: string
          received_at: string
          replayed_at?: string | null
        }
        Update: {
          agency_id?: string | null
          attempt_count?: number
          client_id?: string | null
          created_at?: string
          error_detail?: string | null
          id?: string
          last_attempt_at?: string
          provider?: string
          raw_payload?: Json
          reason?: string
          received_at?: string
          replayed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_failures_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_failures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_client_user_client_id: { Args: never; Returns: string }
      get_user_agency_id: { Args: never; Returns: string }
      is_agency_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
