"use client"
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
  picksMap: Map<string, Pick>     // `${gameId}|${team}` -> Pick
  onTogglePick: (gameId: string, teamSelected: string) => void
  disableInteraction?: boolean
  editBarMode?: 'locked' | 'editing' | null
  savedPickCount?: number
  onEditPicks?: () => void
}

export function PicksTab({
  selectedWeek,
  setSelectedWeek,
  currentWeek,
  games,
  gamesLoading,
  picksMap,
  onTogglePick,
  disableInteraction = false,
  editBarMode = null,
  savedPickCount = 0,
  onEditPicks,
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
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {editBarMode === 'locked' && savedPickCount >= 4 ? (
                <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 text-[9px]">
                  ✓ SUBMITTED
                </Badge>
              ) : editBarMode === 'locked' && savedPickCount < 4 ? (
                <Badge className="bg-zinc-800 text-zinc-400 border-none text-[9px]">
                  {savedPickCount}/4 PICKS MADE
                </Badge>
              ) : (
                <Badge className="bg-green-500/10 text-green-500 border-none text-[9px]">
                  {picksMap.size}/4 SELECTED
                </Badge>
              )}
              {editBarMode && (
                <button
                  onClick={onEditPicks}
                  className="text-[11px] font-black uppercase tracking-widest text-green-500 border border-green-500/40 px-3 py-1 rounded-full hover:bg-green-500/10 transition-colors"
                >
                  {editBarMode === 'locked' ? 'EDIT' : 'DONE'}
                </button>
              )}
            </div>
            {editBarMode === 'locked' && savedPickCount > 0 && (
              <div className="flex gap-2">
                {Array.from(picksMap.values())
                  .sort((a, b) => {
                    const at = a.game?.commence_time ? new Date(a.game.commence_time).getTime() : 0
                    const bt = b.game?.commence_time ? new Date(b.game.commence_time).getTime() : 0
                    return at - bt
                  })
                  .map(p => (
                    <span key={p.game_id} className="text-[8px] font-black uppercase text-zinc-500 tracking-wide">
                      {p.team_selected.split(' ').pop()}
                    </span>
                  ))}
              </div>
            )}
          </div>
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
            const favTeam = game.fav ?? game.favorite_team
            const dogTeam = game.dog ?? game.underdog_team
            const favPick = favTeam ? picksMap.get(`${game.id}|${favTeam}`) : undefined
            const dogPick = dogTeam ? picksMap.get(`${game.id}|${dogTeam}`) : undefined

            return (
              <GameCard
                key={game.id}
                game={game}
                favPick={favPick}
                dogPick={dogPick}
                isHistorical={isHistorical}
                onSelect={onTogglePick}
                disableInteraction={disableInteraction}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
