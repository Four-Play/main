"use client"
import React from 'react'
import { Badge } from "@/components/ui/badge"
import { GameCard } from '@/components/picks/GameCard'
import { WeekSwitcher } from '@/components/picks/WeekSwitcher'
import { Loader2 } from "lucide-react"
import type { Game, Pick } from '@/types/database'
import { ACTIVE_SPORT, SPORT_CONFIG, getWeekLabel } from '@/lib/weekUtils'
import { SEASON_WEEKS, getPlaceholderCount } from '@/config/season'
import { GameCardPlaceholder } from '@/components/picks/GameCardPlaceholder'

const activeSport = SPORT_CONFIG[ACTIVE_SPORT]

interface PicksTabProps {
  selectedWeek: number
  setSelectedWeek: (week: number) => void
  currentWeek: number
  games: Game[]
  gamesLoading: boolean
  selectedPicks: Set<string>      // Set of game IDs
  picksMap: Map<string, Pick>     // gameId -> Pick (has result for historical)
  onTogglePick: (gameId: string, teamSelected: string) => void
}

export function PicksTab({
  selectedWeek,
  setSelectedWeek,
  currentWeek,
  games,
  gamesLoading,
  selectedPicks,
  picksMap,
  onTogglePick,
}: PicksTabProps) {
  const isHistorical = selectedWeek < currentWeek
  const isFuture = selectedWeek > currentWeek

  // Show all rounds from the season config — future rounds show placeholders until games are set
  const weeks = SEASON_WEEKS.map(w => w.week)

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-green-500">{activeSport.displayName}</p>
        <p className="text-[9px] text-zinc-500 mt-0.5">{activeSport.tagline}</p>
      </div>

      {ACTIVE_SPORT === 'basketball_nba' && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">2026 NFL Season</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">September 9th — coming soon</p>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-500 px-2 py-1 rounded">
            Soon
          </span>
        </div>
      )}

      <WeekSwitcher
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
        weeks={weeks}
        getLabel={(w) => getWeekLabel(w, ACTIVE_SPORT)}
      />

      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            {isHistorical ? 'Past Results' : isFuture ? 'Coming Soon' : 'Live Slate'}
          </h2>
          {activeSport.weekLabels && (
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">
              {getWeekLabel(selectedWeek, ACTIVE_SPORT)}
            </p>
          )}
        </div>
        {isHistorical && (
          <Badge className="bg-zinc-800 text-green-500 border-none text-[9px]">
            COMPLETED
          </Badge>
        )}
        {!isHistorical && !isFuture && (
          <Badge className="bg-green-500/10 text-green-500 border-none text-[9px]">
            {selectedPicks.size}/4 SELECTED
          </Badge>
        )}
      </div>

      {gamesLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
        </div>
      ) : games.length === 0 ? (
        // No matchups yet — show TBD placeholder cards
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 px-1 pb-1">
            Matchups TBD
          </p>
          {Array.from({ length: getPlaceholderCount(selectedWeek) }).map((_, i) => (
            <GameCardPlaceholder key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {games.map((game) => {
            const pick = picksMap.get(game.id)
            const isSelected = selectedPicks.has(game.id)
            const result = pick?.result

            const selectedTeam = picksMap.get(game.id)?.team_selected

            return (
              <GameCard
                key={game.id}
                game={game}
                isSelected={isSelected}
                isHistorical={isHistorical}
                result={result}
                onSelect={onTogglePick}
                selectedTeam={selectedTeam}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
