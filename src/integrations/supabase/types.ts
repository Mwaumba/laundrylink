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
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string | null
          cancelled_reason: string | null
          category_id: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          delivery_required: boolean | null
          estimated_price: number | null
          final_price: number | null
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          pickup_required: boolean | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          address?: string | null
          cancelled_reason?: string | null
          category_id?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_required?: boolean | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          pickup_required?: boolean | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          address?: string | null
          cancelled_reason?: string | null
          category_id?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_required?: boolean | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          pickup_required?: boolean | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      independent_providers: {
        Row: {
          availability: Database["public"]["Enums"]["provider_availability"]
          avatar_url: string | null
          base_lat: number | null
          base_lng: number | null
          bio: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          full_name: string
          id: string
          id_photo_url: string | null
          jobs_completed: number | null
          neighborhood: string | null
          neighborhood_slug: string | null
          phone: string
          rating: number | null
          review_count: number | null
          service_radius_km: number | null
          status: Database["public"]["Enums"]["provider_status"]
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          availability?: Database["public"]["Enums"]["provider_availability"]
          avatar_url?: string | null
          base_lat?: number | null
          base_lng?: number | null
          bio?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name: string
          id?: string
          id_photo_url?: string | null
          jobs_completed?: number | null
          neighborhood?: string | null
          neighborhood_slug?: string | null
          phone: string
          rating?: number | null
          review_count?: number | null
          service_radius_km?: number | null
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          availability?: Database["public"]["Enums"]["provider_availability"]
          avatar_url?: string | null
          base_lat?: number | null
          base_lng?: number | null
          bio?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name?: string
          id?: string
          id_photo_url?: string | null
          jobs_completed?: number | null
          neighborhood?: string | null
          neighborhood_slug?: string | null
          phone?: string
          rating?: number | null
          review_count?: number | null
          service_radius_km?: number | null
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
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
      job_request_offers: {
        Row: {
          created_at: string
          distance_km: number | null
          id: string
          job_request_id: string
          provider_id: string
          responded_at: string | null
          response: Database["public"]["Enums"]["job_offer_response"]
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          id?: string
          job_request_id: string
          provider_id: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["job_offer_response"]
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          id?: string
          job_request_id?: string
          provider_id?: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["job_offer_response"]
        }
        Relationships: [
          {
            foreignKeyName: "job_request_offers_job_request_id_fkey"
            columns: ["job_request_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_request_offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "independent_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requests: {
        Row: {
          address: string
          assigned_provider_id: string | null
          budget: number | null
          category_id: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          expires_at: string
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["job_request_status"]
          updated_at: string
        }
        Insert: {
          address: string
          assigned_provider_id?: string | null
          budget?: number | null
          category_id?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["job_request_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          assigned_provider_id?: string | null
          budget?: number | null
          category_id?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["job_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requests_assigned_provider_id_fkey"
            columns: ["assigned_provider_id"]
            isOneToOne: false
            referencedRelation: "independent_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
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
      provider_services: {
        Row: {
          base_price: number | null
          category_id: string
          created_at: string
          id: string
          price_unit: string | null
          provider_id: string
        }
        Insert: {
          base_price?: number | null
          category_id: string
          created_at?: string
          id?: string
          price_unit?: string | null
          provider_id: string
        }
        Update: {
          base_price?: number | null
          category_id?: string
          created_at?: string
          id?: string
          price_unit?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "independent_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          provider_id: string | null
          rating: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          provider_id?: string | null
          rating: number
          user_id: string
          vendor_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          provider_id?: string | null
          rating?: number
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "independent_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          message: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      vendor_services: {
        Row: {
          base_price: number | null
          category_id: string
          created_at: string
          id: string
          notes: string | null
          price_unit: string | null
          vendor_id: string
        }
        Insert: {
          base_price?: number | null
          category_id: string
          created_at?: string
          id?: string
          notes?: string | null
          price_unit?: string | null
          vendor_id: string
        }
        Update: {
          base_price?: number | null
          category_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          price_unit?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_job_offer: { Args: { _offer_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "provider"
      badge_type: "verified" | "trusted" | "top-rated" | "fast-response"
      booking_status:
        | "requested"
        | "accepted"
        | "pickup_scheduled"
        | "picked_up"
        | "in_progress"
        | "ready"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
      job_offer_response: "pending" | "accepted" | "rejected" | "expired"
      job_request_status:
        | "broadcasting"
        | "assigned"
        | "completed"
        | "cancelled"
        | "expired"
      onboarding_status: "draft" | "pending" | "approved" | "rejected"
      provider_availability: "online" | "busy" | "offline"
      provider_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "suspended"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
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
      app_role: ["admin", "moderator", "user", "provider"],
      badge_type: ["verified", "trusted", "top-rated", "fast-response"],
      booking_status: [
        "requested",
        "accepted",
        "pickup_scheduled",
        "picked_up",
        "in_progress",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
      ],
      job_offer_response: ["pending", "accepted", "rejected", "expired"],
      job_request_status: [
        "broadcasting",
        "assigned",
        "completed",
        "cancelled",
        "expired",
      ],
      onboarding_status: ["draft", "pending", "approved", "rejected"],
      provider_availability: ["online", "busy", "offline"],
      provider_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "suspended",
      ],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
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
