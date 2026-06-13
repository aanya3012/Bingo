import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BINGO — Multiplayer Number Game",
  description: "Play the classic Indian 1–25 Bingo game online with up to 8 friends in real time.",

    icons: {
    icon: "/icon.png",
  },
  
  verification: {
    google: "siBk9Bq4hyikECeBDths9WLgy1Rur7x7kPKNeFAV9S4", },

  openGraph: {
    title: "BINGO — Multiplayer Number Game",
    description: "Play the classic Indian 1–25 Bingo game with friends",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
