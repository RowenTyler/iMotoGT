export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          profile_pic: string | null
          suburb: string | null
          city: string | null
          province: string | null
          login_method: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string
          last_name?: string
          phone?: string | null
          profile_pic?: string | null
          suburb?: string | null
          city?: string | null
          province?: string | null
          login_method?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          profile_pic?: string | null
          suburb?: string | null
          city?: string | null
          province?: string | null
          login_method?: string
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          user_id: string
          make: string
          model: string
          year: number
          price: number
          mileage: number
          transmission: string
          fuel: string
          engine_capacity: string | null
          body_type: string | null
          variant: string | null
          description: string | null
          city: string | null
          province: string | null
          images: string[]
          status: string
          views: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          make: string
          model: string
          year: number
          price: number
          mileage: number
          transmission: string
          fuel: string
          engine_capacity?: string | null
          body_type?: string | null
          variant?: string | null
          description?: string | null
          city?: string | null
          province?: string | null
          images?: string[]
          status?: string
          views?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          make?: string
          model?: string
          year?: number
          price?: number
          mileage?: number
          transmission?: string
          fuel?: string
          engine_capacity?: string | null
          body_type?: string | null
          variant?: string | null
          description?: string | null
          city?: string | null
          province?: string | null
          images?: string[]
          status?: string
          views?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      saved_vehicles: {
        Row: {
          id: string
          user_id: string
          vehicle_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vehicle_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vehicle_id?: string
          created_at?: string
        }
      }
      admin_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      admin_audit_log: {
        Row: {
          id: string
          user_id: string
          action: string
          target_table: string | null
          target_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          target_table?: string | null
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          target_table?: string | null
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      dealer_profiles: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          status: string
          logo_url: string | null
          banner_url: string | null
          website: string | null
          phone: string | null
          address: string | null
          city: string | null
          province: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string | null
          status?: string
          logo_url?: string | null
          banner_url?: string | null
          website?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          status?: string
          logo_url?: string | null
          banner_url?: string | null
          website?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          province?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      dealer_applications: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          status: string
          submitted_at: string
          reviewed_at: string | null
          rejected_reason: string | null
          metadata: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string | null
          status?: string
          submitted_at?: string
          reviewed_at?: string | null
          rejected_reason?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          status?: string
          submitted_at?: string
          reviewed_at?: string | null
          rejected_reason?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
      }
      dealer_employees: {
        Row: {
          id: string
          dealer_profile_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          dealer_profile_id: string
          user_id: string
          role: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          dealer_profile_id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      blogs: {
        Row: {
          id: string
          user_id: string
          title: string
          subtitle: string | null
          slug: string
          category: string | null
          status: string
          hero_image: string | null
          hero_video: string | null
          views: number | null
          reading_time: number | null
          published_at: string | null
          author_name: string | null
          author_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          subtitle?: string | null
          slug: string
          category?: string | null
          status?: string
          hero_image?: string | null
          hero_video?: string | null
          views?: number | null
          reading_time?: number | null
          published_at?: string | null
          author_name?: string | null
          author_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          subtitle?: string | null
          slug?: string
          category?: string | null
          status?: string
          hero_image?: string | null
          hero_video?: string | null
          views?: number | null
          reading_time?: number | null
          published_at?: string | null
          author_name?: string | null
          author_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      blog_blocks: {
        Row: {
          id: string
          blog_id: string
          position: number
          type: string
          text: string | null
          image_url: string | null
          video_url: string | null
          quote: string | null
          heading: string | null
          subheading: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          blog_id: string
          position: number
          type: string
          text?: string | null
          image_url?: string | null
          video_url?: string | null
          quote?: string | null
          heading?: string | null
          subheading?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          blog_id?: string
          position?: number
          type?: string
          text?: string | null
          image_url?: string | null
          video_url?: string | null
          quote?: string | null
          heading?: string | null
          subheading?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      saved_blogs: {
        Row: {
          id: string
          user_id: string
          blog_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          blog_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          blog_id?: string
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          title: string
          slug: string
          status: string
          review_type: string | null
          hero_image: string | null
          hero_video: string | null
          views: number | null
          vehicle_id: string | null
          summary: string | null
          author_name: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          slug: string
          status?: string
          review_type?: string | null
          hero_image?: string | null
          hero_video?: string | null
          views?: number | null
          vehicle_id?: string | null
          summary?: string | null
          author_name?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          slug?: string
          status?: string
          review_type?: string | null
          hero_image?: string | null
          hero_video?: string | null
          views?: number | null
          vehicle_id?: string | null
          summary?: string | null
          author_name?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          target_table: string | null
          target_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          target_table?: string | null
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          target_table?: string | null
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      content_moderation_queue: {
        Row: {
          id: string
          content_type: string
          content_id: string
          status: string
          review_notes: string | null
          metadata: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          content_type: string
          content_id: string
          status: string
          review_notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          content_type?: string
          content_id?: string
          status?: string
          review_notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
