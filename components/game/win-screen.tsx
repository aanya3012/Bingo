"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Player } from "@/types"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Trophy, RotateCcw, Home } from "lucide-react"

interface WinScreenProps {
  winner: Player
  myPlayer: Player
  roomId: string
}

export function WinScreen({ winner, myPlayer, roomId }: WinScreenProps) {
  const router = useRouter()
  const isWinner = winner.id === myPlayer.id

  const handleRematch = async () => {
    // Create a new room with the same code pattern
    router.push("/")
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Confetti-like sparkles */}
      {isWinner && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-crimson-500"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
              }}
              animate={{
                y: "110vh",
                x: `${(Math.random() - 0.5) * 200}px`,
                rotate: Math.random() * 720,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 1,
                ease: "easeIn",
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="glass rounded-2xl p-10 text-center max-w-sm w-full mx-4 relative z-10 glow-crimson"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 150, delay: 0.1 }}
      >
        <motion.div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl"
          style={{ backgroundColor: winner.avatar_color }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {isWinner ? "🎉" : winner.username[0]?.toUpperCase()}
        </motion.div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">Winner</span>
        </div>

        <h2 className="text-4xl font-black mb-2">
          {isWinner ? "You Won!" : `${winner.username} Wins!`}
        </h2>

        {/* BINGO letters */}
        <div className="flex items-center justify-center gap-2 my-6">
          {["B","I","N","G","O"].map((letter, i) => (
            <motion.div
              key={letter}
              className="bingo-letter earned"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 200 }}
            >
              {letter}
            </motion.div>
          ))}
        </div>

        <p className="text-muted-foreground text-sm mb-8">
          {isWinner ? "Congratulations on completing all lines!" : "Better luck next time!"}
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/")}
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button
            className="flex-1 bg-crimson-600 hover:bg-crimson-700 text-white font-bold"
            onClick={handleRematch}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Game
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
