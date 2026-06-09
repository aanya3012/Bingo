"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { generateRoomCode } from "@/lib/game-logic"
import { AVATAR_COLORS, GameMode } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Zap, Users, Trophy, Shuffle } from "lucide-react"

const MODES: { id: GameMode; label: string; desc: string; grid: string }[] = [
  { id: "classic", label: "Classic", desc: "5×5 · 25 numbers · 5 lines to win", grid: "5×5" },
  { id: "quick",   label: "Quick",   desc: "3×3 · 9 numbers · 3 lines to win",  grid: "3×3" },
  { id: "chaos",   label: "Chaos",   desc: "7×7 · 49 numbers · 7 lines to win", grid: "7×7" },
]

export default function HomePage() {
  const router = useRouter()
  const [tab, setTab] = useState<"create" | "join">("create")
  const [username, setUsername] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [mode, setMode] = useState<GameMode>("classic")
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const randomUsername = () => {
    const adjectives = ["Swift", "Bold", "Lucky", "Fierce", "Sharp", "Wild", "Calm", "Bright"]
    const nouns = ["Tiger", "Eagle", "Storm", "Blaze", "River", "Stone", "Flame", "Wind"]
    setUsername(`${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`)
  }

  const handleCreate = async () => {
    if (!username.trim()) { setError("Enter a username"); return }
    setLoading(true); setError("")
    try {
      const code = generateRoomCode()
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

      const { data: room, error: re } = await supabase
        .from("rooms").insert({ code, status: "waiting", mode, max_players: maxPlayers }).select().single()
      if (re) throw re

      const { data: player, error: pe } = await supabase
        .from("players")
        .insert({ room_id: room.id, username: username.trim(), avatar_color: avatarColor, is_host: true })
        .select().single()
      if (pe) throw pe

      await supabase.from("rooms").update({ host_id: player.id }).eq("id", room.id)
      await supabase.from("messages").insert({ room_id: room.id, content: `Room created by ${username}`, type: "system" })

      localStorage.setItem("bingo_player_id", player.id)
      localStorage.setItem("bingo_room_id", room.id)
      router.push(`/lobby/${room.id}`)
    } catch (e: any) {
      setError(e.message || "Failed to create room")
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!username.trim()) { setError("Enter a username"); return }
    if (!roomCode.trim()) { setError("Enter a room code"); return }
    setLoading(true); setError("")
    try {
      const { data: room, error: re } = await supabase
        .from("rooms").select("*").eq("code", roomCode.trim().toUpperCase()).single()
      if (re || !room) { setError("Room not found"); setLoading(false); return }
      if (room.status === "finished") { setError("This game has ended"); setLoading(false); return }

      const { data: existing } = await supabase.from("players").select("id").eq("room_id", room.id)
      const activePlayers = existing?.filter(p => !p.is_spectator) ?? []

      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
      const isSpectator = activePlayers.length >= room.max_players || room.status === "playing"

      const { data: player, error: pe } = await supabase
        .from("players")
        .insert({ room_id: room.id, username: username.trim(), avatar_color: avatarColor, is_spectator: isSpectator })
        .select().single()
      if (pe) throw pe

      await supabase.from("messages").insert({
        room_id: room.id,
        content: isSpectator ? `${username} joined as spectator` : `${username} joined the room`,
        type: "system",
      })

      localStorage.setItem("bingo_player_id", player.id)
      localStorage.setItem("bingo_room_id", room.id)

      if (room.status === "playing") {
        router.push(`/game/${room.id}`)
      } else {
        router.push(`/lobby/${room.id}`)
      }
    } catch (e: any) {
      setError(e.message || "Failed to join room")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-100 pointer-events-none" />
      <div className="absolute inset-0 bg-crimson-glow pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-crimson-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">B</span>
          </div>
          <span className="font-black text-xl tracking-tight">BINGO</span>
        </div>
        <span className="text-xs text-muted-foreground">2–8 players · Real-time</span>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-16 pb-24 gap-16">
        {/* Hero */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            {["B","I","N","G","O"].map((letter, i) => (
              <motion.div
                key={letter}
                className="bingo-letter earned w-14 h-14 text-2xl"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              >
                {letter}
              </motion.div>
            ))}
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            Play <span className="text-crimson-500">Bingo</span><br />with friends
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            The classic Indian 1–25 number game, now online. Up to 8 players, real-time multiplayer, no account needed.
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="w-full max-w-md glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Tabs */}
          <div className="flex rounded-lg bg-muted p-1 mb-6">
            {(["create", "join"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError("") }}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                  tab === t ? "bg-crimson-600 text-white shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "create" ? "Create Room" : "Join Room"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* Username */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Your Name</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  maxLength={20}
                  className="bg-input border-border"
                />
                <Button variant="outline" size="icon" onClick={randomUsername} title="Random name">
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {tab === "create" && (
              <>
                {/* Mode */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Game Mode</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          mode === m.id
                            ? "border-crimson-600 bg-crimson-950/40 text-foreground"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground"
                        }`}
                      >
                        <div className="font-bold text-sm">{m.label}</div>
                        <div className="text-xs opacity-70">{m.grid}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max players */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Users className="w-3 h-3" /> Max Players: {maxPlayers}
                  </Label>
                  <input
                    type="range" min={2} max={8} value={maxPlayers}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                    className="w-full accent-crimson-600"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>2</span><span>8</span>
                  </div>
                </div>
              </>
            )}

            {tab === "join" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Room Code</Label>
                <Input
                  placeholder="e.g. ABC123"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="bg-input border-border font-mono text-lg tracking-widest uppercase"
                />
              </div>
            )}

            {error && (
              <p className="text-crimson-400 text-sm bg-crimson-950/30 border border-crimson-800/50 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              className="w-full bg-crimson-600 hover:bg-crimson-700 text-white font-bold h-11"
              onClick={tab === "create" ? handleCreate : handleJoin}
              disabled={loading}
            >
              {loading ? "..." : tab === "create" ? "Create Room" : "Join Room"}
            </Button>
          </div>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
          {[
            { icon: Users, title: "2–8 Players", desc: "Play with your whole friend group" },
            { icon: Zap, title: "Real-time", desc: "Powered by Supabase Realtime" },
            { icon: Trophy, title: "No Account", desc: "Jump in instantly with a username" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-xl p-4 text-center">
              <Icon className="w-6 h-6 text-crimson-500 mx-auto mb-2" />
              <div className="font-semibold text-sm">{title}</div>
              <div className="text-xs text-muted-foreground mt-1">{desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 text-center text-xs text-muted-foreground py-6 border-t border-border">
        BINGO — Built with Next.js 15, Supabase, and Framer Motion
      </footer>
    </div>
  )
}
