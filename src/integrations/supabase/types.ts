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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_tasks: {
        Row: {
          agent_id: string | null
          created_at: string
          created_by: string | null
          credits_used: number
          detail: string | null
          due_at: string | null
          id: string
          org_id: string
          priority: string
          result: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          credits_used?: number
          detail?: string | null
          due_at?: string | null
          id?: string
          org_id: string
          priority?: string
          result?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          credits_used?: number
          detail?: string | null
          due_at?: string | null
          id?: string
          org_id?: string
          priority?: string
          result?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          color: string
          created_at: string
          credits_used: number
          description: string | null
          emoji: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          org_id: string
          role_title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          credits_used?: number
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          org_id: string
          role_title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          credits_used?: number
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          org_id?: string
          role_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          org_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          org_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience: string | null
          channel: string
          created_at: string
          id: string
          name: string
          open_rate: number
          org_id: string
          sent_count: number
          status: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          channel?: string
          created_at?: string
          id?: string
          name: string
          open_rate?: number
          org_id: string
          sent_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          channel?: string
          created_at?: string
          id?: string
          name?: string
          open_rate?: number
          org_id?: string
          sent_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          org_id: string
          position: string | null
          score: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          org_id: string
          position?: string | null
          score?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          org_id?: string
          position?: string | null
          score?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          org_id: string
          phone: string | null
          status: string
          total_revenue: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          org_id: string
          phone?: string | null
          status?: string
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          status?: string
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          created_at: string
          id: string
          last_analysis: Json | null
          name: string
          notes: string | null
          org_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_analysis?: Json | null
          name: string
          notes?: string | null
          org_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_analysis?: Json | null
          name?: string
          notes?: string | null
          org_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string | null
          created_at: string
          created_by: string | null
          id: string
          messages: Json
          org_id: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          messages?: Json
          org_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          messages?: Json
          org_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          action_key: string | null
          action_label: string | null
          agent_id: string | null
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          error: string | null
          id: string
          idempotency_key: string | null
          org_id: string
          reason: string | null
          result: string | null
          status: string
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          action_key?: string | null
          action_label?: string | null
          agent_id?: string | null
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          org_id: string
          reason?: string | null
          result?: string | null
          status?: string
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_key?: string | null
          action_label?: string | null
          agent_id?: string | null
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          org_id?: string
          reason?: string | null
          result?: string | null
          status?: string
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          kind: string | null
          name: string
          org_id: string
          size_kb: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          kind?: string | null
          name: string
          org_id: string
          size_kb?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          kind?: string | null
          name?: string
          org_id?: string
          size_kb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          body: string | null
          campaign_id: string | null
          created_at: string
          id: string
          org_id: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          org_id: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          org_id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_ht: number
          amount_ttc: number
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          number: string
          org_id: string
          paid_at: string | null
          quote_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_ht?: number
          amount_ttc?: number
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          number: string
          org_id: string
          paid_at?: string | null
          quote_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_ht?: number
          amount_ttc?: number
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          number?: string
          org_id?: string
          paid_at?: string | null
          quote_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          org_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          org_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          org_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          client_id: string | null
          created_at: string
          duration_min: number
          id: string
          notes: string | null
          org_id: string
          starts_at: string
          title: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          org_id: string
          starts_at?: string
          title: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          org_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          org_id: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          org_id: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          org_id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          expected_close: string | null
          id: string
          org_id: string
          probability: number
          prospect_id: string | null
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          expected_close?: string | null
          id?: string
          org_id: string
          probability?: number
          prospect_id?: string | null
          stage?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          expected_close?: string | null
          id?: string
          org_id?: string
          probability?: number
          prospect_id?: string | null
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          company_type: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credits: number
          credits_total: number
          currency: string
          description: string | null
          email: string | null
          id: string
          ideal_client_location: string | null
          ideal_client_needs: string | null
          ideal_client_sector: string | null
          ideal_client_size: string | null
          ideal_client_type: string | null
          industry: string | null
          integrations: Json
          languages: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          phone: string | null
          plan: string
          plan_credits: number
          plan_price_eur: number
          plan_renews_at: string
          positioning: string | null
          pricing_text: string | null
          products_text: string | null
          services_text: string | null
          siret: string | null
          slug: string | null
          social_links: string | null
          target_audience: string | null
          team_text: string | null
          terms_text: string | null
          updated_at: string
          values_text: string | null
          vat_rate: number
          vat_regime: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credits?: number
          credits_total?: number
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          ideal_client_location?: string | null
          ideal_client_needs?: string | null
          ideal_client_sector?: string | null
          ideal_client_size?: string | null
          ideal_client_type?: string | null
          industry?: string | null
          integrations?: Json
          languages?: string | null
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          plan_credits?: number
          plan_price_eur?: number
          plan_renews_at?: string
          positioning?: string | null
          pricing_text?: string | null
          products_text?: string | null
          services_text?: string | null
          siret?: string | null
          slug?: string | null
          social_links?: string | null
          target_audience?: string | null
          team_text?: string | null
          terms_text?: string | null
          updated_at?: string
          values_text?: string | null
          vat_rate?: number
          vat_regime?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credits?: number
          credits_total?: number
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          ideal_client_location?: string | null
          ideal_client_needs?: string | null
          ideal_client_sector?: string | null
          ideal_client_size?: string | null
          ideal_client_type?: string | null
          industry?: string | null
          integrations?: Json
          languages?: string | null
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          plan_credits?: number
          plan_price_eur?: number
          plan_renews_at?: string
          positioning?: string | null
          pricing_text?: string | null
          products_text?: string | null
          services_text?: string | null
          siret?: string | null
          slug?: string | null
          social_links?: string | null
          target_audience?: string | null
          team_text?: string | null
          terms_text?: string | null
          updated_at?: string
          values_text?: string | null
          vat_rate?: number
          vat_regime?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          method: string
          org_id: string
          paid_at: string | null
          status: string
          stripe_event_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          method?: string
          org_id: string
          paid_at?: string | null
          status?: string
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          method?: string
          org_id?: string
          paid_at?: string | null
          status?: string
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          org_id: string
          price: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          org_id: string
          price?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          org_id?: string
          price?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_org_id: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_org_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_org_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_org_id_fkey"
            columns: ["current_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_steps: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          position: number
          project_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          position?: number
          project_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          position?: number
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_steps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_steps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          org_id: string
          progress: number
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          org_id: string
          progress?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          org_id?: string
          progress?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          org_id: string
          phone: string | null
          score: number
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          org_id: string
          phone?: string | null
          score?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          score?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          id: string
          label: string
          org_id: string
          quantity: number
          quote_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          org_id: string
          quantity?: number
          quote_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          org_id?: string
          quantity?: number
          quote_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          number: string
          org_id: string
          status: string
          title: string
          total_ht: number
          total_ttc: number
          updated_at: string
          valid_until: string | null
          vat_rate: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          number: string
          org_id: string
          status?: string
          title: string
          total_ht?: number
          total_ttc?: number
          updated_at?: string
          valid_until?: string | null
          vat_rate?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          number?: string
          org_id?: string
          status?: string
          title?: string
          total_ht?: number
          total_ttc?: number
          updated_at?: string
          valid_until?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          org_id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          org_id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          created_at: string
          due_date: string | null
          id: string
          org_id: string
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          org_id: string
          priority?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          org_id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_monthly_renewal: {
        Args: { _org: string }
        Returns: {
          address: string | null
          city: string | null
          company_type: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credits: number
          credits_total: number
          currency: string
          description: string | null
          email: string | null
          id: string
          ideal_client_location: string | null
          ideal_client_needs: string | null
          ideal_client_sector: string | null
          ideal_client_size: string | null
          ideal_client_type: string | null
          industry: string | null
          integrations: Json
          languages: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          phone: string | null
          plan: string
          plan_credits: number
          plan_price_eur: number
          plan_renews_at: string
          positioning: string | null
          pricing_text: string | null
          products_text: string | null
          services_text: string | null
          siret: string | null
          slug: string | null
          social_links: string | null
          target_audience: string | null
          team_text: string | null
          terms_text: string | null
          updated_at: string
          values_text: string | null
          vat_rate: number
          vat_regime: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_plan: {
        Args: { _org: string; _plan: string }
        Returns: {
          address: string | null
          city: string | null
          company_type: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credits: number
          credits_total: number
          currency: string
          description: string | null
          email: string | null
          id: string
          ideal_client_location: string | null
          ideal_client_needs: string | null
          ideal_client_sector: string | null
          ideal_client_size: string | null
          ideal_client_type: string | null
          industry: string | null
          integrations: Json
          languages: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          phone: string | null
          plan: string
          plan_credits: number
          plan_price_eur: number
          plan_renews_at: string
          positioning: string | null
          pricing_text: string | null
          products_text: string | null
          services_text: string | null
          siret: string | null
          slug: string | null
          social_links: string | null
          target_audience: string | null
          team_text: string | null
          terms_text: string | null
          updated_at: string
          values_text: string | null
          vat_rate: number
          vat_regime: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_credits: {
        Args: { _result?: string; _task_id?: string; _tx: string }
        Returns: {
          action_key: string | null
          action_label: string | null
          agent_id: string | null
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          error: string | null
          id: string
          idempotency_key: string | null
          org_id: string
          reason: string | null
          result: string | null
          status: string
          task_id: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "credit_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_org_role: {
        Args: { _org: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      refund_credits: {
        Args: { _error?: string; _tx: string }
        Returns: {
          action_key: string | null
          action_label: string | null
          agent_id: string | null
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          error: string | null
          id: string
          idempotency_key: string | null
          org_id: string
          reason: string | null
          result: string | null
          status: string
          task_id: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "credit_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reserve_credits: {
        Args: {
          _action_key: string
          _action_label: string
          _agent_id?: string
          _credits: number
          _idempotency_key: string
          _org: string
          _task_id?: string
        }
        Returns: {
          action_key: string | null
          action_label: string | null
          agent_id: string | null
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          error: string | null
          id: string
          idempotency_key: string | null
          org_id: string
          reason: string | null
          result: string | null
          status: string
          task_id: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "credit_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member" | "viewer"
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
    Enums: {
      app_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
