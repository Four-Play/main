"use client"
import React from 'react'
import { Badge } from "@/components/ui/badge"
import { GameCard } from '@/components/picks/GameCard'
import { WeekSwitcher } from '@/components/picks/WeekSwitcher'
import { CheckCircle2, Lock, Loader2 } from "lucide-react"
import type { Game, Pick } from '@/types/database'

interface PicksTabProps {
  selectedWeek: number
  setSelectedWeek: (week: number) => void
  currentWeek: number
  games: Game[]
  gamesLoading: boolean
  selectedPicks: Set<string>      // Set of game IDs
  picksMap: Map<string, Pick>     // gameId -> Pick (has result for historical)
  onTogglePick: (gameId: string, teamSelected: string) => void
  isLocked: boolean
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
  isLocked,
}: PicksTabProps) {
  const isHistorical = selectedWeek < currentWeek

  // Build week numbers for switcher (current and past weeks)
  const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1)

  return (
    <div className="space-y-5">
      <WeekSwitcher
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
        weeks={weeks}
      />

      {isLocked && !isHistorical && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-1">
              <CheckCircle2 className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Picks Confirmed</p>
              <p className="text-[9px] text-zinc-500 uppercase">Week {selectedWeek} is locked in</p>
            </div>
          </div>
          <Lock className="w-4 h-4 text-zinc-700" />
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {isHistorical ? 'Past Results' : 'Live Slate'}
        </h2>
        {isHistorical && (
          <Badge className="bg-zinc-800 text-green-500 border-none text-[9px]">
            COMPLETED
          </Badge>
        )}
        {!isHistorical && !isLocked && (
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
        <div className="flex flex-col items-center py-16 gap-2 text-zinc-600">
          <p className="text-[10px] font-black uppercase tracking-widest">No games found</p>
          <p className="text-[9px] uppercase">Week {selectedWeek} games will appear here</p>
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
                disabled={isLocked}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
