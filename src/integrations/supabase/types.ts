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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      business_hours: {
        Row: {
          close_time: string
          day: string
          id: string
          is_closed: boolean | null
          open_time: string
          vendor_id: string
        }
        Insert: {
          close_time?: string
          day: string
          id?: string
          is_closed?: boolean | null
          open_time?: string
          vendor_id: string
        }
        Update: {
          close_time?: string
          day?: string
          id?: string
          is_closed?: boolean | null
          open_time?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          contact_method: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          message: string | null
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          contact_method: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message?: string | null
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          contact_method?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message?: string | null
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhoods: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lat: number
          lng: number
          name: string
          slug: string
          vendor_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          slug: string
          vendor_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          slug?: string
          vendor_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          rating: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          rating: number
          user_id: string
          vendor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          rating?: number
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_badges: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          label: string
          type: Database["public"]["Enums"]["badge_type"]
          vendor_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          label: string
          type: Database["public"]["Enums"]["badge_type"]
          vendor_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          label?: string
          type?: Database["public"]["Enums"]["badge_type"]
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_badges_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_profiles: {
        Row: {
          address: string | null
          availability:
            | Database["public"]["Enums"]["vendor_availability"]
            | null
          created_at: string
          description: string | null
          email: string | null
          favorites_count: number | null
          has_delivery: boolean | null
          has_pickup: boolean | null
          id: string
          images: string[] | null
          inquiries_count: number | null
          is_featured: boolean | null
          is_verified: boolean | null
          joined_date: string | null
          lat: number | null
          lng: number | null
          name: string
          neighborhood: string | null
          neighborhood_slug: string | null
          neighborhoods_served: string[] | null
          onboarding_step: number | null
          phone: string | null
          pickup_radius: number | null
          price_range: string | null
          profile_views: number | null
          rating: number | null
          response_minutes: number | null
          response_time: string | null
          review_count: number | null
          service_tags: string[] | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["onboarding_status"] | null
          type: Database["public"]["Enums"]["vendor_type"]
          type_label: string
          updated_at: string
          user_id: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          availability?:
            | Database["public"]["Enums"]["vendor_availability"]
            | null
          created_at?: string
          description?: string | null
          email?: string | null
          favorites_count?: number | null
          has_delivery?: boolean | null
          has_pickup?: boolean | null
          id?: string
          images?: string[] | null
          inquiries_count?: number | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          joined_date?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          neighborhood?: string | null
          neighborhood_slug?: string | null
          neighborhoods_served?: string[] | null
          onboarding_step?: number | null
          phone?: string | null
          pickup_radius?: number | null
          price_range?: string | null
          profile_views?: number | null
          rating?: number | null
          response_minutes?: number | null
          response_time?: string | null
          review_count?: number | null
          service_tags?: string[] | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["onboarding_status"] | null
          type?: Database["public"]["Enums"]["vendor_type"]
          type_label?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          availability?:
            | Database["public"]["Enums"]["vendor_availability"]
            | null
          created_at?: string
          description?: string | null
          email?: string | null
          favorites_count?: number | null
          has_delivery?: boolean | null
          has_pickup?: boolean | null
          id?: string
          images?: string[] | null
          inquiries_count?: number | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          joined_date?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          neighborhood?: string | null
          neighborhood_slug?: string | null
          neighborhoods_served?: string[] | null
          onboarding_step?: number | null
          phone?: string | null
          pickup_radius?: number | null
          price_range?: string | null
          profile_views?: number | null
          rating?: number | null
          response_minutes?: number | null
          response_time?: string | null
          review_count?: number | null
          service_tags?: string[] | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["onboarding_status"] | null
          type?: Database["public"]["Enums"]["vendor_type"]
          type_label?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      badge_type: "verified" | "trusted" | "top-rated" | "fast-response"
      onboarding_status: "draft" | "pending" | "approved" | "rejected"
      vendor_availability: "accepting" | "limited" | "fully-booked"
      vendor_type:
        | "laundry-shop"
        | "dry-cleaner"
        | "ironing-service"
        | "pickup-delivery"
        | "independent"
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
      app_role: ["admin", "moderator", "user"],
      badge_type: ["verified", "trusted", "top-rated", "fast-response"],
      onboarding_status: ["draft", "pending", "approved", "rejected"],
      vendor_availability: ["accepting", "limited", "fully-booked"],
      vendor_type: [
        "laundry-shop",
        "dry-cleaner",
        "ironing-service",
        "pickup-delivery",
        "independent",
      ],
    },
  },
} as const
