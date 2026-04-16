"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Lock } from "lucide-react"
import type { Game, Pick } from '@/types/database'

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
  favPick?: Pick
  dogPick?: Pick
  isHistorical: boolean
  onSelect: (id: string, teamSelected: string) => void
  disableInteraction?: boolean
}

export function GameCard({ game, favPick, dogPick, isHistorical, onSelect, disableInteraction = false }: GameCardProps) {
  const favTeam = game.fav ?? game.favorite_team
  const dogTeam = game.dog ?? game.underdog_team
  const favCushion = game.spread + 13
  const dogCushion = Math.abs(game.spread) + 13
  const hasStarted = game.commence_time ? new Date(game.commence_time) < new Date() : false

  const favSelected = !!favPick
  const dogSelected = !!dogPick
  const anySelected = favSelected || dogSelected

  // A pick becomes locked once its individual game has started
  const isLocked = hasStarted && !isHistorical
  const isInteractionDisabled = isHistorical || hasStarted || disableInteraction

  const halfBase = 'flex-1 rounded-lg p-2 transition-all duration-200 text-left'
  const halfActive = 'bg-green-500/10 border border-green-500'
  const halfIdle = 'border border-zinc-800'

  function halfClass(isThisSelected: boolean) {
    if (isThisSelected) return `${halfBase} ${halfActive}`
    return `${halfBase} ${halfIdle}`
  }

  function resultBadgeClass(r?: 'win' | 'loss' | 'push' | null) {
    return r === 'win'
      ? 'bg-green-500/20 text-green-500'
      : r === 'loss'
      ? 'bg-red-500/20 text-red-500'
      : 'bg-zinc-500/20 text-zinc-400'
  }

  return (
    <Card
      className={`transition-all duration-300 bg-zinc-900 border-zinc-800 relative ${
  isLocked && !anySelected ? 'opacity-50' : 'opacity-100'
}`}
    >
      <CardContent className="px-2 pt-1.5 pb-2">
        {isLocked && anySelected && (
          <Lock className="absolute top-1.5 right-2 w-3 h-3 text-green-500/60" />
        )}

        {/* Header row */}
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[9px] font-black text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase flex items-center gap-1">
            {(isHistorical || hasStarted) && <Clock className="w-3 h-3" />}
            {game.time ?? game.status}
          </span>

          <div className="flex gap-1">
            {favPick?.result && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${resultBadgeClass(favPick.result)}`}>
                {favTeam}: {favPick.result.toUpperCase()}
              </span>
            )}
            {dogPick?.result && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${resultBadgeClass(dogPick.result)}`}>
                {dogTeam}: {dogPick.result.toUpperCase()}
              </span>
            )}
          </div>
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

        {/* "Needed to win" summary for selected picks on non-final games */}
        {game.status !== 'final' && [favPick, dogPick].map(pick => {
          if (!pick) return null
          const pickedFavorite = pick.team_selected === favTeam
          const absSpread = Math.abs(game.spread)
          const effectiveLine = pickedFavorite ? CUSHION - absSpread : absSpread + CUSHION
          const neededDesc = pickedFavorite
            ? effectiveLine > 0
              ? `Can lose by up to ${effectiveLine}, or win`
              : effectiveLine === 0
              ? `Must not lose`
              : `Must win by ${Math.abs(effectiveLine)}+`
            : `Can lose by up to ${effectiveLine - 1}, or win`
          const role = pickedFavorite ? 'FAV' : 'DOG'
          return (
            <div key={pick.team_selected} className="mt-2 px-1 flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-green-500/70">
                {pick.team_selected} <span className="text-zinc-700">·</span> {role}
              </span>
              <span className="text-[9px] text-zinc-400">{neededDesc}</span>
            </div>
          )
        })}

        {/* Result breakdown for completed picked games — one per selected side */}
        {game.status === 'final' && [favPick, dogPick].map(pick => {
          if (!pick?.result) return null
          const bd = getBreakdown(game, pick.team_selected)
          if (!bd) return null
          const color = pick.result === 'win' ? 'text-green-400' : pick.result === 'loss' ? 'text-red-400' : 'text-zinc-400'
          return (
            <div key={pick.team_selected} className="mt-3 pt-3 border-t border-zinc-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  {pick.team_selected} <span className="text-zinc-700">·</span> {bd.role}
                </span>
                <span className="text-[9px] text-zinc-600">Needed: {bd.neededDesc}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono text-zinc-500">{bd.score}</span>
                <span className={`text-[9px] font-black uppercase ${color}`}>
                  {bd.marginDesc} → {pick.result.toUpperCase()}
                </span>
              </div>
            </div>
          )
        })}

        {/* Scores only (no pick) for non-selected final games */}
        {game.status === 'final' && game.home_score != null && !anySelected && (
          <div className="mt-2 text-[10px] font-mono text-zinc-500">
            {game.home_team} {game.home_score} — {game.away_team} {game.away_score}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
