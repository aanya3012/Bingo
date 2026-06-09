"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { GameMode, GRID_CONFIG } from "@/types"
import { cn } from "@/lib/utils"

interface BingoBoardProps {
  board: number[]
  markedCells: boolean[]
  calledNumbers: number[]
  isMyTurn: boolean
  mode: GameMode
  onCallNumber: (n: number) => void
}

export function BingoBoard({ board, markedCells, calledNumbers, isMyTurn, mode, onCallNumber }: BingoBoardProps) {
  const { size, total } = GRID_CONFIG[mode]
  const [lastCalled, setLastCalled] = useState<number | null>(null)

  const handleClick = (number: number, idx: number) => {
    if (!isMyTurn) return
    if (calledNumbers.includes(number)) return
    setLastCalled(number)
    onCallNumber(number)
  }

  return (
    <div className="glass rounded-xl p-4 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">Your Board</h2>
        {isMyTurn && (
          <span className="text-xs text-crimson-400 animate-pulse font-semibold">
            Click a number to call it
          </span>
        )}
      </div>

      <div
        className="grid gap-1.5 flex-1"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {board.map((number, idx) => {
          const isMarked = markedCells[idx] ?? false
          const isCalled = calledNumbers.includes(number)
          const isLast = number === lastCalled
          const canCall = isMyTurn && !isCalled

          return (
            <motion.button
              key={idx}
              className={cn(
                "bingo-cell aspect-square text-sm md:text-base",
                isMarked && "marked",
                canCall && "hover:scale-105 active:scale-95",
                !canCall && !isMarked && "opacity-80",
              )}
              onClick={() => handleClick(number, idx)}
              whileTap={canCall ? { scale: 0.92 } : {}}
              animate={isLast ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
              disabled={!canCall && !isMarked}
            >
              {number}
              {isMarked && (
                <motion.div
                  className="absolute inset-0 rounded-md bg-crimson-600/20 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-crimson-400" />
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      <div className="mt-3 text-xs text-muted-foreground text-center">
        {markedCells.filter(Boolean).length}/{total} marked
      </div>
    </div>
  )
}
