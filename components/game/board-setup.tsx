"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { GameMode, GRID_CONFIG } from "@/types"
import { generateRandomBoard, shuffle } from "@/lib/game-logic"
import { Button } from "@/components/ui/button"
import { Shuffle, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface BoardSetupProps {
  mode: GameMode
  onSubmit: (board: number[]) => void
}

export function BoardSetup({ mode, onSubmit }: BoardSetupProps) {
  const { size, total } = GRID_CONFIG[mode]
  const [board, setBoard] = useState<number[]>(() => generateRandomBoard(mode))
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleDragStart = (idx: number) => setDragging(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOver(idx)
  }

  const handleDrop = (idx: number) => {
    if (dragging === null || dragging === idx) return
    const newBoard = [...board]
    ;[newBoard[dragging], newBoard[idx]] = [newBoard[idx], newBoard[dragging]]
    setBoard(newBoard)
    setDragging(null)
    setDragOver(null)
  }

  const randomize = () => setBoard(generateRandomBoard(mode))

  const handleSubmit = () => {
    setSubmitted(true)
    onSubmit(board)
  }

  return (
    <div className="w-full max-w-lg">
      <div className="glass rounded-xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black mb-1">Set Up Your Board</h2>
          <p className="text-muted-foreground text-sm">
            Drag numbers to rearrange your {size}×{size} grid. Every number 1–{total} must appear exactly once.
          </p>
        </div>

        {/* Grid */}
        <div
          className="grid gap-2 mb-6"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {board.map((number, idx) => (
            <motion.div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { setDragging(null); setDragOver(null) }}
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg border font-bold",
                "cursor-grab active:cursor-grabbing select-none transition-all text-sm md:text-base",
                dragging === idx ? "opacity-40 scale-95 border-crimson-600" : "border-border",
                dragOver === idx && dragging !== idx ? "border-crimson-500 bg-crimson-950/40 scale-105" : "bg-card hover:bg-muted/50",
              )}
              whileHover={{ scale: 1.03 }}
            >
              {number}
            </motion.div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={randomize}
            disabled={submitted}
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Randomize
          </Button>
          <Button
            className="flex-1 bg-crimson-600 hover:bg-crimson-700 text-white font-bold"
            onClick={handleSubmit}
            disabled={submitted}
          >
            {submitted ? (
              <><Check className="w-4 h-4 mr-2" />Saved!</>
            ) : (
              "Lock In Board"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
