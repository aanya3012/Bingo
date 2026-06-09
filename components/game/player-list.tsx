"use client"

import { Player, GameMode, GRID_CONFIG, BINGO_LETTERS } from "@/types"
import { Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlayerListProps {
  players: Player[]
  currentTurnId: string | null
  myPlayerId: string
  mode: GameMode
}

export function PlayerList({ players, currentTurnId, myPlayerId, mode }: PlayerListProps) {
  const { lines } = GRID_CONFIG[mode]
  const active = players.filter(p => !p.is_spectator)
  const spectators = players.filter(p => p.is_spectator)

  return (
    <div className="glass rounded-xl p-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Players ({active.length})
      </h3>

      <div className="space-y-2">
        {active.map(player => {
          const isMe = player.id === myPlayerId
          const isTurn = player.id === currentTurnId
          const progress = player.lines_completed / lines

          return (
            <div
              key={player.id}
              className={cn(
                "player-card",
                isTurn && "current-turn",
              )}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 relative"
                style={{ backgroundColor: player.avatar_color }}
              >
                {player.username[0]?.toUpperCase()}
                {isTurn && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-crimson-500 rounded-full border border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <span className={cn("text-xs font-semibold truncate", isMe && "text-crimson-300")}>
                    {player.username}
                    {isMe && " (you)"}
                  </span>
                  {player.is_host && <Crown className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />}
                </div>

                {/* BINGO letters */}
                <div className="flex items-center gap-0.5">
                  {BINGO_LETTERS.map(l => (
                    <span
                      key={l}
                      className={cn(
                        "text-xs font-black",
                        player.bingo_letters.includes(l) ? "text-crimson-400" : "text-muted-foreground/30"
                      )}
                    >
                      {l}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {player.lines_completed}/{lines}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {spectators.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            👁 {spectators.map(s => s.username).join(", ")} watching
          </p>
        </div>
      )}
    </div>
  )
}
