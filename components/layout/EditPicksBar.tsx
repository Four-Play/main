"use client"
import React from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Lock, Pencil } from "lucide-react"

interface EditPicksBarProps {
  mode: 'locked' | 'editing'
  onClick: () => void
  isVisible: boolean
}

export function EditPicksBar({ mode, onClick, isVisible }: EditPicksBarProps) {
  if (!isVisible) return null

  const isLocked = mode === 'locked'

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md z-[100] px-4 animate-in slide-in-from-bottom-10">
      <Card className="bg-zinc-900 border border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden rounded-full p-2 flex items-center justify-between">
        <span className="pl-6 text-zinc-400 font-black italic uppercase text-[10px] tracking-widest flex items-center gap-2">
          {isLocked ? <Lock className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
          {isLocked ? 'PICKS SUBMITTED' : 'EDITING PICKS'}
        </span>
        <Button
          onClick={onClick}
          className="h-10 px-8 rounded-full font-black text-[10px] tracking-widest uppercase bg-green-500 text-black hover:bg-green-400 transition-colors"
        >
          {isLocked ? 'EDIT PICKS' : 'DONE'}
        </Button>
      </Card>
    </div>
  )
}
