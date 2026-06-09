// types/index.ts

export type GameMode = "classic" | "quick" | "chaos"

export interface Room {
  id: string
  code: string
  host_id: string
  status: "waiting" | "setup" | "playing" | "finished"
  mode: GameMode
  max_players: number
  created_at: string
  current_turn_player_id: string | null
  winner_id: string | null
  called_numbers: number[]
}

export interface Player {
  id: string
  room_id: string
  username: string
  avatar_color: string
  is_ready: boolean
  is_host: boolean
  board: number[] | null // flat 25-element array (or 9 for quick, 49 for chaos)
  marked_cells: boolean[]
  bingo_letters: string[] // letters earned: B, I, N, G, O
  lines_completed: number
  is_spectator: boolean
  joined_at: string
}

export interface Move {
  id: string
  room_id: string
  player_id: string
  number_called: number
  called_at: string
}

export interface Message {
  id: string
  room_id: string
  player_id: string | null
  content: string
  type: "chat" | "system" | "event"
  created_at: string
  player?: Pick<Player, "username" | "avatar_color">
}

export interface GameState {
  room: Room | null
  players: Player[]
  currentPlayer: Player | null
  messages: Message[]
  moves: Move[]
}

// Grid sizes per mode
export const GRID_CONFIG: Record<GameMode, { size: number; total: number; lines: number }> = {
  classic: { size: 5, total: 25, lines: 5 },
  quick:   { size: 3, total: 9,  lines: 3 },
  chaos:   { size: 7, total: 49, lines: 7 },
}

export const BINGO_LETTERS = ["B", "I", "N", "G", "O"]

export const AVATAR_COLORS = [
  "#e11d48", // crimson
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#059669", // emerald
  "#d97706", // amber
  "#db2777", // pink
  "#2563eb", // blue
  "#65a30d", // lime
]
