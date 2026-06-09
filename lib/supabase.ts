// lib/supabase.ts
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 20 },
  },
})

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          code: string
          host_id: string
          status: "waiting" | "setup" | "playing" | "finished"
          mode: "classic" | "quick" | "chaos"
          max_players: number
          created_at: string
          current_turn_player_id: string | null
          winner_id: string | null
          called_numbers: number[]
        }
      }
      players: {
        Row: {
          id: string
          room_id: string
          username: string
          avatar_color: string
          is_ready: boolean
          is_host: boolean
          board: number[] | null
          marked_cells: boolean[]
          bingo_letters: string[]
          lines_completed: number
          is_spectator: boolean
          joined_at: string
        }
      }
      moves: {
        Row: {
          id: string
          room_id: string
          player_id: string
          number_called: number
          called_at: string
        }
      }
      messages: {
        Row: {
          id: string
          room_id: string
          player_id: string | null
          content: string
          type: "chat" | "system" | "event"
          created_at: string
        }
      }
    }
  }
}
