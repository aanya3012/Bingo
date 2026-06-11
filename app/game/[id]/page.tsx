"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { sounds } from "@/lib/sounds"
import {
  computeMarkedCells, countCompletedLines, getBingoLetters,
  hasWon, getNextPlayerId, validateBoard,
} from "@/lib/game-logic"
import { GRID_CONFIG } from "@/types"
import { Room, Player, Message, GameMode } from "@/types"
import { BingoBoard } from "@/components/game/bingo-board"
import { BoardSetup } from "@/components/game/board-setup"
import { FloatingChat } from "@/components/chat/floating-chat"
import { PlayerList } from "@/components/game/player-list"
import { BingoProgress } from "@/components/game/bingo-progress"
import { WinScreen } from "@/components/game/win-screen"
import { Volume2, VolumeX } from "lucide-react"

export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string

  // ─── FIX #3: Read localStorage once with useRef, not on every render ──────
  // This prevents the SSR null → hydration mismatch that triggers router.push("/")
  const myPlayerIdRef = useRef<string | null>(null)
  if (typeof window !== "undefined" && myPlayerIdRef.current === null) {
    myPlayerIdRef.current = localStorage.getItem("bingo_player_id")
  }
  const myPlayerId = myPlayerIdRef.current

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [muted, setMuted] = useState(false)
  const [winner, setWinner] = useState<Player | null>(null)

  // ─── FIX #1: Use refs for values the subscription closure needs ───────────
  // Storing room and players in refs means the realtime handler always reads
  // the latest value without the useEffect needing to re-subscribe when they change.
  const roomRef = useRef<Room | null>(null)
  const playersRef = useRef<Player[]>([])
  const prevCalledRef = useRef<number[]>([])

  // Keep refs in sync with state
  useEffect(() => { roomRef.current = room }, [room])
  useEffect(() => { playersRef.current = players }, [players])

  const loadData = useCallback(async () => {
    const [{ data: r, error: re }, { data: p, error: pe }, { data: m }] = await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).single(),
      supabase.from("players").select("*").eq("room_id", roomId).order("joined_at"),
      supabase.from("messages").select("*").eq("room_id", roomId).order("created_at").limit(100),
    ])

    if (re) console.error("[loadData] rooms error:", re)
    if (pe) console.error("[loadData] players error:", pe)

    if (r) {
      setRoom(r as Room)
      roomRef.current = r as Room
    }
    if (p) {
      setPlayers(p as Player[])
      playersRef.current = p as Player[]
      const me = p.find((pl: Player) => pl.id === myPlayerId)
      if (me) setMyPlayer(me as Player)
      const winnerPlayer = p.find((pl: Player) => pl.id === (r as Room)?.winner_id)
      if (winnerPlayer) setWinner(winnerPlayer as Player)
    }
    if (m) setMessages(m as Message[])
  }, [roomId, myPlayerId])

  useEffect(() => {
    if (!myPlayerId) {
      console.warn("[GamePage] No player ID in localStorage, redirecting")
      router.push("/")
      return
    }
    loadData()

    // ─── FIX #1: Remove `room` from dependency array ─────────────────────────
    // Previously `room` was in the dep array, so the channel was torn down and
    // recreated on every single room update (every number called). This caused:
    //   1. A subscription gap during which realtime events were lost
    //   2. After ~3 games the Supabase client hit its channel limit silently
    //   3. The new subscription's closure captured stale state
    //
    // Solution: subscribe once, read fresh values via refs inside handlers.
    const channel = supabase
      .channel(`game:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as Room
          console.debug("[realtime] room update:", updated.status, "called:", updated.called_numbers.length)

          setRoom(updated)
          roomRef.current = updated

          const prev = prevCalledRef.current
          const newNumbers = updated.called_numbers.filter(n => !prev.includes(n))
          if (newNumbers.length > 0) sounds.numberCalled()
          prevCalledRef.current = updated.called_numbers
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as Player
          console.debug("[realtime] player update:", updated.id, "lines:", updated.lines_completed)

          setPlayers(prev => {
            const next = prev.map(p => p.id === updated.id ? updated : p)
            playersRef.current = next
            return next
          })

          if (updated.id === myPlayerId) setMyPlayer(updated)

          // Use roomRef.current here — NOT the `room` state variable,
          // which would be stale inside this closure
          const currentRoom = roomRef.current
          if (updated.lines_completed > 0 && currentRoom) {
            if (hasWon(updated.lines_completed, currentRoom.mode as GameMode)) {
              setWinner(updated)
              sounds.victory()
            } else {
              sounds.lineCompleted()
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe((status) => {
        console.debug("[realtime] channel status:", status)
        if (status === "CHANNEL_ERROR") {
          console.error("[realtime] channel error — will attempt reload")
        }
      })

    return () => {
      console.debug("[realtime] removing channel")
      supabase.removeChannel(channel)
    }
    // ─── NOTE: intentionally omitting `room` from deps ─────────────────────
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, myPlayerId, router, loadData])

  // ─── FIX #2: callNumber reads from refs, never from stale closure state ───
  // Before: `players` and `room` were read from the component scope, which
  // could be one render behind after a rapid realtime update. Now we always
  // read roomRef.current and playersRef.current which are updated synchronously.
  const callNumber = useCallback(async (number: number) => {
    const currentRoom = roomRef.current
    const currentPlayers = playersRef.current

    if (!currentRoom || !myPlayerId) {
      console.warn("[callNumber] missing room or player id")
      return
    }
    if (currentRoom.current_turn_player_id !== myPlayerId) {
      console.warn("[callNumber] not my turn")
      return
    }
    if (currentRoom.called_numbers.includes(number)) {
      console.warn("[callNumber] number already called:", number)
      return
    }
    if (currentRoom.status !== "playing") {
      console.warn("[callNumber] room not in playing state:", currentRoom.status)
      return
    }

    const newCalledNumbers = [...currentRoom.called_numbers, number]
    const activePlayers = currentPlayers.filter(p => !p.is_spectator)

    console.debug("[callNumber] calling", number, "activePlayers:", activePlayers.length)

    // Advance turn first so the room update is fast and responsive
    const nextPlayerId = getNextPlayerId(activePlayers, myPlayerId)
    const { error: roomErr } = await supabase
      .from("rooms")
      .update({
        called_numbers: newCalledNumbers,
        current_turn_player_id: nextPlayerId,
      })
      .eq("id", currentRoom.id)

    if (roomErr) {
      console.error("[callNumber] room update failed:", roomErr)
      return
    }

    // Record move (non-blocking — don't await before player updates)
    supabase.from("moves").insert({
      room_id: currentRoom.id,
      player_id: myPlayerId,
      number_called: number,
    }).then(({ error }) => {
      if (error) console.error("[callNumber] move insert failed:", error)
    })

    // Update all players' marked cells — one await per player is intentional
    // so we can detect winner on first hit
    for (const player of activePlayers) {
      if (!player.board) continue
      const marked = computeMarkedCells(player.board, newCalledNumbers)
      const lines = countCompletedLines(marked, currentRoom.mode as GameMode)
      const letters = getBingoLetters(lines, currentRoom.mode as GameMode)
      const won = hasWon(lines, currentRoom.mode as GameMode)
      const prevLines = player.lines_completed

      const { error: playerErr } = await supabase
        .from("players")
        .update({ marked_cells: marked, lines_completed: lines, bingo_letters: letters })
        .eq("id", player.id)

      if (playerErr) {
        console.error("[callNumber] player update failed for", player.id, playerErr)
        continue
      }

      if (won && !currentRoom.winner_id) {
        await supabase
          .from("rooms")
          .update({ status: "finished", winner_id: player.id })
          .eq("id", currentRoom.id)
        await supabase.from("messages").insert({
          room_id: currentRoom.id,
          content: `🎉 ${player.username} wins with BINGO!`,
          type: "event",
        })
      } else if (lines > prevLines) {
        supabase.from("messages").insert({
          room_id: currentRoom.id,
          content: `${player.username} completed a line! (${lines}/${GRID_CONFIG[currentRoom.mode as GameMode].lines})`,
          type: "event",
        })
      }
    }

    supabase.from("messages").insert({
      room_id: currentRoom.id,
      content: `${currentPlayers.find(p => p.id === myPlayerId)?.username ?? "Player"} called ${number}`,
      type: "event",
    })
  }, [myPlayerId])

  const submitBoard = useCallback(async (board: number[]) => {
    const currentRoom = roomRef.current
    const currentPlayers = playersRef.current
    if (!myPlayerId || !currentRoom) return
    if (!validateBoard(board, currentRoom.mode as GameMode)) return

    const marked = computeMarkedCells(board, currentRoom.called_numbers)
    const { error } = await supabase
      .from("players")
      .update({ board, marked_cells: marked })
      .eq("id", myPlayerId)

    if (error) { console.error("[submitBoard] failed:", error); return }

    // Refresh players from DB to get accurate allBoarded check
    const { data: freshPlayers } = await supabase
      .from("players")
      .select("id, board, is_spectator")
      .eq("room_id", currentRoom.id)

    const activePlayers = (freshPlayers ?? []).filter((p: any) => !p.is_spectator)
    const allBoarded = activePlayers.every((p: any) => p.board && p.board.length > 0)

    if (allBoarded) {
      await supabase.from("rooms").update({ status: "playing" }).eq("id", currentRoom.id)
      await supabase.from("messages").insert({
        room_id: currentRoom.id,
        content: "All players are ready! Game started.",
        type: "system",
      })
    }
  }, [myPlayerId])

  const sendMessage = useCallback(async (content: string) => {
    const currentRoom = roomRef.current
    if (!myPlayerId || !content.trim() || !currentRoom) return
    await supabase.from("messages").insert({
      room_id: currentRoom.id,
      player_id: myPlayerId,
      content: content.trim(),
      type: "chat",
    })
  }, [myPlayerId])

  const toggleMute = () => {
    const newMuted = !muted
    setMuted(newMuted)
    sounds.setMuted(newMuted)
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (!room || !myPlayer) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading game...</div>
      </div>
    )
  }

  const isMyTurn = room.current_turn_player_id === myPlayer.id && room.status === "playing"
  const boardSubmitted = Boolean(myPlayer.board && myPlayer.board.length > 0)
  const activePlayers = players.filter(p => !p.is_spectator)
  const allBoarded = activePlayers.every(p => p.board && p.board.length > 0)

  return (
    // ─── FIX LAYOUT #1: h-screen + overflow-hidden constrains everything ────
    // Previously `min-h-screen` allowed content to grow beyond the viewport.
    // `h-screen overflow-hidden` locks the outer container to exactly the
    // viewport height; inner panels scroll internally via overflow-y-auto.
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] pointer-events-none opacity-20" />

      <AnimatePresence>
        {winner && <WinScreen winner={winner} myPlayer={myPlayer} roomId={roomId} />}
      </AnimatePresence>

      {/* ── Header ── fixed height so the rest can fill the remaining space ── */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border glass">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-crimson-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs">B</span>
          </div>
          <span className="font-black tracking-tight text-sm hidden sm:block">BINGO</span>
          <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono">{room.code}</span>
          {room.status === "setup" && (
            <span className="text-xs text-amber-400 bg-amber-950/40 rounded px-1.5 py-0.5">Setup</span>
          )}
          {room.status === "playing" && (
            <span className={`text-xs rounded px-1.5 py-0.5 flex-shrink-0 ${
              isMyTurn
                ? "text-crimson-400 bg-crimson-950/40 animate-pulse-crimson"
                : "text-muted-foreground bg-muted"
            }`}>
              {isMyTurn ? "Your turn!" : "Waiting..."}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <BingoProgress
             letters={myPlayer.bingo_letters}
             mode ={room.mode as GameMode}/> 

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Board setup ──────────────────────────────────────────────────────── */}
      {room.status === "setup" && !boardSubmitted && !myPlayer.is_spectator && (
        <div className="relative z-10 flex-1 overflow-y-auto flex items-center justify-center p-4">
          <BoardSetup mode={room.mode as GameMode} onSubmit={submitBoard} />
        </div>
      )}

      {/* ── Waiting for others ───────────────────────────────────────────────── */}
      {room.status === "setup" && boardSubmitted && !allBoarded && (
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground text-lg mb-2">Board saved! ✓</div>
            <div className="text-muted-foreground text-sm animate-pulse">
              Waiting for other players to set up their boards...
            </div>
          </div>
        </div>
      )}

      {/* ── Main gameplay ────────────────────────────────────────────────────── */}
      {(room.status === "playing" ||
        (room.status === "setup" && allBoarded) ||
        room.status === "finished") && (

        // ─── FIX LAYOUT #2: min-h-0 is required for flex children to shrink ──
        // Without min-h-0, flex children ignore overflow:hidden on their parent
        // and push the container beyond the viewport.
        <div className="relative z-10 flex-1 flex min-h-0 overflow-hidden">

          {/* Left column: called numbers + board */}
          <div className="flex-1 flex flex-col gap-2 p-2 sm:p-3 min-w-0 min-h-0 overflow-hidden">

            {/* Called numbers strip */}
            <div className="glass rounded-lg p-2 flex-shrink-0">
              <div className="text-xs text-muted-foreground mb-1.5">
                Called ({room.called_numbers.length})
              </div>
              <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                {room.called_numbers.length === 0 && (
                  <span className="text-xs text-muted-foreground">None yet</span>
                )}
                {[...room.called_numbers].reverse().map((n, i) => (
                  <span
                    key={n}
                    className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold flex-shrink-0 ${
                      i === 0
                        ? "bg-crimson-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>

            {/* Bingo board — fills remaining space */}
            {myPlayer.board && (
              <div className="flex-1 min-h-0">
                <BingoBoard
                  board={myPlayer.board}
                  markedCells={myPlayer.marked_cells}
                  calledNumbers={room.called_numbers}
                  isMyTurn={isMyTurn}
                  mode={room.mode as GameMode}
                  onCallNumber={callNumber}
                />
              </div>
            )}
          </div>

          {/* ─── FIX LAYOUT #3: Right sidebar hidden on mobile ──────────────
              On mobile (< md), the sidebar is hidden entirely.
              Players see their board full-width. Chat floats.
              On desktop, sidebar shows at fixed width w-60 or w-64.        */}
          <div className="hidden md:flex w-60 flex-shrink-0 flex-col gap-2 p-2 sm:p-3 min-h-0 overflow-hidden">
            <PlayerList
              players={players}
              currentTurnId={room.current_turn_player_id}
              myPlayerId={myPlayer.id}
              mode={room.mode as GameMode}
            />
          </div>
        </div>
      )}

      {/* ─── FIX ISSUE #2: Floating chat replaces inline ChatPanel ────────────
          FloatingChat renders as a fixed overlay (bottom-right button on desktop,
          bottom sheet on mobile). It never occupies layout space, so it can never
          push or overlap the board.                                            */}
      <FloatingChat
        messages={messages}
        myPlayerId={myPlayer.id}
        players={players}
        onSend={sendMessage}
      />

      {myPlayer.is_spectator && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-4 py-2 text-sm text-muted-foreground z-20">
          👁 Spectating
        </div>
      )}
    </div>
  )
}