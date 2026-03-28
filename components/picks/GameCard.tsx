"use client"
import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, XCircle, Clock, Lock } from "lucide-react"
import type { Game } from '@/types/database'

interface GameCardProps {
  game: Game
  isSelected: boolean
  isHistorical: boolean
  result?: 'win' | 'loss' | 'push' | null
  onSelect: (id: string) => void
  disabled?: boolean
}

export function GameCard({ game, isSelected, isHistorical, result, onSelect, disabled }: GameCardProps) {
  const cushion = Math.abs(game.spread) + 13
  const isInteractionDisabled = isHistorical || disabled
  const hasStarted = new Date(game.commence_time) < new Date()

  const resultLabel = result ? result.toUpperCase() : null
  const resultColor = result === 'win'
    ? 'bg-green-500/20 text-green-500'
    : result === 'loss'
    ? 'bg-red-500/20 text-red-500'
    : 'bg-zinc-500/20 text-zinc-400'

  return (
    <Card
      className={`transition-all duration-300 bg-zinc-900 border-zinc-800 relative ${
        isSelected ? 'border-green-500 ring-1 ring-green-500' : ''
      } ${isInteractionDisabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.97]'}
      ${disabled && !isSelected ? 'opacity-40 grayscale' : 'opacity-100'}
      `}
      onClick={() => !isInteractionDisabled && onSelect(game.id)}
    >
      <CardContent className="p-4">
        {disabled && isSelected && (
          <Lock className="absolute top-2 right-10 w-3 h-3 text-green-500/50" />
        )}

        <div className="flex justify-between items-start mb-2">
          <span className="text-[9px] font-black text-zinc-500 bg-zinc-800 px-2 py-1 rounded uppercase flex items-center gap-1">
            {(isHistorical || hasStarted) && <Clock className="w-3 h-3" />}
            {game.time ?? game.status}
          </span>

          <div className="flex items-center gap-2">
            {isHistorical && isSelected && resultLabel && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${resultColor}`}>
                {resultLabel}
              </span>
            )}
            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
              isSelected ? 'bg-green-500 border-green-500' : 'border-zinc-700'
            } ${disabled && isSelected ? 'shadow-[0_0_10px_rgba(34,197,94,0.4)]' : ''}`}>
              {isSelected && (
                result === 'loss' && isHistorical
                  ? <XCircle className="w-3.5 h-3.5 text-black" />
                  : <CheckCircle2 className="w-3.5 h-3.5 text-black" />
              )}
            </div>
          </div>
        </div>

        <p className="font-bold text-lg text-white tracking-tight uppercase">
          {game.fav ?? game.favorite_team}
          <span className="text-zinc-600 font-medium text-sm mx-1 italic">vs</span>
          {game.dog ?? game.underdog_team}
        </p>

        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono">
          <span className="text-zinc-500 uppercase">Spread: {game.spread}</span>
          <span className="text-green-500 font-black uppercase">Cushion: +{cushion}</span>
        </div>

        {/* Show scores if final */}
        {game.status === 'final' && game.home_score != null && (
          <div className="mt-2 text-[10px] font-mono text-zinc-500">
            {game.home_team} {game.home_score} — {game.away_team} {game.away_score}
          </div>
        )}
      </CardContent>
    </Card>
  )
}