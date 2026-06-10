"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Message, Player } from "@/types"
import { MessageCircle, X, Send, SmilePlus } from "lucide-react"
import { cn } from "@/lib/utils"

const EMOJI_QUICK = ["😂", "🔥", "👏", "😱", "🎯", "💀", "🎉", "👀"]

interface FloatingChatProps {
  messages: Message[]
  myPlayerId: string
  players: Player[]
  onSend: (msg: string) => void
}

export function FloatingChat({ messages, myPlayerId, players, onSend }: FloatingChatProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [showEmoji, setShowEmoji] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(messages.length)

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]))

  // Count unread chat messages while closed
  useEffect(() => {
    if (!open) {
      const newCount = messages.length - prevLengthRef.current
      if (newCount > 0) setUnread(u => u + newCount)
    } else {
      setUnread(0)
      prevLengthRef.current = messages.length
    }
  }, [messages.length, open])

  // Scroll to bottom when opened or new message arrives while open
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      prevLengthRef.current = messages.length
    }
  }, [messages, open])

  const submit = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput("")
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() }
  }

  // Only show chat messages (not system/event) in unread count
  const chatOnly = messages.filter(m => m.type === "chat")

  return (
    <>
      {/* ── Panel ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Mobile: bottom sheet */}
            <motion.div
              key="mobile-sheet"
              className="fixed inset-x-0 bottom-0 z-40 md:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="bg-card border-t border-border rounded-t-2xl shadow-2xl flex flex-col"
                   style={{ height: "60vh", maxHeight: "480px" }}>
                <ChatHeader onClose={() => setOpen(false)} />
                <ChatMessages
                  messages={messages}
                  myPlayerId={myPlayerId}
                  playerMap={playerMap}
                  bottomRef={bottomRef}
                />
                {showEmoji && <EmojiBar onPick={(e) => { onSend(e); setShowEmoji(false) }} />}
                <ChatInput
                  input={input}
                  onInput={setInput}
                  onKey={handleKey}
                  onSend={submit}
                  onEmojiToggle={() => setShowEmoji(s => !s)}
                />
              </div>
            </motion.div>

            {/* Desktop: floating side panel */}
            <motion.div
              key="desktop-panel"
              className="hidden md:flex fixed bottom-20 right-4 z-40 flex-col"
              style={{ width: 320, height: 460 }}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="bg-card border border-border rounded-xl shadow-2xl flex flex-col h-full overflow-hidden">
                <ChatHeader onClose={() => setOpen(false)} />
                <ChatMessages
                  messages={messages}
                  myPlayerId={myPlayerId}
                  playerMap={playerMap}
                  bottomRef={bottomRef}
                />
                {showEmoji && <EmojiBar onPick={(e) => { onSend(e); setShowEmoji(false) }} />}
                <ChatInput
                  input={input}
                  onInput={setInput}
                  onKey={handleKey}
                  onSend={submit}
                  onEmojiToggle={() => setShowEmoji(s => !s)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Toggle button ────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full shadow-lg",
          "flex items-center justify-center transition-all duration-200",
          open
            ? "bg-muted text-foreground"
            : "bg-crimson-600 hover:bg-crimson-700 text-white"
        )}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <MessageCircle className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </>
        )}
      </button>
    </>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ChatHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
      <span className="text-sm font-semibold">Chat</span>
      <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function ChatMessages({
  messages,
  myPlayerId,
  playerMap,
  bottomRef,
}: {
  messages: Message[]
  myPlayerId: string
  playerMap: Record<string, Player>
  bottomRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
      {messages.map(msg => {
        const player = msg.player_id ? playerMap[msg.player_id] : null
        const isMe = msg.player_id === myPlayerId

        if (msg.type === "system") {
          return (
            <div key={msg.id} className="text-xs text-muted-foreground italic text-center">
              {msg.content}
            </div>
          )
        }
        if (msg.type === "event") {
          return (
            <div key={msg.id} className="text-xs text-crimson-400 font-medium">
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
  )
}

function EmojiBar({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="px-2 pb-1 flex flex-wrap gap-1 border-t border-border pt-1">
      {EMOJI_QUICK.map(e => (
        <button key={e} onClick={() => onPick(e)} className="text-lg hover:scale-125 transition-transform">
          {e}
        </button>
      ))}
    </div>
  )
}

function ChatInput({
  input, onInput, onKey, onSend, onEmojiToggle,
}: {
  input: string
  onInput: (v: string) => void
  onKey: (e: React.KeyboardEvent) => void
  onSend: () => void
  onEmojiToggle: () => void
}) {
  return (
    <div className="flex gap-1.5 p-2 border-t border-border flex-shrink-0">
      <button
        onClick={onEmojiToggle}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        <SmilePlus className="w-4 h-4" />
      </button>
      <input
        value={input}
        onChange={e => onInput(e.target.value)}
        onKeyDown={onKey}
        placeholder="Message..."
        maxLength={200}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
      />
      <button
        onClick={onSend}
        disabled={!input.trim()}
        className="p-1.5 rounded text-crimson-500 hover:text-crimson-400 disabled:opacity-30 transition-colors"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  )
}

