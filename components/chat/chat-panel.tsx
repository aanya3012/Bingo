"use client"

import { useState, useEffect, useRef } from "react"
import { Message, Player } from "@/types"
import { formatTime } from "@/lib/game-logic"
import { Send, SmilePlus } from "lucide-react"
import { cn } from "@/lib/utils"

const EMOJI_QUICK = ["😂", "🔥", "👏", "😱", "🎯", "💀", "🎉", "👀"]

interface ChatPanelProps {
  messages: Message[]
  myPlayerId: string
  players: Player[]
  onSend: (msg: string) => void
}

export function ChatPanel({ messages, myPlayerId, players, onSend }: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [showEmoji, setShowEmoji] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const submit = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput("")
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() }
  }

  return (
    <div className="glass rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.map(msg => {
          const player = msg.player_id ? playerMap[msg.player_id] : null
          const isMe = msg.player_id === myPlayerId

          if (msg.type === "system") {
            return (
              <div key={msg.id} className="chat-message system text-center">
                {msg.content}
              </div>
            )
          }

          if (msg.type === "event") {
            return (
              <div key={msg.id} className="chat-message event">
                ⚡ {msg.content}
              </div>
            )
          }

          return (
            <div key={msg.id} className={cn("flex gap-2", isMe && "flex-row-reverse")}>
              {player && (
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: player.avatar_color }}
                >
                  {player.username[0]?.toUpperCase()}
                </div>
              )}
              <div className={cn("max-w-[75%]", isMe && "items-end flex flex-col")}>
                {!isMe && player && (
                  <span className="text-xs text-muted-foreground mb-0.5">{player.username}</span>
                )}
                <div className={cn(
                  "text-xs rounded-lg px-2.5 py-1.5 break-words",
                  isMe ? "bg-crimson-900/60 text-crimson-100" : "bg-muted text-foreground"
                )}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-2 pb-2 flex flex-wrap gap-1">
          {EMOJI_QUICK.map(e => (
            <button
              key={e}
              onClick={() => { onSend(e); setShowEmoji(false) }}
              className="text-lg hover:scale-125 transition-transform"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-1.5 p-2 border-t border-border">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <SmilePlus className="w-4 h-4" />
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message..."
          maxLength={200}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
        />
        <button
          onClick={submit}
          disabled={!input.trim()}
          className="p-1.5 rounded text-crimson-500 hover:text-crimson-400 disabled:opacity-30 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
