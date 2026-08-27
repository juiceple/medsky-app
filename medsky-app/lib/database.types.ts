// Generated from the medsky Supabase project's `public` schema
// (mcp__Supabase__generate_typescript_types, project htxlggyucplpjhiyymkt).
// Regenerate after any migration lands in medsky_homepage/supabase/migrations.
// Note: this only covers the `public` schema — the `crm`/`management`/`susi`/`jungsi`
// schemas used by medsky_homepage's staff consoles are not exposed here.

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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      class_reservations: {
        Row: {
          consultant_id: string | null
          created_at: string
          created_by: string | null
          deducted_round: number
          duration_minutes: number
          id: string
          lesson_date: string
          lesson_session_id: string | null
          lesson_time: string | null
          memo: string | null
          notion_page_id: string | null
          service: Database["public"]["Enums"]["class_service_enum"]
          status: string
          student_id: string | null
          student_name: string
          student_phone: string
          title: string | null
          updated_at: string
        }
        Insert: {
          consultant_id?: string | null
          created_at?: string
          created_by?: string | null
          deducted_round?: number
          duration_minutes?: number
          id?: string
          lesson_date: string
          lesson_session_id?: string | null
          lesson_time?: string | null
          memo?: string | null
          notion_page_id?: string | null
          service?: Database["public"]["Enums"]["class_service_enum"]
          status?: string
          student_id?: string | null
          student_name: string
          student_phone: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          consultant_id?: string | null
          created_at?: string
          created_by?: string | null
          deducted_round?: number
          duration_minutes?: number
          id?: string
          lesson_date?: string
          lesson_session_id?: string | null
          lesson_time?: string | null
          memo?: string | null
          notion_page_id?: string | null
          service?: Database["public"]["Enums"]["class_service_enum"]
          status?: string
          student_id?: string | null
          student_name?: string
          student_phone?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      columns: {
        Row: {
          cover_image: string
          created_at: string | null
          id: string
          title: string
          url: string
        }
        Insert: {
          cover_image: string
          created_at?: string | null
          id?: string
          title: string
          url: string
        }
        Update: {
          cover_image?: string
          created_at?: string | null
          id?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_name: string | null
          content: string
          created_at: string
          id: string
          page_slug: string
        }
        Insert: {
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          page_slug: string
        }
        Update: {
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          page_slug?: string
        }
        Relationships: []
      }
      consultant_quiz_questions: {
        Row: {
          answer_boolean: boolean | null
          answer_text: string | null
          correct_idx: number
          id: number
          options: Json
          question: string
          question_type: Database["public"]["Enums"]["quiz_question_type"]
          video_id: number | null
        }
        Insert: {
          answer_boolean?: boolean | null
          answer_text?: string | null
          correct_idx: number
          id?: number
          options: Json
          question: string
          question_type?: Database["public"]["Enums"]["quiz_question_type"]
          video_id?: number | null
        }
        Update: {
          answer_boolean?: boolean | null
          answer_text?: string | null
          correct_idx?: number
          id?: number
          options?: Json
          question?: string
          question_type?: Database["public"]["Enums"]["quiz_question_type"]
          video_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_quiz_questions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "consultant_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_training_results: {
        Row: {
          completed_at: string | null
          id: number
          passed: boolean | null
          score: number | null
          user_id: string | null
          video_id: number | null
          watched: boolean
        }
        Insert: {
          completed_at?: string | null
          id?: number
          passed?: boolean | null
          score?: number | null
          user_id?: string | null
          video_id?: number | null
          watched?: boolean
        }
        Update: {
          completed_at?: string | null
          id?: number
          passed?: boolean | null
          score?: number | null
          user_id?: string | null
          video_id?: number | null
          watched?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "consultant_training_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "consultant_training_results_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "consultant_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_video_services: {
        Row: {
          created_at: string
          service: "종합 생기부 관리" | "정시 원서 컨설팅" | "수시 원서 컨설팅"
          video_id: number
        }
        Insert: {
          created_at?: string
          service: "종합 생기부 관리" | "정시 원서 컨설팅" | "수시 원서 컨설팅"
          video_id: number
        }
        Update: {
          created_at?: string
          service?: "종합 생기부 관리" | "정시 원서 컨설팅" | "수시 원서 컨설팅"
          video_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultant_video_services_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "consultant_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_videos: {
        Row: {
          description: string | null
          id: number
          is_published: boolean
          order_index: number
          storage_path: string | null
          title: string
        }
        Insert: {
          description?: string | null
          id?: number
          is_published?: boolean
          order_index?: number
          storage_path?: string | null
          title: string
        }
        Update: {
          description?: string | null
          id?: number
          is_published?: boolean
          order_index?: number
          storage_path?: string | null
          title?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          memo: string | null
          plan_slug: string
          updated_at: string
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          memo?: string | null
          plan_slug: string
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          memo?: string | null
          plan_slug?: string
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      features: {
        Row: {
          characteristics: string | null
          college: string | null
          created_at: string | null
          department: string | null
          drive_link: string | null
          grade: string | null
          id: number
          keywords: string | null
          recommendation: string | null
          school_name: string | null
          student_id: string | null
          student_name: string | null
          subject_grade: string | null
          subject_name: string | null
          summary: string | null
        }
        Insert: {
          characteristics?: string | null
          college?: string | null
          created_at?: string | null
          department?: string | null
          drive_link?: string | null
          grade?: string | null
          id?: number
          keywords?: string | null
          recommendation?: string | null
          school_name?: string | null
          student_id?: string | null
          student_name?: string | null
          subject_grade?: string | null
          subject_name?: string | null
          summary?: string | null
        }
        Update: {
          characteristics?: string | null
          college?: string | null
          created_at?: string | null
          department?: string | null
          drive_link?: string | null
          grade?: string | null
          id?: number
          keywords?: string | null
          recommendation?: string | null
          school_name?: string | null
          student_id?: string | null
          student_name?: string | null
          subject_grade?: string | null
          subject_name?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_features_students"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          college: string | null
          content_type: string | null
          created_at: string | null
          department: string | null
          file_key: string
          file_size: number | null
          file_url: string | null
          grade: string | null
          id: number
          ocr_data: string | null
          original_file_name: string
          parsed_content: string | null
          parsed_subject_characteristics: string | null
          school_name: string | null
          student_id: string | null
          student_name: string | null
        }
        Insert: {
          college?: string | null
          content_type?: string | null
          created_at?: string | null
          department?: string | null
          file_key: string
          file_size?: number | null
          file_url?: string | null
          grade?: string | null
          id?: number
          ocr_data?: string | null
          original_file_name: string
          parsed_content?: string | null
          parsed_subject_characteristics?: string | null
          school_name?: string | null
          student_id?: string | null
          student_name?: string | null
        }
        Update: {
          college?: string | null
          content_type?: string | null
          created_at?: string | null
          department?: string | null
          file_key?: string
          file_size?: number | null
          file_url?: string | null
          grade?: string | null
          id?: number
          ocr_data?: string | null
          original_file_name?: string
          parsed_content?: string | null
          parsed_subject_characteristics?: string | null
          school_name?: string | null
          student_id?: string | null
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_files_students"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      header_config: {
        Row: {
          config_key: string
          config_value: number
          created_at: string | null
          description: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: number
          created_at?: string | null
          description?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: number
          created_at?: string | null
          description?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number | null
          campaign_id: string | null
          cancelled_at: string | null
          content_id: string | null
          coupon_code: string | null
          created_at: string | null
          device_type: string | null
          discount_amount: number
          funnel_session_id: string | null
          id: number
          influencer_id: string | null
          landing_path: string | null
          landing_url: string | null
          lead_id: string | null
          name: string | null
          order_id: string
          paid_at: string | null
          pay_method: string | null
          phone_number: string | null
          plan_id: string | null
          product: string | null
          raw_response: Json | null
          ref_code: string | null
          referrer_url: string | null
          status: string | null
          tid: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vbank_bank: string | null
          vbank_exp: string | null
          vbank_number: string | null
          visitor_id: string | null
        }
        Insert: {
          amount?: number | null
          campaign_id?: string | null
          cancelled_at?: string | null
          content_id?: string | null
          coupon_code?: string | null
          created_at?: string | null
          device_type?: string | null
          discount_amount?: number
          funnel_session_id?: string | null
          id?: number
          influencer_id?: string | null
          landing_path?: string | null
          landing_url?: string | null
          lead_id?: string | null
          name?: string | null
          order_id: string
          paid_at?: string | null
          pay_method?: string | null
          phone_number?: string | null
          plan_id?: string | null
          product?: string | null
          raw_response?: Json | null
          ref_code?: string | null
          referrer_url?: string | null
          status?: string | null
          tid?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vbank_bank?: string | null
          vbank_exp?: string | null
          vbank_number?: string | null
          visitor_id?: string | null
        }
        Update: {
          amount?: number | null
          campaign_id?: string | null
          cancelled_at?: string | null
          content_id?: string | null
          coupon_code?: string | null
          created_at?: string | null
          device_type?: string | null
          discount_amount?: number
          funnel_session_id?: string | null
          id?: number
          influencer_id?: string | null
          landing_path?: string | null
          landing_url?: string | null
          lead_id?: string | null
          name?: string | null
          order_id?: string
          paid_at?: string | null
          pay_method?: string | null
          phone_number?: string | null
          plan_id?: string | null
          product?: string | null
          raw_response?: Json | null
          ref_code?: string | null
          referrer_url?: string | null
          status?: string | null
          tid?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vbank_bank?: string | null
          vbank_exp?: string | null
          vbank_number?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string | null
          file_id: number | null
          file_url: string
          id: string
          status: string
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_id?: number | null
          file_url: string
          id?: string
          status?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_id?: number | null
          file_url?: string
          id?: string
          status?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_file"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          duration_months: number
          first_amount: number
          id: string
          is_active: boolean
          is_subscription: boolean
          name: string | null
          price_original: number | null
          product_type: string
          recurring_amount: number
          slug: string
          sort_order: number
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_months: number
          first_amount?: number
          id: string
          is_active?: boolean
          is_subscription?: boolean
          name?: string | null
          price_original?: number | null
          product_type?: string
          recurring_amount: number
          slug: string
          sort_order?: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_months?: number
          first_amount?: number
          id?: string
          is_active?: boolean
          is_subscription?: boolean
          name?: string | null
          price_original?: number | null
          product_type?: string
          recurring_amount?: number
          slug?: string
          sort_order?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string
          department: string | null
          name: string | null
          phone: string | null
          role: string | null
          school: string | null
          student_number: number | null
          updated_at: string
          user_id: string
          마케팅동의: boolean | null
          필수동의사항: Json | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          department?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          school?: string | null
          student_number?: number | null
          updated_at?: string
          user_id: string
          마케팅동의?: boolean | null
          필수동의사항?: Json | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          department?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          school?: string | null
          student_number?: number | null
          updated_at?: string
          user_id?: string
          마케팅동의?: boolean | null
          필수동의사항?: Json | null
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct: number
          created_at: string
          id: number
          is_active: boolean
          options: string[]
          order_index: number
          question: string
          updated_at: string
        }
        Insert: {
          correct: number
          created_at?: string
          id?: number
          is_active?: boolean
          options: string[]
          order_index: number
          question: string
          updated_at?: string
        }
        Update: {
          correct?: number
          created_at?: string
          id?: number
          is_active?: boolean
          options?: string[]
          order_index?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      reels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          title: string
          video_path: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          video_path: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          video_path?: string
        }
        Relationships: []
      }
      service_videos: {
        Row: {
          embed_url: string | null
          id: string
          is_active: boolean
          service: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          embed_url?: string | null
          id?: string
          is_active?: boolean
          service: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          embed_url?: string | null
          id?: string
          is_active?: boolean
          service?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          college: string | null
          department: string | null
          grade: string
          id: string
          management: boolean
          name: string
          school: string
          teacher_id: string | null
        }
        Insert: {
          college?: string | null
          department?: string | null
          grade: string
          id?: string
          management?: boolean
          name: string
          school: string
          teacher_id?: string | null
        }
        Update: {
          college?: string | null
          department?: string | null
          grade?: string
          id?: string
          management?: boolean
          name?: string
          school?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          bid: string
          created_at: string | null
          first_paid: boolean | null
          guest_name: string
          guest_phone: string | null
          id: string
          next_billing_at: string
          plan_id: string | null
          remaining_cycles: number
          start_at: string | null
          status: string | null
        }
        Insert: {
          bid: string
          created_at?: string | null
          first_paid?: boolean | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          next_billing_at: string
          plan_id?: string | null
          remaining_cycles: number
          start_at?: string | null
          status?: string | null
        }
        Update: {
          bid?: string
          created_at?: string | null
          first_paid?: boolean | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          next_billing_at?: string
          plan_id?: string | null
          remaining_cycles?: number
          start_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          granted_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          granted_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          granted_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      class_reservation_blocks_service: {
        Args: { p_service: Database["public"]["Enums"]["class_service_enum"] }
        Returns: boolean
      }
      class_reservation_occupies_slot: {
        Args: { p_status: string }
        Returns: boolean
      }
      class_reservation_slot: {
        Args: {
          p_duration_minutes: number
          p_lesson_date: string
          p_lesson_time: string
        }
        Returns: unknown
      }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "consultant" | "manager" | "admin"
      class_service_enum:
        | "종합 생기부 관리"
        | "수시 원서 컨설팅"
        | "정시 원서 컨설팅"
        | "시그니처 컨설팅"
        | "기타"
      lead_grade: "new" | "C" | "B" | "A"
      lead_role: "student" | "parent"
      lead_status:
        | "submitted"
        | "message_sent"
        | "message_failed"
        | "paid"
        | "consulting"
        | "closed"
        | "purchase_intent"
      message_channel: "kakao_friendtalk" | "sms" | "manual"
      payment_status: "ready" | "paid" | "cancelled" | "failed" | "refunded"
      quiz_question_type: "mcq" | "short" | "boolean"
      student_grade:
        | "middle1"
        | "high1"
        | "high2"
        | "high3"
        | "n_su"
        | "unknown"
        | "middle2"
        | "middle3"
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
      app_role: ["student", "consultant", "manager", "admin"],
      class_service_enum: [
        "종합 생기부 관리",
        "수시 원서 컨설팅",
        "정시 원서 컨설팅",
        "시그니처 컨설팅",
        "기타",
      ],
      lead_grade: ["new", "C", "B", "A"],
      lead_role: ["student", "parent"],
      lead_status: [
        "submitted",
        "message_sent",
        "message_failed",
        "paid",
        "consulting",
        "closed",
        "purchase_intent",
      ],
      message_channel: ["kakao_friendtalk", "sms", "manual"],
      payment_status: ["ready", "paid", "cancelled", "failed", "refunded"],
      quiz_question_type: ["mcq", "short", "boolean"],
      student_grade: [
        "middle1",
        "high1",
        "high2",
        "high3",
        "n_su",
        "unknown",
        "middle2",
        "middle3",
      ],
    },
  },
} as const
