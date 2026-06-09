// lib/game-logic.ts
import { GameMode, GRID_CONFIG, BINGO_LETTERS } from "@/types"

/** Generate a random room code (6 uppercase chars) */
export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/** Shuffle an array (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Generate a random board for a given mode */
export function generateRandomBoard(mode: GameMode): number[] {
  const { total } = GRID_CONFIG[mode]
  return shuffle(Array.from({ length: total }, (_, i) => i + 1))
}

/** Get all winning line indices for a grid size */
export function getWinningLines(size: number): number[][] {
  const lines: number[][] = []

  // Rows
  for (let r = 0; r < size; r++) {
    lines.push(Array.from({ length: size }, (_, c) => r * size + c))
  }
  // Columns
  for (let c = 0; c < size; c++) {
    lines.push(Array.from({ length: size }, (_, r) => r * size + c))
  }
  // Diagonals
  lines.push(Array.from({ length: size }, (_, i) => i * size + i))
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)))

  return lines
}

/** Count how many lines are completed given marked cells */
export function countCompletedLines(markedCells: boolean[], mode: GameMode): number {
  const { size } = GRID_CONFIG[mode]
  const lines = getWinningLines(size)
  return lines.filter((line) => line.every((idx) => markedCells[idx])).length
}

/** Determine which BINGO letters have been earned (classic 5x5 only gets letters) */
export function getBingoLetters(linesCompleted: number): string[] {
  return BINGO_LETTERS.slice(0, Math.min(linesCompleted, 5))
}

/** Check if a player has won (completed the required number of lines) */
export function hasWon(linesCompleted: number, mode: GameMode): boolean {
  const { lines } = GRID_CONFIG[mode]
  return linesCompleted >= lines
}

/** Mark cells on a board given called numbers */
export function computeMarkedCells(board: number[], calledNumbers: number[]): boolean[] {
  const called = new Set(calledNumbers)
  return board.map((n) => called.has(n))
}

/** Validate that a board has every number exactly once */
export function validateBoard(board: number[], mode: GameMode): boolean {
  const { total } = GRID_CONFIG[mode]
  if (board.length !== total) return false
  const set = new Set(board)
  if (set.size !== total) return false
  for (let i = 1; i <= total; i++) {
    if (!set.has(i)) return false
  }
  return true
}

/** Pick next player in turn order */
export function getNextPlayerId(players: { id: string }[], currentId: string): string {
  const idx = players.findIndex((p) => p.id === currentId)
  return players[(idx + 1) % players.length].id
}

/** Format a relative timestamp */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
