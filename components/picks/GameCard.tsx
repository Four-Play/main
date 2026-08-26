"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Lock } from "lucide-react"
import Image from 'next/image'
import type { Game, Pick } from '@/types/database'

const NFL_LOGO: Record<string, string> = {
  'Arizona Cardinals':    'https://r2.thesportsdb.com/images/media/team/badge/i1g1wg1784712239.png',
  'Atlanta Falcons':      'https://r2.thesportsdb.com/images/media/team/badge/9ucfd41784714178.png',
  'Baltimore Ravens':     'https://r2.thesportsdb.com/images/media/team/badge/einz3p1546172463.png',
  'Buffalo Bills':        'https://r2.thesportsdb.com/images/media/team/badge/j4r1tn1784714823.png',
  'Carolina Panthers':    'https://r2.thesportsdb.com/images/media/team/badge/kbqini1784716157.png',
  'Chicago Bears':        'https://r2.thesportsdb.com/images/media/team/badge/0m51zd1784716955.png',
  'Cincinnati Bengals':   'https://r2.thesportsdb.com/images/media/team/badge/h1ce8y1784717263.png',
  'Cleveland Browns':     'https://r2.thesportsdb.com/images/media/team/badge/g7qhkz1784717593.png',
  'Dallas Cowboys':       'https://r2.thesportsdb.com/images/media/team/badge/76ew3c1784718447.png',
  'Denver Broncos':       'https://r2.thesportsdb.com/images/media/team/badge/zy3m9v1784718707.png',
  'Detroit Lions':        'https://r2.thesportsdb.com/images/media/team/badge/lgsgkr1546168257.png',
  'Green Bay Packers':    'https://r2.thesportsdb.com/images/media/team/badge/uwbfw01784719173.png',
  'Houston Texans':       'https://r2.thesportsdb.com/images/media/team/badge/o71ce41784719551.png',
  'Indianapolis Colts':   'https://r2.thesportsdb.com/images/media/team/badge/im99lm1784720368.png',
  'Jacksonville Jaguars': 'https://r2.thesportsdb.com/images/media/team/badge/0mrsd41546427902.png',
  'Kansas City Chiefs':   'https://r2.thesportsdb.com/images/media/team/badge/n58gp51784720929.png',
  'Las Vegas Raiders':    'https://r2.thesportsdb.com/images/media/team/badge/4t8xtk1784721179.png',
  'Los Angeles Chargers': 'https://r2.thesportsdb.com/images/media/team/badge/wmi40u1784721460.png',
  'Los Angeles Rams':     'https://r2.thesportsdb.com/images/media/team/badge/ojw15x1784721865.png',
  'Miami Dolphins':       'https://r2.thesportsdb.com/images/media/team/badge/e803xt1784722221.png',
  'Minnesota Vikings':    'https://r2.thesportsdb.com/images/media/team/badge/nyp3ev1784722510.png',
  'New England Patriots': 'https://r2.thesportsdb.com/images/media/team/badge/xtwxyt1421431860.png',
  'New Orleans Saints':   'https://r2.thesportsdb.com/images/media/team/badge/nd46c71537821337.png',
  'New York Giants':      'https://r2.thesportsdb.com/images/media/team/badge/i9muak1784751331.png',
  'New York Jets':        'https://r2.thesportsdb.com/images/media/team/badge/6bnwoc1784751677.png',
  'Philadelphia Eagles':  'https://r2.thesportsdb.com/images/media/team/badge/pnpybf1515852421.png',
  'Pittsburgh Steelers':  'https://r2.thesportsdb.com/images/media/team/badge/2975411515853129.png',
  'San Francisco 49ers':  'https://r2.thesportsdb.com/images/media/team/badge/bqbtg61539537328.png',
  'Seattle Seahawks':     'https://r2.thesportsdb.com/images/media/team/badge/1t84c51784752684.png',
  'Tampa Bay Buccaneers': 'https://r2.thesportsdb.com/images/media/team/badge/2dfpdl1537820969.png',
  'Tennessee Titans':     'https://r2.thesportsdb.com/images/media/team/badge/3td0f41779180767.png',
  'Washington Commanders':'https://r2.thesportsdb.com/images/media/team/badge/rn0c7v1643826119.png',
}

function teamLogoUrl(teamName?: string): string | null {
  if (!teamName) return null
  return NFL_LOGO[teamName] ?? null
}

/** Returns display strings for the result breakdown — no logic changes, purely cosmetic */
function getBreakdown(game: Game, selectedTeam: string, cushion: number) {
  if (game.home_score == null || game.away_score == null || !game.home_team || !game.away_team) return null

  const favTeam = game.fav ?? game.favorite_team
  const pickedFavorite = selectedTeam === favTeam
  const pickedIsHome = selectedTeam === game.home_team
  const homeMargin = game.home_score - game.away_score
  const pickedMargin = pickedIsHome ? homeMargin : -homeMargin
  const absSpread = Math.abs(game.spread)

  // Effective cushioned line — mirrors the threshold in lib/scoring.ts
  // Fav: cushion - |spread|  (e.g. 13 - 7 = +6, fav can lose by up to 5)
  // Dog: |spread| + cushion  (e.g. 7 + 13 = +20, dog can lose by up to 19)
  // Both: adjusted +N → lose by ceil(N) or more = loss; max integer win = ceil(N)-1
  const effectiveLine = pickedFavorite ? cushion - absSpread : absSpread + cushion

  // For half-point lines, ceil to the next integer threshold (e.g. +2.5 → "Not lose by 3+")
  const neededDesc = pickedFavorite
    ? effectiveLine > 0
      ? `Not lose by ${Math.ceil(effectiveLine)}+`
      : `Win by ${Math.floor(Math.abs(effectiveLine)) + 1}+`
    : `Not lose by ${Math.ceil(effectiveLine)}+`

  const marginDesc = pickedMargin > 0
    ? `Won by ${pickedMargin}`
    : pickedMargin < 0
    ? `Lost by ${Math.abs(pickedMargin)}`
    : `Lost by 0`

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
  overPick?: Pick
  underPick?: Pick
  isHistorical: boolean
  onSelect: (id: string, teamSelected: string) => void
  disableInteraction?: boolean
  cushion?: number
}

export function GameCard({ game, favPick, dogPick, overPick, underPick, isHistorical, onSelect, disableInteraction = false, cushion = 13 }: GameCardProps) {
  const favTeam = game.fav ?? game.favorite_team
  const dogTeam = game.dog ?? game.underdog_team
  const favCushion = game.spread + cushion
  const dogCushion = Math.abs(game.spread) + cushion
  const hasStarted = game.commence_time ? new Date(game.commence_time) < new Date() : false

  const favSelected = !!favPick
  const dogSelected = !!dogPick
  const overSelected = !!overPick
  const underSelected = !!underPick
  const anySelected = favSelected || dogSelected || overSelected || underSelected

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

  function resultBadgeClass(r?: 'win' | 'loss' | null) {
    return r === 'win'
      ? 'bg-green-500/20 text-green-500'
      : r === 'loss'
      ? 'bg-red-500/20 text-red-500'
      : 'bg-zinc-500/20 text-zinc-400'
  }

  return (
    <Card
      className={`transition-all duration-300 relative ${
        game.status === 'live'
          ? 'bg-green-500/5 border-green-500/40'
          : 'bg-zinc-900 border-zinc-800'
      } ${isLocked && !anySelected ? 'opacity-50' : 'opacity-100'}`}
    >
      <CardContent className="px-2 pt-0.5 pb-1">
        {isLocked && anySelected && (
          <Lock className="absolute top-1.5 right-2 w-3 h-3 text-green-500/60" />
        )}

        {/* Header row */}
        {(() => {
          const isLive = game.status === 'live'
          return (
            <div className="flex justify-between items-center mb-1.5">
              {isLive ? (
                <span className="text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="text-[10px] font-black text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                  {(isHistorical || hasStarted) && <Clock className="w-3 h-3" />}
                  {game.time ?? game.status}
                </span>
              )}

              <div className="flex gap-1">
                {favPick?.result && (
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded ${resultBadgeClass(favPick.result)}`}>
                    {favTeam}: {favPick.result.toUpperCase()}
                  </span>
                )}
                {dogPick?.result && (
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded ${resultBadgeClass(dogPick.result)}`}>
                    {dogTeam}: {dogPick.result.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          )
        })()}

        {/* Live score */}
        {game.status === 'live' && game.home_score != null && game.away_score != null && (
          <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-1.5">
            <div className="flex items-center gap-2">
              {teamLogoUrl(game.home_team) && (
                <Image src={teamLogoUrl(game.home_team)!} alt="" width={28} height={28} className="object-contain" unoptimized />
              )}
              <span className="text-[12px] font-black text-zinc-300 uppercase">{game.home_team?.split(' ').pop()}</span>
            </div>
            <span className="text-[18px] font-black font-mono text-white tracking-tight">
              {game.home_score} – {game.away_score}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-black text-zinc-300 uppercase">{game.away_team?.split(' ').pop()}</span>
              {teamLogoUrl(game.away_team) && (
                <Image src={teamLogoUrl(game.away_team)!} alt="" width={28} height={28} className="object-contain" unoptimized />
              )}
            </div>
          </div>
        )}

        {/* Two-half team selector */}
        <div className={`flex gap-2 ${isInteractionDisabled ? 'pointer-events-none' : ''}`}>
          <button
            className={halfClass(favSelected)}
            onClick={() => favTeam && onSelect(game.id, favTeam)}
          >
            <p className="font-bold text-sm text-white uppercase leading-tight">{favTeam}</p>
            <div className="mt-1.5 space-y-0.5">
              <p className="text-[11px] font-mono leading-tight">
                <span className="text-zinc-500">Spread: </span>
                <span className="text-red-400">{game.spread > 0 ? '+' : ''}{game.spread}</span>
              </p>
              <p className="text-[11px] font-mono leading-tight">
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
              <p className="text-[11px] font-mono leading-tight">
                <span className="text-zinc-500">Spread: </span>
                <span className="text-green-400">+{Math.abs(game.spread)}</span>
              </p>
              <p className="text-[11px] font-mono leading-tight">
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
          const effectiveLine = pickedFavorite ? cushion - absSpread : absSpread + cushion
          // Max integer loss: largest whole number strictly less than effectiveLine
          // e.g. +3 → lose by 2 max; +3.5 → lose by 3 max (not 2.5)
          const maxLoss = Math.ceil(effectiveLine) - 1
          const neededDesc = pickedFavorite
            ? maxLoss > 0
              ? `Can lose by up to ${maxLoss}, or win`
              : maxLoss === 0
              ? `Must not lose`
              : `Must win by ${-maxLoss}+`
            : `Can lose by up to ${maxLoss}, or win`
          const role = pickedFavorite ? 'FAV' : 'DOG'
          return (
            <div key={pick.team_selected} className="mt-2 px-1 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500/70">
                {pick.team_selected} <span className="text-zinc-700">·</span> {role}
              </span>
              <span className="text-[10px] text-zinc-400">{neededDesc}</span>
            </div>
          )
        })}

        {/* O/U section — shown for playoff games that have a total set */}
        {game.total != null && (
          <>
            <div className="mt-2 mb-1 flex items-center gap-2">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Over / Under</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className={`flex gap-2 ${isInteractionDisabled ? 'pointer-events-none' : ''}`}>
              <button
                className={halfClass(overSelected)}
                onClick={() => onSelect(game.id, 'OVER')}
              >
                <p className="font-bold text-sm text-white uppercase leading-tight">OVER</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[11px] font-mono leading-tight">
                    <span className="text-zinc-500">Total: </span>
                    <span className="text-zinc-300">{game.total}</span>
                  </p>
                  <p className="text-[11px] font-mono leading-tight">
                    <span className="text-zinc-500">Win if &gt; </span>
                    <span className="text-green-400">{game.total - cushion}</span>
                  </p>
                </div>
              </button>
              <button
                className={halfClass(underSelected)}
                onClick={() => onSelect(game.id, 'UNDER')}
              >
                <p className="font-bold text-sm text-white uppercase leading-tight">UNDER</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[11px] font-mono leading-tight">
                    <span className="text-zinc-500">Total: </span>
                    <span className="text-zinc-300">{game.total}</span>
                  </p>
                  <p className="text-[11px] font-mono leading-tight">
                    <span className="text-zinc-500">Win if &lt; </span>
                    <span className="text-green-400">{game.total + cushion}</span>
                  </p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* "Needed to win" summary for O/U picks on non-final playoff games */}
        {game.status !== 'final' && game.total != null && [overPick, underPick].map(pick => {
          if (!pick) return null
          const isOver = pick.team_selected === 'OVER'
          const threshold = isOver ? game.total! - cushion : game.total! + cushion
          const neededDesc = isOver
            ? `Total must reach ${Math.floor(threshold) + (Number.isInteger(threshold) ? 1 : 0)}+`
            : `Total must stay under ${Math.ceil(threshold)}`
          return (
            <div key={pick.team_selected} className="mt-2 px-1 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500/70">
                {pick.team_selected}
              </span>
              <span className="text-[10px] text-zinc-400">{neededDesc}</span>
            </div>
          )
        })}

        {/* Result breakdown for completed picked games — one per selected side */}
        {game.status === 'final' && [favPick, dogPick].map(pick => {
          if (!pick?.result) return null
          const bd = getBreakdown(game, pick.team_selected, cushion)
          if (!bd) return null
          const color = pick.result === 'win' ? 'text-green-400' : pick.result === 'loss' ? 'text-red-400' : 'text-zinc-400'
          return (
            <div key={pick.team_selected} className="mt-3 pt-3 border-t border-zinc-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {pick.team_selected} <span className="text-zinc-700">·</span> {bd.role}
                </span>
                <span className="text-[10px] text-zinc-600">Needed: {bd.neededDesc}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-zinc-500">{bd.score}</span>
                <span className={`text-[10px] font-black uppercase ${color}`}>
                  {bd.marginDesc} → {pick.result.toUpperCase()}
                </span>
              </div>
            </div>
          )
        })}

        {/* Result breakdown for completed O/U picks */}
        {game.status === 'final' && game.total != null && [overPick, underPick].map(pick => {
          if (!pick?.result) return null
          const actualTotal = (game.home_score ?? 0) + (game.away_score ?? 0)
          const isOver = pick.team_selected === 'OVER'
          const threshold = isOver ? game.total! - cushion : game.total! + cushion
          const color = pick.result === 'win' ? 'text-green-400' : 'text-red-400'
          return (
            <div key={pick.team_selected} className="mt-3 pt-3 border-t border-zinc-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {pick.team_selected}
                </span>
                <span className="text-[10px] text-zinc-600">
                  Needed: {isOver ? `> ${threshold}` : `< ${threshold}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-zinc-500">Total: {actualTotal}</span>
                <span className={`text-[10px] font-black uppercase ${color}`}>
                  {pick.result.toUpperCase()}
                </span>
              </div>
            </div>
          )
        })}

        {/* Scores only (no pick) for non-selected final games */}
        {game.status === 'final' && game.home_score != null && !anySelected && (
          <div className="mt-2 text-[11px] font-mono text-zinc-500">
            {game.home_team} {game.home_score} — {game.away_team} {game.away_score}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
