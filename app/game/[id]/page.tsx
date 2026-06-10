"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { sounds } from "@/lib/sounds"
import { computeMarkedCells, countCompletedLines, getBingoLetters, hasWon, getNextPlayerId, validateBoard, generateRandomBoard } from "@/lib/game-logic"
import { Room, Player, Message, GameMode } from "@/types"
import { BingoBoard } from "@/components/game/bingo-board"
import { BoardSetup } from "@/components/game/board-setup"
import { FloatingChat } from "@/components/chat/floating-chat"
import { PlayerList } from "@/components/game/player-list"
import { BingoProgress } from "@/components/game/bingo-progress"
import { WinScreen } from "@/components/game/win-screen"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"
import { GRID_CONFIG } from "@/types"

export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [muted, setMuted] = useState(false)
  const [winner, setWinner] = useState<Player | null>(null)
  const prevCalledRef = useRef<number[]>([])

  const myPlayerId = typeof window !== "undefined" ? localStorage.getItem("bingo_player_id") : null

  const loadData = useCallback(async () => {
    const [{ data: r }, { data: p }, { data: m }] = await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).single(),
      supabase.from("players").select("*").eq("room_id", roomId).order("joined_at"),
      supabase.from("messages").select("*").eq("room_id", roomId).order("created_at").limit(100),
    ])
    if (r) setRoom(r as Room)
    if (p) {
      setPlayers(p as Player[])
      const me = p.find((pl: Player) => pl.id === myPlayerId)
      if (me) setMyPlayer(me as Player)
      // Check for winner
      const winnerPlayer = p.find((pl: Player) => pl.id === (r as Room)?.winner_id)
      if (winnerPlayer) setWinner(winnerPlayer as Player)
    }
    if (m) setMessages(m as Message[])
  }, [roomId, myPlayerId])

  useEffect(() => {
    if (!myPlayerId) { router.push("/"); return }
    loadData()

    const channel = supabase.channel(`game:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const updated = payload.new as Room
        setRoom(updated)
        // Play sound for new number
        const prev = prevCalledRef.current
        const newNumbers = updated.called_numbers.filter(n => !prev.includes(n))
        if (newNumbers.length > 0) sounds.numberCalled()
        prevCalledRef.current = updated.called_numbers
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` }, (payload) => {
        const updated = payload.new as Player
        setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
        if (updated.id === myPlayerId) setMyPlayer(updated)
        if (updated.lines_completed > 0) {
          // check winner
          if (room && hasWon(updated.lines_completed, room.mode as GameMode)) {
            setWinner(updated)
            sounds.victory()
          } else {
            sounds.lineCompleted()
          }
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, myPlayerId, router, loadData, room])

  const callNumber = async (number: number) => {
    if (!room || !myPlayer) return
    if (room.current_turn_player_id !== myPlayer.id) return
    if (room.called_numbers.includes(number)) return

    const newCalledNumbers = [...room.called_numbers, number]
    const activePlayers = players.filter(p => !p.is_spectator)

    // Update room
    const nextPlayerId = getNextPlayerId(activePlayers, myPlayer.id)
    await supabase.from("rooms").update({
      called_numbers: newCalledNumbers,
      current_turn_player_id: nextPlayerId,
    }).eq("id", roomId)

    // Record move
    await supabase.from("moves").insert({ room_id: roomId, player_id: myPlayer.id, number_called: number })

    // Update all players' marked cells and check bingo
    for (const player of activePlayers) {
      if (!player.board) continue
      const marked = computeMarkedCells(player.board, newCalledNumbers)
      const lines = countCompletedLines(marked, room.mode as GameMode)
      const letters = getBingoLetters(lines)
      const won = hasWon(lines, room.mode as GameMode)

      const prevLines = player.lines_completed
      await supabase.from("players").update({
        marked_cells: marked,
        lines_completed: lines,
        bingo_letters: letters,
      }).eq("id", player.id)

      if (won && !room.winner_id) {
        await supabase.from("rooms").update({ status: "finished", winner_id: player.id }).eq("id", roomId)
        await supabase.from("messages").insert({ room_id: roomId, content: `🎉 ${player.username} wins with BINGO!`, type: "event" })
      } else if (lines > prevLines) {
        await supabase.from("messages").insert({ room_id: roomId, content: `${player.username} completed a line! (${lines}/${GRID_CONFIG[room.mode as GameMode].lines})`, type: "event" })
      }
    }

    await supabase.from("messages").insert({ room_id: roomId, content: `${myPlayer.username} called ${number}`, type: "event" })
    sounds.numberCalled()
  }

  const submitBoard = async (board: number[]) => {
    if (!myPlayer || !room) return
    if (!validateBoard(board, room.mode as GameMode)) return

    const marked = computeMarkedCells(board, room.called_numbers)
    await supabase.from("players").update({ board, marked_cells: marked }).eq("id", myPlayer.id)

    // Check if all non-spectator players have submitted boards
    const activePlayers = players.filter(p => !p.is_spectator)
    const updatedPlayers = activePlayers.map(p => p.id === myPlayer.id ? { ...p, board } : p)
    const allBoarded = updatedPlayers.every(p => p.board && p.board.length > 0)

    if (allBoarded) {
      await supabase.from("rooms").update({ status: "playing" }).eq("id", roomId)
      await supabase.from("messages").insert({ room_id: roomId, content: "All players are ready! Game started.", type: "system" })
    }
  }

  const sendMessage = async (content: string) => {
    if (!myPlayer || !content.trim()) return
    await supabase.from("messages").insert({ room_id: roomId, player_id: myPlayer.id, content: content.trim(), type: "chat" })
  }

  const toggleMute = () => {
    const newMuted = !muted
    setMuted(newMuted)
    sounds.setMuted(newMuted)
  }

  if (!room || !myPlayer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading game...</div>
      </div>
    )
  }

  const isMyTurn = room.current_turn_player_id === myPlayer.id && room.status === "playing"
  const boardSubmitted = Boolean(myPlayer.board && myPlayer.board.length > 0)
  const activePlayers = players.filter(p => !p.is_spectator)
  const allBoarded = activePlayers.every(p => p.board && p.board.length > 0)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] pointer-events-none opacity-20" />

      {/* Win Screen */}
      <AnimatePresence>
        {winner && <WinScreen winner={winner} myPlayer={myPlayer} roomId={roomId} />}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border glass">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-crimson-600 flex items-center justify-center">
            <span className="text-white font-black text-xs">B</span>
          </div>
          <span className="font-black tracking-tight">BINGO</span>
          <span className="text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">{room.code}</span>
          {room.status === "setup" && <span className="text-xs text-amber-400 bg-amber-950/40 rounded px-2 py-0.5">Setup</span>}
          {room.status === "playing" && (
            <span className={`text-xs rounded px-2 py-0.5 ${isMyTurn ? "text-crimson-400 bg-crimson-950/40 animate-pulse-crimson" : "text-muted-foreground bg-muted"}`}>
              {isMyTurn ? "Your turn!" : "Waiting..."}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <BingoProgress letters={myPlayer.bingo_letters} />
          <button onClick={toggleMute} className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Board setup */}
      {room.status === "setup" && !boardSubmitted && !myPlayer.is_spectator && (
        <div className="relative z-10 flex-1 flex items-center justify-center p-4">
          <BoardSetup mode={room.mode as GameMode} onSubmit={submitBoard} />
        </div>
      )}

      {/* Waiting for others to set up */}
      {room.status === "setup" && boardSubmitted && !allBoarded && (
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground text-lg mb-2">Board saved! ✓</div>
            <div className="text-muted-foreground text-sm animate-pulse">Waiting for other players to set up their boards...</div>
          </div>
        </div>
      )}

      {/* Main gameplay */}
      {(room.status === "playing" || (room.status === "setup" && allBoarded) || room.status === "finished") && (
        <div className="relative z-10 flex-1 flex gap-4 p-4 min-h-0">
          {/* Left: Board + called numbers */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Called numbers history */}
            <div className="glass rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-2">Called Numbers ({room.called_numbers.length})</div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {room.called_numbers.length === 0 && <span className="text-xs text-muted-foreground">None yet</span>}
                {[...room.called_numbers].reverse().map((n, i) => (
                  <span key={n} className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold
                    ${i === 0 ? "bg-crimson-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    {n}
                  </span>
                ))}
              </div>
            </div>

            {/* My board */}
            {myPlayer.board && (
              <BingoBoard
                board={myPlayer.board}
                markedCells={myPlayer.marked_cells}
                calledNumbers={room.called_numbers}
                isMyTurn={isMyTurn}
                mode={room.mode as GameMode}
                onCallNumber={callNumber}
              />
            )}
          </div>

          {/* Right: Players + Chat */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-4 min-h-0">
            <PlayerList
              players={players}
              currentTurnId={room.current_turn_player_id}
              myPlayerId={myPlayer.id}
              mode={room.mode as GameMode}
            />
            <FloatingChat
              messages={messages}
              myPlayerId={myPlayer.id}
              players={players}
              onSend={sendMessage}
            />
          </div>
        </div>
      )}

      {/* Spectator overlay */}
      {myPlayer.is_spectator && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-4 py-2 text-sm text-muted-foreground z-20">
          👁 Spectating
        </div>
      )}
    </div>
  )
}
