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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      companies: {
        Row: {
          default_validity_days: number | null
          default_payment_terms: string | null
          default_reservations: string | null
          logo_svg_source: string | null
          logo_color: string | null
          logo_data_url: string | null
          address: string | null
          contact_name: string | null
          created_at: string
          cvr: string | null
          default_hourly_rate: number | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          default_validity_days?: number | null
          default_payment_terms?: string | null
          default_reservations?: string | null
          logo_svg_source?: string | null
          logo_color?: string | null
          logo_data_url?: string | null
          address?: string | null
          contact_name?: string | null
          created_at?: string
          cvr?: string | null
          default_hourly_rate?: number | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          default_validity_days?: number | null
          default_payment_terms?: string | null
          default_reservations?: string | null
          logo_svg_source?: string | null
          logo_color?: string | null
          logo_data_url?: string | null
          address?: string | null
          contact_name?: string | null
          created_at?: string
          cvr?: string | null
          default_hourly_rate?: number | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_materials: {
        Row: {
          description: string
          id: string
          name: string
          offer_id: string
          quantity: number
          total_price: number
          unit: string
          unit_price: number
        }
        Insert: {
          description: string
          id: string
          name: string
          offer_id: string
          quantity: number
          total_price: number
          unit: string
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          name?: string
          offer_id?: string
          quantity?: number
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "offer_materials_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_work_items: {
        Row: {
          description: string
          estimated_hours: number
          hourly_rate: number
          id: string
          offer_id: string
          total_price: number
          trade: string
        }
        Insert: {
          description: string
          estimated_hours: number
          hourly_rate: number
          id: string
          offer_id: string
          total_price: number
          trade: string
        }
        Update: {
          description?: string
          estimated_hours?: number
          hourly_rate?: number
          id?: string
          offer_id?: string
          total_price?: number
          trade?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_work_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          validity_days: number | null
          payment_terms: string | null
          reservations: string | null
          company_logo_data_url: string | null
          company_address: string | null
          company_contact_name: string
          company_cvr: string
          company_default_hourly_rate: number | null
          company_email: string
          company_name: string
          company_phone: string
          created_at: string | null
          customer_address: string
          customer_name: string
          finalized_at: string
          id: string
          offer_description: string | null
          offer_number: string | null
          pricing_labor: number
          pricing_materials: number
          pricing_subtotal: number
          pricing_total: number
          pricing_vat_amount: number
          pricing_vat_rate: number
          project_description: string
          project_id: string
          project_number: string
          project_title: string
          status: string
        }
        Insert: {
          validity_days?: number | null
          payment_terms?: string | null
          reservations?: string | null
          company_logo_data_url?: string | null
          company_address?: string | null
          company_contact_name: string
          company_cvr: string
          company_default_hourly_rate?: number | null
          company_email: string
          company_name: string
          company_phone: string
          created_at?: string | null
          customer_address: string
          customer_name: string
          finalized_at?: string
          id: string
          offer_description?: string | null
          offer_number?: string | null
          pricing_labor: number
          pricing_materials: number
          pricing_subtotal: number
          pricing_total: number
          pricing_vat_amount: number
          pricing_vat_rate: number
          project_description: string
          project_id: string
          project_number: string
          project_title: string
          status?: string
        }
        Update: {
          validity_days?: number | null
          payment_terms?: string | null
          reservations?: string | null
          company_logo_data_url?: string | null
          company_address?: string | null
          company_contact_name?: string
          company_cvr?: string
          company_default_hourly_rate?: number | null
          company_email?: string
          company_name?: string
          company_phone?: string
          created_at?: string | null
          customer_address?: string
          customer_name?: string
          finalized_at?: string
          id?: string
          offer_description?: string | null
          offer_number?: string | null
          pricing_labor?: number
          pricing_materials?: number
          pricing_subtotal?: number
          pricing_total?: number
          pricing_vat_amount?: number
          pricing_vat_rate?: number
          project_description?: string
          project_id?: string
          project_number?: string
          project_title?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string | null
          project_id: string
          quantity: number | null
          quantity_source: string | null
          status: string | null
          unit: string | null
          unit_price: number | null
          unit_source: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name?: string | null
          project_id: string
          quantity?: number | null
          quantity_source?: string | null
          status?: string | null
          unit?: string | null
          unit_price?: number | null
          unit_source?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          project_id?: string
          quantity?: number | null
          quantity_source?: string | null
          status?: string | null
          unit?: string | null
          unit_price?: number | null
          unit_source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          project_id: string | null
          role: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          role?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_work_items: {
        Row: {
          created_at: string
          description: string | null
          estimated_hours: number | null
          estimated_hours_source: string | null
          id: string
          project_id: string
          status: string | null
          trade: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          estimated_hours_source?: string | null
          id?: string
          project_id: string
          status?: string | null
          trade?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          estimated_hours_source?: string | null
          id?: string
          project_id?: string
          status?: string | null
          trade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          validity_days: number | null
          payment_terms: string | null
          reservations: string | null
          company_id: string
          created_at: string
          customer_address: string | null
          customer_address_source: string | null
          customer_name: string | null
          customer_name_source: string | null
          description: string | null
          description_source: string | null
          hourly_rate: number | null
          id: string
          offer_description: string | null
          offer_description_source: string | null
          project_number: string
          title: string | null
          title_source: string | null
          updated_at: string | null
        }
        Insert: {
          validity_days?: number | null
          payment_terms?: string | null
          reservations?: string | null
          company_id: string
          created_at?: string
          customer_address?: string | null
          customer_address_source?: string | null
          customer_name?: string | null
          customer_name_source?: string | null
          description?: string | null
          description_source?: string | null
          hourly_rate?: number | null
          id?: string
          offer_description?: string | null
          offer_description_source?: string | null
          project_number: string
          title?: string | null
          title_source?: string | null
          updated_at?: string | null
        }
        Update: {
          validity_days?: number | null
          payment_terms?: string | null
          reservations?: string | null
          company_id?: string
          created_at?: string
          customer_address?: string | null
          customer_address_source?: string | null
          customer_name?: string | null
          customer_name_source?: string | null
          description?: string | null
          description_source?: string | null
          hourly_rate?: number | null
          id?: string
          offer_description?: string | null
          offer_description_source?: string | null
          project_number?: string
          title?: string | null
          title_source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_app: { Args: Record<PropertyKey, never>; Returns: boolean }
      get_app_users: { Args: Record<PropertyKey, never>; Returns: Json }
      set_app_user_blocked: { Args: {p_user_id: string; p_blocked: boolean}; Returns: undefined }
      is_activity_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      record_activity: { Args: { p_action: string; p_success: boolean; p_duration_ms?: number; p_error_code?: string; p_project_id?: string; p_offer_id?: string; p_state?: string }; Returns: undefined }
      get_activity_events: { Args: Record<PropertyKey, never>; Returns: Json }
      ensure_current_company: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_project: {
        Args: { p_company_id: string }
        Returns: Database["public"]["Tables"]["projects"]["Row"]
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_offer: {
        Args: { p_project_id: string }
        Returns: Database["public"]["Tables"]["offers"]["Row"]
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_offer_status: {
        Args: { p_offer_id: string; p_expected_status: string; p_status: string }
        Returns: Database["public"]["Tables"]["offers"]["Row"]
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
