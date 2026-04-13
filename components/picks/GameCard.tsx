"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Lock } from "lucide-react"
import type { Game } from '@/types/database'

const CUSHION = 13

/** Returns display strings for the result breakdown — no logic changes, purely cosmetic */
function getBreakdown(game: Game, selectedTeam: string) {
  if (game.home_score == null || game.away_score == null || !game.home_team || !game.away_team) return null

  const favTeam = game.fav ?? game.favorite_team
  const pickedFavorite = selectedTeam === favTeam
  const pickedIsHome = selectedTeam === game.home_team
  const homeMargin = game.home_score - game.away_score
  const pickedMargin = pickedIsHome ? homeMargin : -homeMargin
  const absSpread = Math.abs(game.spread)

  // Effective cushioned line — mirrors the threshold in lib/scoring.ts
  // Fav: cushion - spread  (e.g. 13 - 7 = +6, fav can lose by 6)
  // Dog: spread + cushion  (e.g. 7 + 13 = +20, dog can lose by 19)
  const effectiveLine = pickedFavorite ? CUSHION - absSpread : absSpread + CUSHION

  const neededDesc = pickedFavorite
    ? effectiveLine >= 0
      ? `Not lose by ${effectiveLine + 1}+`
      : `Win by ${Math.abs(effectiveLine)}+`
    : `Not lose by ${effectiveLine}+`

  const marginDesc = pickedMargin > 0
    ? `Won by ${pickedMargin}`
    : pickedMargin < 0
    ? `Lost by ${Math.abs(pickedMargin)}`
    : `Tied`

  return {
    neededDesc,
    marginDesc,
    score: `${game.home_team} ${game.home_score} – ${game.away_team} ${game.away_score}`,
    role: pickedFavorite ? 'FAV' : 'DOG',
    effectiveLine,
  }
}

interface GameCardProps {
  game: Game
  isSelected: boolean
  isHistorical: boolean
  result?: 'win' | 'loss' | 'push' | null
  onSelect: (id: string, teamSelected: string) => void
  selectedTeam?: string
}

export function GameCard({ game, isSelected, isHistorical, result, onSelect, selectedTeam }: GameCardProps) {
  const favTeam = game.fav ?? game.favorite_team
  const dogTeam = game.dog ?? game.underdog_team
  const favCushion = game.spread + 13
  const dogCushion = Math.abs(game.spread) + 13
  const hasStarted = game.commence_time ? new Date(game.commence_time) < new Date() : false
  // A pick becomes locked once its individual game has started
  const isLocked = hasStarted && !isHistorical
  const isInteractionDisabled = isHistorical || hasStarted

  const favSelected = isSelected && selectedTeam === favTeam
  const dogSelected = isSelected && selectedTeam === dogTeam

  const resultLabel = result ? result.toUpperCase() : null
  const resultColor = result === 'win'
    ? 'bg-green-500/20 text-green-500'
    : result === 'loss'
    ? 'bg-red-500/20 text-red-500'
    : 'bg-zinc-500/20 text-zinc-400'

  const halfBase = 'flex-1 rounded-lg p-2 transition-all duration-200 text-left'
  const halfActive = 'bg-green-500/10 border border-green-500'
  const halfDimmed = 'opacity-40'
  const halfIdle = 'border border-zinc-800'

  function halfClass(isThisSelected: boolean) {
    if (isThisSelected) return `${halfBase} ${halfActive}`
    if (isSelected) return `${halfBase} ${halfDimmed} ${halfIdle}`
    return `${halfBase} ${halfIdle}`
  }

  return (
    <Card
      className={`transition-all duration-300 bg-zinc-900 border-zinc-800 relative ${
  isLocked && !isSelected ? 'opacity-50' : 'opacity-100'
}`}
    >
      <CardContent className="px-2 pt-1.5 pb-2">
        {isLocked && isSelected && (
          <Lock className="absolute top-1.5 right-2 w-3 h-3 text-green-500/60" />
        )}

        {/* Header row */}
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[9px] font-black text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase flex items-center gap-1">
            {(isHistorical || hasStarted) && <Clock className="w-3 h-3" />}
            {game.time ?? game.status}
          </span>

          {isSelected && resultLabel && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${resultColor}`}>
              {resultLabel}
            </span>
          )}
        </div>

        {/* Two-half team selector */}
        <div className={`flex gap-2 ${isInteractionDisabled ? 'pointer-events-none' : ''}`}>
          <button
            className={halfClass(favSelected)}
            onClick={() => favTeam && onSelect(game.id, favTeam)}
          >
            <p className="font-bold text-sm text-white uppercase leading-tight">{favTeam}</p>
            <div className="mt-1.5 space-y-0.5">
              <p className="text-[10px] font-mono leading-tight">
                <span className="text-zinc-500">Spread: </span>
                <span className="text-red-400">{game.spread > 0 ? '+' : ''}{game.spread}</span>
              </p>
              <p className="text-[10px] font-mono leading-tight">
                <span className="text-zinc-500">Adjusted Spread: </span>
                <span className="text-green-400">{favCushion >= 0 ? '+' : ''}{favCushion}</span>
              </p>
            </div>
          </button>

          <button
            className={halfClass(dogSelected)}
            onClick={() => dogTeam && onSelect(game.id, dogTeam)}
          >
            <p className="font-bold text-sm text-white uppercase leading-tight">{dogTeam}</p>
            <div className="mt-1.5 space-y-0.5">
              <p className="text-[10px] font-mono leading-tight">
                <span className="text-zinc-500">Spread: </span>
                <span className="text-green-400">+{Math.abs(game.spread)}</span>
              </p>
              <p className="text-[10px] font-mono leading-tight">
                <span className="text-zinc-500">Adjusted Spread: </span>
                <span className="text-green-400">+{dogCushion}</span>
              </p>
            </div>
          </button>
        </div>

        {/* Result breakdown for completed picked games */}
        {isSelected && result && game.status === 'final' && selectedTeam && (() => {
          const bd = getBreakdown(game, selectedTeam)
          if (!bd) return null
          const color = result === 'win' ? 'text-green-400' : result === 'loss' ? 'text-red-400' : 'text-zinc-400'
          return (
            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  {selectedTeam} <span className="text-zinc-700">·</span> {bd.role}
                </span>
                <span className="text-[9px] text-zinc-600">Needed: {bd.neededDesc}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono text-zinc-500">{bd.score}</span>
                <span className={`text-[9px] font-black uppercase ${color}`}>
                  {bd.marginDesc} → {result.toUpperCase()}
                </span>
              </div>
            </div>
          )
        })()}

        {/* Scores only (no pick) for non-selected final games */}
        {game.status === 'final' && game.home_score != null && (!isSelected || !result) && (
          <div className="mt-2 text-[10px] font-mono text-zinc-500">
            {game.home_team} {game.home_score} — {game.away_team} {game.away_score}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
