"use client"

import { motion } from "framer-motion"
import { BINGO_LETTERS } from "@/types"
import { cn } from "@/lib/utils"

export function BingoProgress({ letters }: { letters: string[] }) {
  const earned = new Set(letters)

  return (
    <div className="flex items-center gap-1">
      {BINGO_LETTERS.map((letter, i) => {
        const isEarned = earned.has(letter)
        return (
          <motion.div
            key={letter}
            className={cn("bingo-letter w-7 h-7 text-sm", isEarned ? "earned" : "unearned")}
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
