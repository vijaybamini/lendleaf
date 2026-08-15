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
      books: {
        Row: {
          author: string | null
          cover_image: string | null
          created_at: string
          genre: string | null
          google_books_id: string | null
          id: string
          isbn: string | null
          owner_id: string
          status: string
          title: string
        }
        Insert: {
          author?: string | null
          cover_image?: string | null
          created_at?: string
          genre?: string | null
          google_books_id?: string | null
          id?: string
          isbn?: string | null
          owner_id: string
          status?: string
          title: string
        }
        Update: {
          author?: string | null
          cover_image?: string | null
          created_at?: string
          genre?: string | null
          google_books_id?: string | null
          id?: string
          isbn?: string | null
          owner_id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          book_id: string | null
          content: string
          created_at: string
          hashtags: string[]
          id: string
          image_url: string | null
          tagged_book_author: string | null
          tagged_book_title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          book_id?: string | null
          content: string
          created_at?: string
          hashtags?: string[]
          id?: string
          image_url?: string | null
          tagged_book_author?: string | null
          tagged_book_title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          book_id?: string | null
          content?: string
          created_at?: string
          hashtags?: string[]
          id?: string
          image_url?: string | null
          tagged_book_author?: string | null
          tagged_book_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          college: string | null
          created_at: string
          credits: number
          display_name: string | null
          favorite_genres: string[] | null
          id: string
          location_label: string | null
          location_lat: number | null
          location_lng: number | null
          preferred_pickup_locations: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          college?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          favorite_genres?: string[] | null
          id: string
          location_label?: string | null
          location_lat?: number | null
          location_lng?: number | null
          preferred_pickup_locations?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          college?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          favorite_genres?: string[] | null
          id?: string
          location_label?: string | null
          location_lat?: number | null
          location_lng?: number | null
          preferred_pickup_locations?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          book_id: string
          borrower_confirmed: boolean
          borrower_id: string
          borrower_returned: boolean
          created_at: string
          id: string
          lender_confirmed: boolean
          lender_id: string
          lender_returned: boolean
          status: Database["public"]["Enums"]["transaction_status"]
          updated_at: string
        }
        Insert: {
          book_id: string
          borrower_confirmed?: boolean
          borrower_id: string
          borrower_returned?: boolean
          created_at?: string
          id?: string
          lender_confirmed?: boolean
          lender_id: string
          lender_returned?: boolean
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Update: {
          book_id?: string
          borrower_confirmed?: boolean
          borrower_id?: string
          borrower_returned?: boolean
          created_at?: string
          id?: string
          lender_confirmed?: boolean
          lender_id?: string
          lender_returned?: boolean
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_borrow_request: {
        Args: { _transaction_id: string }
        Returns: undefined
      }
      confirm_handover: {
        Args: { _transaction_id: string }
        Returns: undefined
      }
      confirm_return: { Args: { _transaction_id: string }; Returns: undefined }
      get_my_location: {
        Args: never
        Returns: {
          location_label: string
          location_lat: number
          location_lng: number
        }[]
      }
      nearby_book_distances: {
        Args: { _lat: number; _lng: number }
        Returns: {
          book_id: string
          distance_km: number
        }[]
      }
      request_borrow: { Args: { _book_id: string }; Returns: string }
      respond_to_request: {
        Args: { _accept: boolean; _transaction_id: string }
        Returns: undefined
      }
    }
    Enums: {
      transaction_status:
        | "pending"
        | "accepted"
        | "active"
        | "completed"
        | "rejected"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      transaction_status: [
        "pending",
        "accepted",
        "active",
        "completed",
        "rejected",
      ],
    },
  },
} as const
