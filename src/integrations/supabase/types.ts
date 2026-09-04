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
      alerts: {
        Row: {
          acknowledged: boolean
          body: string
          created_at: string
          id: string
          incident_id: string | null
          kind: string
          segment_id: string | null
          severity: string
          shipment_code: string | null
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged?: boolean
          body?: string
          created_at?: string
          id?: string
          incident_id?: string | null
          kind: string
          segment_id?: string | null
          severity?: string
          shipment_code?: string | null
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged?: boolean
          body?: string
          created_at?: string
          id?: string
          incident_id?: string | null
          kind?: string
          segment_id?: string | null
          severity?: string
          shipment_code?: string | null
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          affected_road: string
          clearance_hours: number
          code: string
          created_at: string
          id: string
          lat: number
          lng: number
          location: string
          note: string
          photo_url: string | null
          reported_at: string
          segment_id: string | null
          severity: string
          source: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          affected_road?: string
          clearance_hours?: number
          code?: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          location?: string
          note?: string
          photo_url?: string | null
          reported_at?: string
          segment_id?: string | null
          severity?: string
          source?: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          affected_road?: string
          clearance_hours?: number
          code?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          location?: string
          note?: string
          photo_url?: string | null
          reported_at?: string
          segment_id?: string | null
          severity?: string
          source?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "road_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      road_segments: {
        Row: {
          closed: boolean
          created_at: string
          flood_risk: number
          from_city: string
          highway: string
          id: string
          landslide_risk: number
          lane_width_m: number
          length_km: number
          max_vehicle_tonnes: number
          name: string
          path: Json
          rainfall_mm_24h: number
          road_condition: number
          terrain: string
          to_city: string
          updated_at: string
        }
        Insert: {
          closed?: boolean
          created_at?: string
          flood_risk: number
          from_city: string
          highway: string
          id: string
          landslide_risk: number
          lane_width_m: number
          length_km: number
          max_vehicle_tonnes: number
          name: string
          path: Json
          rainfall_mm_24h: number
          road_condition: number
          terrain: string
          to_city: string
          updated_at?: string
        }
        Update: {
          closed?: boolean
          created_at?: string
          flood_risk?: number
          from_city?: string
          highway?: string
          id?: string
          landslide_risk?: number
          lane_width_m?: number
          length_km?: number
          max_vehicle_tonnes?: number
          name?: string
          path?: Json
          rainfall_mm_24h?: number
          road_condition?: number
          terrain?: string
          to_city?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          cargo: string
          cargo_type: string
          code: string
          created_at: string
          delay_hours: number
          destination_id: string
          eta: string | null
          id: string
          operator: string
          origin_id: string
          priority: string
          risk_score: number
          route_name: string
          segment_ids: string[]
          status: string
          updated_at: string
          vehicle: string
          weight_tonnes: number
        }
        Insert: {
          cargo: string
          cargo_type?: string
          code: string
          created_at?: string
          delay_hours?: number
          destination_id: string
          eta?: string | null
          id?: string
          operator?: string
          origin_id: string
          priority?: string
          risk_score?: number
          route_name?: string
          segment_ids?: string[]
          status?: string
          updated_at?: string
          vehicle?: string
          weight_tonnes?: number
        }
        Update: {
          cargo?: string
          cargo_type?: string
          code?: string
          created_at?: string
          delay_hours?: number
          destination_id?: string
          eta?: string | null
          id?: string
          operator?: string
          origin_id?: string
          priority?: string
          risk_score?: number
          route_name?: string
          segment_ids?: string[]
          status?: string
          updated_at?: string
          vehicle?: string
          weight_tonnes?: number
        }
        Relationships: []
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
  public: {
    Enums: {},
  },
} as const
