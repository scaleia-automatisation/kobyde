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
      agent_actions: {
        Row: {
          action_type: string
          agent_key: string | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          fingerprint: string
          id: string
          metadata: Json
          org_id: string
          result: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          agent_key?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          fingerprint: string
          id?: string
          metadata?: Json
          org_id: string
          result?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          agent_key?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          fingerprint?: string
          id?: string
          metadata?: Json
          org_id?: string
          result?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
          client_id: string | null
          created_at: string
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          id: string
          name: string
          org_id: string
          path: string | null
          payload: Json | null
          session_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          name: string
          org_id: string
          path?: string | null
          payload?: Json | null
          session_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          name?: string
          org_id?: string
          path?: string | null
          payload?: Json | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_pricing: {
        Row: {
          connector_key: string
          created_at: string
          currency: string
          effective_from: string
          id: string
          is_active: boolean
          model: string | null
          note: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          connector_key: string
          created_at?: string
          currency?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          model?: string | null
          note?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          connector_key?: string
          created_at?: string
          currency?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          model?: string | null
          note?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      api_usage_events: {
        Row: {
          action_type: string | null
          agent_key: string | null
          connector_key: string | null
          created_at: string
          credits: number
          duration_ms: number | null
          error: string | null
          estimated_cost_eur: number
          feature: string | null
          id: string
          model: string | null
          org_id: string | null
          quantity: number
          real_cost_eur: number | null
          status: string
          unit: string
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          agent_key?: string | null
          connector_key?: string | null
          created_at?: string
          credits?: number
          duration_ms?: number | null
          error?: string | null
          estimated_cost_eur?: number
          feature?: string | null
          id?: string
          model?: string | null
          org_id?: string | null
          quantity?: number
          real_cost_eur?: number | null
          status?: string
          unit?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          agent_key?: string | null
          connector_key?: string | null
          created_at?: string
          credits?: number
          duration_ms?: number | null
          error?: string | null
          estimated_cost_eur?: number
          feature?: string | null
          id?: string
          model?: string | null
          org_id?: string | null
          quantity?: number
          real_cost_eur?: number | null
          status?: string
          unit?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_events: {
        Row: {
          channel: string
          contact: string | null
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          occurred_at: string
          org_id: string
          payload: Json
          source: string
          title: string
        }
        Insert: {
          channel?: string
          contact?: string | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          org_id: string
          payload?: Json
          source?: string
          title: string
        }
        Update: {
          channel?: string
          contact?: string | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          org_id?: string
          payload?: Json
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_events_org_id_fkey"
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
      automation_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_run_at: string | null
          org_id: string
          rule_key: string
          runs_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          org_id: string
          rule_key: string
          runs_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          org_id?: string
          rule_key?: string
          runs_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string
          content: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          meta_description: string | null
          org_id: string | null
          published_at: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          org_id?: string | null
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          org_id?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_org_id_fkey"
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
          anonymized_at: string | null
          consent_at: string | null
          created_at: string
          created_by: string | null
          cv_path: string | null
          cv_text: string | null
          email: string | null
          extraction: Json
          first_name: string | null
          full_name: string
          id: string
          job_offer_id: string | null
          last_name: string | null
          letter_path: string | null
          letter_text: string | null
          location: string | null
          notes: string | null
          org_id: string
          phone: string | null
          position: string | null
          retention_until: string | null
          score: number
          scoring: Json
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          consent_at?: string | null
          created_at?: string
          created_by?: string | null
          cv_path?: string | null
          cv_text?: string | null
          email?: string | null
          extraction?: Json
          first_name?: string | null
          full_name: string
          id?: string
          job_offer_id?: string | null
          last_name?: string | null
          letter_path?: string | null
          letter_text?: string | null
          location?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          position?: string | null
          retention_until?: string | null
          score?: number
          scoring?: Json
          stage?: string
          status?: string
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          consent_at?: string | null
          created_at?: string
          created_by?: string | null
          cv_path?: string | null
          cv_text?: string | null
          email?: string | null
          extraction?: Json
          first_name?: string | null
          full_name?: string
          id?: string
          job_offer_id?: string | null
          last_name?: string | null
          letter_path?: string | null
          letter_text?: string | null
          location?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          position?: string | null
          retention_until?: string | null
          score?: number
          scoring?: Json
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_offer_id_fkey"
            columns: ["job_offer_id"]
            isOneToOne: false
            referencedRelation: "job_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          org_id: string
          token: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          org_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          org_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_requests: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          detail: string | null
          id: string
          kind: string
          org_id: string
          project_id: string | null
          responded_at: string | null
          response: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          kind?: string
          org_id: string
          project_id?: string | null
          responded_at?: string | null
          response?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          kind?: string
          org_id?: string
          project_id?: string | null
          responded_at?: string | null
          response?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      connector_call_logs: {
        Row: {
          account_id: string | null
          action: string | null
          agent_key: string | null
          cost_eur: number | null
          created_at: string
          credits: number | null
          duration_ms: number | null
          endpoint: string | null
          error: string | null
          id: string
          org_id: string | null
          provider: string
          status: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          action?: string | null
          agent_key?: string | null
          cost_eur?: number | null
          created_at?: string
          credits?: number | null
          duration_ms?: number | null
          endpoint?: string | null
          error?: string | null
          id?: string
          org_id?: string | null
          provider: string
          status?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          action?: string | null
          agent_key?: string | null
          cost_eur?: number | null
          created_at?: string
          credits?: number | null
          duration_ms?: number | null
          endpoint?: string | null
          error?: string | null
          id?: string
          org_id?: string | null
          provider?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      connector_executions: {
        Row: {
          action: string | null
          created_at: string
          id: string
          idempotency_key: string
          org_id: string | null
          provider: string | null
          result: Json | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          org_id?: string | null
          provider?: string | null
          result?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          org_id?: string | null
          provider?: string | null
          result?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      content_creations: {
        Row: {
          assets: Json
          captions: Json
          created_at: string
          created_by: string | null
          credits_used: number
          error: string | null
          id: string
          instructions: string
          kind: string
          model_key: string
          model_label: string
          objective: string
          org_id: string
          params: Json
          platforms: string[]
          product_ids: string[]
          slides: number
          status: string
          strategy: Json
          tone: string
          updated_at: string
        }
        Insert: {
          assets?: Json
          captions?: Json
          created_at?: string
          created_by?: string | null
          credits_used?: number
          error?: string | null
          id?: string
          instructions?: string
          kind: string
          model_key?: string
          model_label?: string
          objective?: string
          org_id: string
          params?: Json
          platforms?: string[]
          product_ids?: string[]
          slides?: number
          status?: string
          strategy?: Json
          tone?: string
          updated_at?: string
        }
        Update: {
          assets?: Json
          captions?: Json
          created_at?: string
          created_by?: string | null
          credits_used?: number
          error?: string | null
          id?: string
          instructions?: string
          kind?: string
          model_key?: string
          model_label?: string
          objective?: string
          org_id?: string
          params?: Json
          platforms?: string[]
          product_ids?: string[]
          slides?: number
          status?: string
          strategy?: Json
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_creations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_models: {
        Row: {
          created_at: string
          credits: number
          engine: string | null
          formats: string[]
          id: string
          is_active: boolean
          key: string
          kind: string
          label: string
          notes: string | null
          params: Json
          provider: string
          quality: string
          sort_order: number
          speed: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          engine?: string | null
          formats?: string[]
          id?: string
          is_active?: boolean
          key: string
          kind: string
          label: string
          notes?: string | null
          params?: Json
          provider: string
          quality?: string
          sort_order?: number
          speed?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          engine?: string | null
          formats?: string[]
          id?: string
          is_active?: boolean
          key?: string
          kind?: string
          label?: string
          notes?: string | null
          params?: Json
          provider?: string
          quality?: string
          sort_order?: number
          speed?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_publications: {
        Row: {
          account_label: string | null
          caption: string
          created_at: string
          created_by: string | null
          creation_id: string
          error: string | null
          external_id: string | null
          id: string
          org_id: string
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          caption?: string
          created_at?: string
          created_by?: string | null
          creation_id: string
          error?: string | null
          external_id?: string | null
          id?: string
          org_id: string
          platform: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          caption?: string
          created_at?: string
          created_by?: string | null
          creation_id?: string
          error?: string | null
          external_id?: string | null
          id?: string
          org_id?: string
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_publications_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "content_creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_publications_org_id_fkey"
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
      cost_budgets: {
        Row: {
          action_on_limit: string
          amount_eur: number
          connector_key: string | null
          created_at: string
          id: string
          is_active: boolean
          period: string
          scope: string
          scope_ref: string | null
          updated_at: string
        }
        Insert: {
          action_on_limit?: string
          amount_eur?: number
          connector_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          period?: string
          scope?: string
          scope_ref?: string | null
          updated_at?: string
        }
        Update: {
          action_on_limit?: string
          amount_eur?: number
          connector_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          period?: string
          scope?: string
          scope_ref?: string | null
          updated_at?: string
        }
        Relationships: []
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
          client_id: string | null
          created_at: string
          created_by: string | null
          file_url: string | null
          from_client: boolean
          id: string
          kind: string | null
          name: string
          org_id: string
          project_id: string | null
          size_kb: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          from_client?: boolean
          id?: string
          kind?: string | null
          name: string
          org_id: string
          project_id?: string | null
          size_kb?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          from_client?: boolean
          id?: string
          kind?: string | null
          name?: string
          org_id?: string
          project_id?: string | null
          size_kb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          agent_key: string
          audience: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          objective: string | null
          org_id: string
          status: string
          steps: Json
          updated_at: string
        }
        Insert: {
          agent_key?: string
          audience?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          objective?: string | null
          org_id: string
          status?: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          agent_key?: string
          audience?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          objective?: string | null
          org_id?: string
          status?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          agent_key: string | null
          analysis: Json
          body: string | null
          campaign_id: string | null
          category: string | null
          client_id: string | null
          created_at: string
          direction: string
          draft_body: string | null
          draft_subject: string | null
          from_email: string | null
          from_name: string | null
          id: string
          org_id: string
          priority: string
          prospect_id: string | null
          received_at: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          suggested_action: string | null
          summary: string | null
          to_email: string | null
          updated_at: string
        }
        Insert: {
          agent_key?: string | null
          analysis?: Json
          body?: string | null
          campaign_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          direction?: string
          draft_body?: string | null
          draft_subject?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          org_id: string
          priority?: string
          prospect_id?: string | null
          received_at?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          suggested_action?: string | null
          summary?: string | null
          to_email?: string | null
          updated_at?: string
        }
        Update: {
          agent_key?: string | null
          analysis?: Json
          body?: string | null
          campaign_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          direction?: string
          draft_body?: string | null
          draft_subject?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          org_id?: string
          priority?: string
          prospect_id?: string | null
          received_at?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          suggested_action?: string | null
          summary?: string | null
          to_email?: string | null
          updated_at?: string
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
            foreignKeyName: "emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          missions: string | null
          notes: string | null
          notify_email: boolean
          notify_sms: boolean
          notify_whatsapp: boolean
          org_id: string
          phone: string | null
          photo_url: string | null
          role_title: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          missions?: string | null
          notes?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          notify_whatsapp?: boolean
          org_id: string
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          missions?: string | null
          notes?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          notify_whatsapp?: boolean
          org_id?: string
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_audit_log: {
        Row: {
          action: string
          actor: string | null
          candidate_id: string | null
          created_at: string
          detail: string | null
          id: string
          org_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          candidate_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          org_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          candidate_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          org_id?: string
        }
        Relationships: []
      }
      hr_interview_invites: {
        Row: {
          candidate_id: string
          chosen_slot: string | null
          created_at: string
          id: string
          interview_id: string | null
          message: string | null
          org_id: string
          proposal: string | null
          responded_at: string | null
          slots: Json
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          chosen_slot?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          message?: string | null
          org_id: string
          proposal?: string | null
          responded_at?: string | null
          slots?: Json
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          chosen_slot?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          message?: string | null
          org_id?: string
          proposal?: string | null
          responded_at?: string | null
          slots?: Json
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_interview_invites_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_interview_invites_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "hr_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_interviews: {
        Row: {
          analysis: Json
          audio_path: string | null
          candidate_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          rating: number | null
          round: number
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          analysis?: Json
          audio_path?: string | null
          candidate_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          rating?: number | null
          round?: number
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          analysis?: Json
          audio_path?: string | null
          candidate_id?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          rating?: number | null
          round?: number
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_assets: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          kind: string
          org_id: string
          params: Json
          sources: Json
          summary: string | null
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          kind: string
          org_id: string
          params?: Json
          sources?: Json
          summary?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          kind?: string
          org_id?: string
          params?: Json
          sources?: Json
          summary?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intel_assets_org_id_fkey"
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
          content: string | null
          created_at: string
          due_date: string | null
          id: string
          installment_id: string | null
          items: Json
          label: string | null
          notes: string | null
          number: string
          org_id: string
          paid_at: string | null
          payment_id: string | null
          quote_id: string | null
          status: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          amount_ht?: number
          amount_ttc?: number
          client_id?: string | null
          content?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          installment_id?: string | null
          items?: Json
          label?: string | null
          notes?: string | null
          number: string
          org_id: string
          paid_at?: string | null
          payment_id?: string | null
          quote_id?: string | null
          status?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          amount_ht?: number
          amount_ttc?: number
          client_id?: string | null
          content?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          installment_id?: string | null
          items?: Json
          label?: string | null
          notes?: string | null
          number?: string
          org_id?: string
          paid_at?: string | null
          payment_id?: string | null
          quote_id?: string | null
          status?: string
          updated_at?: string
          vat_rate?: number
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
            foreignKeyName: "invoices_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "quote_installments"
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
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
          analysis: Json
          content: string | null
          contract: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          org_id: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          analysis?: Json
          content?: string | null
          contract?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          org_id: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          analysis?: Json
          content?: string | null
          contract?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          org_id?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
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
      marketing_assets: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          kind: string
          org_id: string
          params: Json
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          kind: string
          org_id: string
          params?: Json
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          kind?: string
          org_id?: string
          params?: Json
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          analysis: Json
          client_id: string | null
          created_at: string
          duration_min: number
          id: string
          notes: string | null
          org_id: string
          report: string | null
          source: string
          starts_at: string
          summary: string | null
          title: string
          transcript: string | null
        }
        Insert: {
          analysis?: Json
          client_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          org_id: string
          report?: string | null
          source?: string
          starts_at?: string
          summary?: string | null
          title: string
          transcript?: string | null
        }
        Update: {
          analysis?: Json
          client_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          org_id?: string
          report?: string | null
          source?: string
          starts_at?: string
          summary?: string | null
          title?: string
          transcript?: string | null
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
      oauth_connections: {
        Row: {
          access_token: string | null
          account_label: string | null
          connected_at: string | null
          connector_key: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_refresh_at: string | null
          last_used_at: string | null
          metadata: Json | null
          org_id: string | null
          provider: string
          provider_account_id: string | null
          provider_email: string | null
          provider_user_id: string
          refresh_token: string | null
          refresh_token_expires_at: string | null
          revoked: boolean
          revoked_at: string | null
          scopes: string | null
          scopes_granted: string | null
          scopes_requested: string | null
          status: string
          token_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          account_label?: string | null
          connected_at?: string | null
          connector_key?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_refresh_at?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          org_id?: string | null
          provider?: string
          provider_account_id?: string | null
          provider_email?: string | null
          provider_user_id: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          revoked?: boolean
          revoked_at?: string | null
          scopes?: string | null
          scopes_granted?: string | null
          scopes_requested?: string | null
          status?: string
          token_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          account_label?: string | null
          connected_at?: string | null
          connector_key?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_refresh_at?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          org_id?: string | null
          provider?: string
          provider_account_id?: string | null
          provider_email?: string | null
          provider_user_id?: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          revoked?: boolean
          revoked_at?: string | null
          scopes?: string | null
          scopes_granted?: string | null
          scopes_requested?: string | null
          status?: string
          token_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          connector_key: string
          created_at: string
          expires_at: string
          org_id: string | null
          redirect_to: string | null
          scopes: string | null
          state: string
          user_id: string
        }
        Insert: {
          connector_key: string
          created_at?: string
          expires_at?: string
          org_id?: string | null
          redirect_to?: string | null
          scopes?: string | null
          state: string
          user_id: string
        }
        Update: {
          connector_key?: string
          created_at?: string
          expires_at?: string
          org_id?: string | null
          redirect_to?: string | null
          scopes?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
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
          facebook_url: string | null
          google_business_url: string | null
          id: string
          ideal_client_location: string | null
          ideal_client_needs: string | null
          ideal_client_sector: string | null
          ideal_client_size: string | null
          ideal_client_type: string | null
          industry: string | null
          instagram_url: string | null
          integrations: Json
          is_suspended: boolean
          knowledge_base: string | null
          knowledge_json: Json | null
          knowledge_updated_at: string | null
          languages: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          opening_hours: Json
          phone: string | null
          phone_country_code: string | null
          plan: string
          plan_credits: number
          plan_price_eur: number
          plan_renews_at: string
          positioning: string | null
          pricing_text: string | null
          products_text: string | null
          services_text: string | null
          siren: string | null
          siret: string | null
          slug: string | null
          social_links: string | null
          suspended_at: string | null
          suspended_reason: string | null
          target_audience: string | null
          team_text: string | null
          telegram_country_code: string | null
          telegram_phone: string | null
          terms_text: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          values_text: string | null
          vat_number: string | null
          vat_rate: number
          vat_regime: string | null
          website: string | null
          whatsapp_country_code: string | null
          whatsapp_phone: string | null
          youtube_url: string | null
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
          facebook_url?: string | null
          google_business_url?: string | null
          id?: string
          ideal_client_location?: string | null
          ideal_client_needs?: string | null
          ideal_client_sector?: string | null
          ideal_client_size?: string | null
          ideal_client_type?: string | null
          industry?: string | null
          instagram_url?: string | null
          integrations?: Json
          is_suspended?: boolean
          knowledge_base?: string | null
          knowledge_json?: Json | null
          knowledge_updated_at?: string | null
          languages?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          opening_hours?: Json
          phone?: string | null
          phone_country_code?: string | null
          plan?: string
          plan_credits?: number
          plan_price_eur?: number
          plan_renews_at?: string
          positioning?: string | null
          pricing_text?: string | null
          products_text?: string | null
          services_text?: string | null
          siren?: string | null
          siret?: string | null
          slug?: string | null
          social_links?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          target_audience?: string | null
          team_text?: string | null
          telegram_country_code?: string | null
          telegram_phone?: string | null
          terms_text?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          values_text?: string | null
          vat_number?: string | null
          vat_rate?: number
          vat_regime?: string | null
          website?: string | null
          whatsapp_country_code?: string | null
          whatsapp_phone?: string | null
          youtube_url?: string | null
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
          facebook_url?: string | null
          google_business_url?: string | null
          id?: string
          ideal_client_location?: string | null
          ideal_client_needs?: string | null
          ideal_client_sector?: string | null
          ideal_client_size?: string | null
          ideal_client_type?: string | null
          industry?: string | null
          instagram_url?: string | null
          integrations?: Json
          is_suspended?: boolean
          knowledge_base?: string | null
          knowledge_json?: Json | null
          knowledge_updated_at?: string | null
          languages?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          opening_hours?: Json
          phone?: string | null
          phone_country_code?: string | null
          plan?: string
          plan_credits?: number
          plan_price_eur?: number
          plan_renews_at?: string
          positioning?: string | null
          pricing_text?: string | null
          products_text?: string | null
          services_text?: string | null
          siren?: string | null
          siret?: string | null
          slug?: string | null
          social_links?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          target_audience?: string | null
          team_text?: string | null
          telegram_country_code?: string | null
          telegram_phone?: string | null
          terms_text?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          values_text?: string | null
          vat_number?: string | null
          vat_rate?: number
          vat_regime?: string | null
          website?: string | null
          whatsapp_country_code?: string | null
          whatsapp_phone?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount_ht: number
          amount_ttc: number
          client_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number
          due_date: string | null
          id: string
          label: string
          message: string | null
          method: string
          org_id: string
          paid_at: string | null
          payment_url: string | null
          product_id: string | null
          quote_id: string | null
          status: string
          token: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          amount_ht?: number
          amount_ttc?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          label: string
          message?: string | null
          method?: string
          org_id: string
          paid_at?: string | null
          payment_url?: string | null
          product_id?: string | null
          quote_id?: string | null
          status?: string
          token?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          amount_ht?: number
          amount_ttc?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          label?: string
          message?: string | null
          method?: string
          org_id?: string
          paid_at?: string | null
          payment_url?: string | null
          product_id?: string | null
          quote_id?: string | null
          status?: string
          token?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
          payment_request_id: string | null
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
          payment_request_id?: string | null
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
          payment_request_id?: string | null
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
          {
            foreignKeyName: "payments_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          data: Json
          id: string
          org_id: string
          params: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          org_id: string
          params?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          org_id?: string
          params?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_connectors: {
        Row: {
          auth_type: string
          category: string
          config: Json
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          key: string
          last_error: string | null
          last_test_at: string | null
          name: string
          secrets: Json
          services: Json
          status: string
          updated_at: string
        }
        Insert: {
          auth_type?: string
          category?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          last_error?: string | null
          last_test_at?: string | null
          name: string
          secrets?: Json
          services?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          auth_type?: string
          category?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          last_error?: string | null
          last_test_at?: string | null
          name?: string
          secrets?: Json
          services?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          default_quantity: number
          description: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          org_id: string
          price: number
          price_ht: number
          sku: string | null
          subservices: Json
          terms: string | null
          unit: string | null
          updated_at: string
          vat_rate: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_quantity?: number
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          org_id: string
          price?: number
          price_ht?: number
          sku?: string | null
          subservices?: Json
          terms?: string | null
          unit?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          default_quantity?: number
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          org_id?: string
          price?: number
          price_ht?: number
          sku?: string | null
          subservices?: Json
          terms?: string | null
          unit?: string | null
          updated_at?: string
          vat_rate?: number
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
          description: string | null
          due_date: string | null
          id: string
          name: string
          org_id: string
          position: number
          project_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          org_id: string
          position?: number
          project_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
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
          completed_at: string | null
          created_at: string
          deliverables: string | null
          description: string | null
          end_date: string | null
          id: string
          manager: string | null
          name: string
          org_id: string
          payment_plan: string
          progress: number
          quote_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deliverables?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          manager?: string | null
          name: string
          org_id: string
          payment_plan?: string
          progress?: number
          quote_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deliverables?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          manager?: string | null
          name?: string
          org_id?: string
          payment_plan?: string
          progress?: number
          quote_id?: string | null
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
          {
            foreignKeyName: "projects_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_searches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          params: Json
          persona_id: string | null
          results_count: number
          status: string
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          params?: Json
          persona_id?: string | null
          results_count?: number
          status?: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          params?: Json
          persona_id?: string | null
          results_count?: number
          status?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_searches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_searches_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          acquisition_channel: string | null
          angle: string | null
          channel: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          facebook: string | null
          followup_step: string | null
          full_name: string
          id: string
          instagram: string | null
          linkedin: string | null
          notes: string | null
          org_id: string
          personalized_message: string | null
          phone: string | null
          qualification: string | null
          score: number
          search_id: string | null
          source: string | null
          source_url: string | null
          sources: Json
          status: string
          tiktok: string | null
          updated_at: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          acquisition_channel?: string | null
          angle?: string | null
          channel?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          followup_step?: string | null
          full_name: string
          id?: string
          instagram?: string | null
          linkedin?: string | null
          notes?: string | null
          org_id: string
          personalized_message?: string | null
          phone?: string | null
          qualification?: string | null
          score?: number
          search_id?: string | null
          source?: string | null
          source_url?: string | null
          sources?: Json
          status?: string
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          acquisition_channel?: string | null
          angle?: string | null
          channel?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          followup_step?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          linkedin?: string | null
          notes?: string | null
          org_id?: string
          personalized_message?: string | null
          phone?: string | null
          qualification?: string | null
          score?: number
          search_id?: string | null
          source?: string | null
          source_url?: string | null
          sources?: Json
          status?: string
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "prospect_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_followups: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          org_id: string
          quote_id: string
          scheduled_at: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          org_id: string
          quote_id: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          org_id?: string
          quote_id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_followups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_followups_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_installments: {
        Row: {
          amount_ttc: number
          created_at: string
          due_date: string | null
          id: string
          label: string
          org_id: string
          paid_at: string | null
          payment_request_id: string | null
          percentage: number
          position: number
          quote_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_ttc?: number
          created_at?: string
          due_date?: string | null
          id?: string
          label: string
          org_id: string
          paid_at?: string | null
          payment_request_id?: string | null
          percentage?: number
          position?: number
          quote_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_ttc?: number
          created_at?: string
          due_date?: string | null
          id?: string
          label?: string
          org_id?: string
          paid_at?: string | null
          payment_request_id?: string | null
          percentage?: number
          position?: number
          quote_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_installments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_installments_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_installments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
          position: number
          product_id: string | null
          quantity: number
          quote_id: string
          subservices: Json
          unit_price: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          org_id: string
          position?: number
          product_id?: string | null
          quantity?: number
          quote_id: string
          subservices?: Json
          unit_price?: number
          vat_rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          org_id?: string
          position?: number
          product_id?: string | null
          quantity?: number
          quote_id?: string
          subservices?: Json
          unit_price?: number
          vat_rate?: number
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
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      quote_versions: {
        Row: {
          author: string | null
          change: string
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          quote_id: string
          reason: string | null
          snapshot: Json
          version: number
        }
        Insert: {
          author?: string | null
          change: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          quote_id: string
          reason?: string | null
          snapshot?: Json
          version: number
        }
        Update: {
          author?: string | null
          change?: string
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          quote_id?: string
          reason?: string | null
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          analysis: Json
          client_comment: string | null
          client_id: string | null
          created_at: string
          discount_amount: number
          discount_type: string
          discount_value: number
          id: string
          last_event_at: string | null
          meeting_id: string | null
          notes: string | null
          number: string
          org_id: string
          payment_plan: string
          refused_at: string | null
          sent_at: string | null
          source: string
          status: string
          subtotal_ht: number
          title: string
          total_ht: number
          total_ttc: number
          updated_at: string
          valid_until: string | null
          validity_days: number
          vat_rate: number
          version: number
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          analysis?: Json
          client_comment?: string | null
          client_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          id?: string
          last_event_at?: string | null
          meeting_id?: string | null
          notes?: string | null
          number: string
          org_id: string
          payment_plan?: string
          refused_at?: string | null
          sent_at?: string | null
          source?: string
          status?: string
          subtotal_ht?: number
          title: string
          total_ht?: number
          total_ttc?: number
          updated_at?: string
          valid_until?: string | null
          validity_days?: number
          vat_rate?: number
          version?: number
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          analysis?: Json
          client_comment?: string | null
          client_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          id?: string
          last_event_at?: string | null
          meeting_id?: string | null
          notes?: string | null
          number?: string
          org_id?: string
          payment_plan?: string
          refused_at?: string | null
          sent_at?: string | null
          source?: string
          status?: string
          subtotal_ht?: number
          title?: string
          total_ht?: number
          total_ttc?: number
          updated_at?: string
          valid_until?: string | null
          validity_days?: number
          vat_rate?: number
          version?: number
          viewed_at?: string | null
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
            foreignKeyName: "quotes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
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
      reviews: {
        Row: {
          author: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          importance: string
          org_id: string
          page: string | null
          published_at: string | null
          rating: number | null
          replied_at: string | null
          reply_draft: string | null
          reply_status: string
          section: string | null
          sentiment: string
          source: string
          summary: string | null
          topic: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          author?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          importance?: string
          org_id: string
          page?: string | null
          published_at?: string | null
          rating?: number | null
          replied_at?: string | null
          reply_draft?: string | null
          reply_status?: string
          section?: string | null
          sentiment?: string
          source?: string
          summary?: string | null
          topic?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          author?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          importance?: string
          org_id?: string
          page?: string | null
          published_at?: string | null
          rating?: number | null
          replied_at?: string | null
          reply_draft?: string | null
          reply_status?: string
          section?: string | null
          sentiment?: string
          source?: string
          summary?: string | null
          topic?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          org_id: string
          plan: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          org_id: string
          plan?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          org_id?: string
          plan?: string
          price_id?: string | null
          product_id?: string | null
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
          assignee_name: string | null
          comments: Json
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          org_id: string
          priority: string
          project_id: string | null
          status: string
          step_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          assignee_name?: string | null
          comments?: Json
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          org_id: string
          priority?: string
          project_id?: string | null
          status?: string
          step_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          assignee_name?: string | null
          comments?: Json
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          org_id?: string
          priority?: string
          project_id?: string | null
          status?: string
          step_id?: string | null
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
          {
            foreignKeyName: "tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "project_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string | null
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id?: string | null
          payload?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string | null
          payload?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_topics: {
        Row: {
          active: boolean
          competitors: string | null
          created_at: string
          created_by: string | null
          frequency: string
          id: string
          kind: string
          last_asset_id: string | null
          last_run_at: string | null
          next_run_at: string | null
          org_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          competitors?: string | null
          created_at?: string
          created_by?: string | null
          frequency?: string
          id?: string
          kind?: string
          last_asset_id?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          org_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          competitors?: string | null
          created_at?: string
          created_by?: string | null
          frequency?: string
          id?: string
          kind?: string
          last_asset_id?: string | null
          last_run_at?: string | null
          next_run_at?: string | null
          org_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_topics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          facebook_url: string | null
          google_business_url: string | null
          id: string
          ideal_client_location: string | null
          ideal_client_needs: string | null
          ideal_client_sector: string | null
          ideal_client_size: string | null
          ideal_client_type: string | null
          industry: string | null
          instagram_url: string | null
          integrations: Json
          is_suspended: boolean
          knowledge_base: string | null
          knowledge_json: Json | null
          knowledge_updated_at: string | null
          languages: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          opening_hours: Json
          phone: string | null
          phone_country_code: string | null
          plan: string
          plan_credits: number
          plan_price_eur: number
          plan_renews_at: string
          positioning: string | null
          pricing_text: string | null
          products_text: string | null
          services_text: string | null
          siren: string | null
          siret: string | null
          slug: string | null
          social_links: string | null
          suspended_at: string | null
          suspended_reason: string | null
          target_audience: string | null
          team_text: string | null
          telegram_country_code: string | null
          telegram_phone: string | null
          terms_text: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          values_text: string | null
          vat_number: string | null
          vat_rate: number
          vat_regime: string | null
          website: string | null
          whatsapp_country_code: string | null
          whatsapp_phone: string | null
          youtube_url: string | null
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
          facebook_url: string | null
          google_business_url: string | null
          id: string
          ideal_client_location: string | null
          ideal_client_needs: string | null
          ideal_client_sector: string | null
          ideal_client_size: string | null
          ideal_client_type: string | null
          industry: string | null
          instagram_url: string | null
          integrations: Json
          is_suspended: boolean
          knowledge_base: string | null
          knowledge_json: Json | null
          knowledge_updated_at: string | null
          languages: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          opening_hours: Json
          phone: string | null
          phone_country_code: string | null
          plan: string
          plan_credits: number
          plan_price_eur: number
          plan_renews_at: string
          positioning: string | null
          pricing_text: string | null
          products_text: string | null
          services_text: string | null
          siren: string | null
          siret: string | null
          slug: string | null
          social_links: string | null
          suspended_at: string | null
          suspended_reason: string | null
          target_audience: string | null
          team_text: string | null
          telegram_country_code: string | null
          telegram_phone: string | null
          terms_text: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          values_text: string | null
          vat_number: string | null
          vat_rate: number
          vat_regime: string | null
          website: string | null
          whatsapp_country_code: string | null
          whatsapp_phone: string | null
          youtube_url: string | null
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
      is_platform_admin: { Args: never; Returns: boolean }
      purchase_credits: {
        Args: { _credits: number; _org: string }
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
          facebook_url: string | null
          google_business_url: string | null
          id: string
          ideal_client_location: string | null
          ideal_client_needs: string | null
          ideal_client_sector: string | null
          ideal_client_size: string | null
          ideal_client_type: string | null
          industry: string | null
          instagram_url: string | null
          integrations: Json
          is_suspended: boolean
          knowledge_base: string | null
          knowledge_json: Json | null
          knowledge_updated_at: string | null
          languages: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          opening_hours: Json
          phone: string | null
          phone_country_code: string | null
          plan: string
          plan_credits: number
          plan_price_eur: number
          plan_renews_at: string
          positioning: string | null
          pricing_text: string | null
          products_text: string | null
          services_text: string | null
          siren: string | null
          siret: string | null
          slug: string | null
          social_links: string | null
          suspended_at: string | null
          suspended_reason: string | null
          target_audience: string | null
          team_text: string | null
          telegram_country_code: string | null
          telegram_phone: string | null
          terms_text: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          values_text: string | null
          vat_number: string | null
          vat_rate: number
          vat_regime: string | null
          website: string | null
          whatsapp_country_code: string | null
          whatsapp_phone: string | null
          youtube_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
