"use client"

import { motion } from "framer-motion"
import { GameMode } from "@/types"
import { getProgressLetters } from "@/lib/game-logic"
import { cn } from "@/lib/utils"

interface BingoProgressProps {
  letters: string[]
  mode: GameMode
}

export function BingoProgress({ letters, mode }: BingoProgressProps) {
  const earnedCount = letters.length
  const targetLetters = getProgressLetters(mode)

  return (
    <div className="flex items-center gap-1">
      {targetLetters.map((letter, i) => {
        const isEarned = i < earnedCount

        return (
          <motion.div
            key={`${letter}-${i}`}
            className={cn(
              "bingo-letter w-7 h-7 text-sm",
              isEarned ? "earned" : "unearned"
            )}
            animate={isEarned ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.4, type: "spring" }}
          >
            {letter}
          </motion.div>
        )
      })}
    </div>
  )
}