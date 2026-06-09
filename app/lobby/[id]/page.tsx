"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { sounds } from "@/lib/sounds"
import { Room, Player } from "@/types"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Copy, Check, Crown, Users, ArrowRight, Gamepad2 } from "lucide-react"

export default function LobbyPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string
  const { toast } = useToast()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)

  const myPlayerId = typeof window !== "undefined" ? localStorage.getItem("bingo_player_id") : null

  const loadData = useCallback(async () => {
    const { data: roomData } = await supabase.from("rooms").select("*").eq("id", roomId).single()
    const { data: playersData } = await supabase.from("players").select("*").eq("room_id", roomId).order("joined_at")
    if (roomData) setRoom(roomData as Room)
    if (playersData) {
      setPlayers(playersData as Player[])
      const me = playersData.find(p => p.id === myPlayerId)
      if (me) setMyPlayer(me as Player)
    }
    if (roomData?.status === "setup") router.push(`/game/${roomId}`)
    if (roomData?.status === "playing") router.push(`/game/${roomId}`)
  }, [roomId, myPlayerId, router])

  useEffect(() => {
    if (!myPlayerId) { router.push("/"); return }
    loadData()

    // Realtime subscriptions
    const channel = supabase.channel(`lobby:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const updated = payload.new as Room
        setRoom(updated)
        if (updated.status === "setup" || updated.status === "playing") {
          router.push(`/game/${roomId}`)
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` }, () => {
        loadData()
        sounds.playerJoined()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, myPlayerId, router, loadData])

  const toggleReady = async () => {
    if (!myPlayer) return
    await supabase.from("players").update({ is_ready: !myPlayer.is_ready }).eq("id", myPlayer.id)
    setMyPlayer(prev => prev ? { ...prev, is_ready: !prev.is_ready } : null)
  }

  const startGame = async () => {
    const active = players.filter(p => !p.is_spectator)
    if (active.length < 2) { toast({ title: "Need at least 2 players", variant: "destructive" }); return }
    if (!active.every(p => p.is_ready)) { toast({ title: "All players must be ready", variant: "destructive" }); return }
    setStarting(true)
    const firstPlayer = active[Math.floor(Math.random() * active.length)]
    await supabase.from("rooms").update({ status: "setup", current_turn_player_id: firstPlayer.id }).eq("id", roomId)
    await supabase.from("messages").insert({ room_id: roomId, content: "Game is starting! Set up your boards.", type: "system" })
  }

  const copyInvite = () => {
    const url = `${window.location.origin}?join=${room?.code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: "Invite link copied!" })
  }

  const activePlayers = players.filter(p => !p.is_spectator)
  const allReady = activePlayers.length >= 2 && activePlayers.every(p => p.is_ready)
  const isHost = myPlayer?.is_host

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] pointer-events-none opacity-30" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Lobby</h1>
            <p className="text-muted-foreground text-sm mt-1">{room?.mode?.toUpperCase()} · Up to {room?.max_players} players</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">Room Code</div>
            <div className="room-code">{room?.code}</div>
          </div>
        </div>

        {/* Invite */}
        <button
          onClick={copyInvite}
          className="w-full flex items-center justify-between glass rounded-xl px-4 py-3 mb-6 hover:border-crimson-700 transition-colors group"
        >
          <span className="text-sm text-muted-foreground">Share invite link</span>
          <span className="flex items-center gap-1 text-sm text-crimson-400">
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy link</>}
          </span>
        </button>

        {/* Players */}
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-crimson-500" />
              Players ({activePlayers.length}/{room?.max_players})
            </h2>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  className={`player-card ${player.id === myPlayerId ? "border-crimson-800/50" : ""}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: player.avatar_color }}
                  >
                    {player.username[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{player.username}</span>
                      {player.id === myPlayerId && <span className="text-xs text-muted-foreground">(you)</span>}
                      {player.is_host && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      {player.is_spectator && <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">spectator</span>}
                    </div>
                  </div>

                  <div className={`text-xs font-semibold px-2 py-1 rounded ${
                    player.is_spectator ? "text-muted-foreground" :
                    player.is_ready ? "text-emerald-400 bg-emerald-950/40" : "text-amber-400 bg-amber-950/40"
                  }`}>
                    {player.is_spectator ? "watching" : player.is_ready ? "ready" : "waiting"}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions */}
        {!myPlayer?.is_spectator && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className={`flex-1 h-11 font-semibold ${myPlayer?.is_ready ? "border-emerald-600 text-emerald-400" : ""}`}
              onClick={toggleReady}
            >
              {myPlayer?.is_ready ? "✓ Ready" : "Mark Ready"}
            </Button>

            {isHost && (
              <Button
                className="flex-1 h-11 bg-crimson-600 hover:bg-crimson-700 text-white font-bold disabled:opacity-40"
                disabled={!allReady || starting}
                onClick={startGame}
              >
                <Gamepad2 className="w-4 h-4 mr-2" />
                {starting ? "Starting..." : "Start Game"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {!allReady && activePlayers.length >= 2 && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Waiting for all players to mark ready
          </p>
        )}
        {activePlayers.length < 2 && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Need at least 2 players to start
          </p>
        )}
      </div>
    </div>
  )
}
