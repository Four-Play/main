"use client"
import { Badge } from "@/components/ui/badge"
import { GameCard } from '@/components/picks/GameCard'
import { WeekSwitcher } from '@/components/picks/WeekSwitcher'
import { Loader2 } from "lucide-react"
import type { Game, Pick } from '@/types/database'
import { ACTIVE_SPORT, SPORT_CONFIG, getWeekLabel, getSeasonWeeks, getPlayoffRules } from '@/lib/weekUtils'
import { getPlaceholderCount } from '@/config/season'
import { GameCardPlaceholder } from '@/components/picks/GameCardPlaceholder'

function getPickBarColor(pick: Pick, cushion: number): string {
  const game = pick.game
  const isFinal = game?.status === 'final'

  if (isFinal) {
    return pick.result === 'win' ? 'bg-green-600' : 'bg-red-600'
  }

  const isOU = pick.team_selected === 'OVER' || pick.team_selected === 'UNDER'
  let winning: boolean

  if (isOU) {
    if (game?.total == null) {
      winning = true
    } else {
      const actual = (game.home_score ?? 0) + (game.away_score ?? 0)
      winning = pick.team_selected === 'OVER'
        ? actual > game.total - cushion
        : actual < game.total + cushion
    }
  } else {
    if (!game) {
      winning = true
    } else {
      const favTeam = game.fav ?? game.favorite_team
      const pickedFavorite = pick.team_selected === favTeam
      const homeMargin = (game.home_score ?? 0) - (game.away_score ?? 0)
      const pickedMargin = pick.team_selected === game.home_team ? homeMargin : -homeMargin
      winning = pickedFavorite
        ? pickedMargin > -(cushion - Math.abs(game.spread))
        : pickedMargin > -(Math.abs(game.spread) + cushion)
    }
  }

  return winning ? 'bg-green-500/30' : 'bg-red-500/30'
}

interface WeekTracker {
  loserCount: number
  survivorCount: number
  totalWithPicks: number
  totalMembers: number
  stake: number          // in "cents" (×100) — display as stake/100
  userIsLoser: boolean
  userHasPicks: boolean
  userSubmitted: boolean
  userProjected: number  // in "cents" — positive = win, negative = loss
  penaltyPerLoss: number // in "cents"
}

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
  weekTracker?: WeekTracker | null
  sport?: string
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
  weekTracker = null,
  sport = ACTIVE_SPORT,
}: PicksTabProps) {
  const activeSport = SPORT_CONFIG[sport] ?? SPORT_CONFIG[ACTIVE_SPORT]
  const PLAYOFF_RULES = getPlayoffRules(sport)
  const SEASON_WEEKS = getSeasonWeeks(sport)

  const isHistorical = selectedWeek < currentWeek
  const isFuture = selectedWeek > currentWeek
  const playoffRule = PLAYOFF_RULES[selectedWeek]
  const maxPicks = playoffRule?.picksRequired ?? 4
  const cushion = playoffRule?.cushion ?? 13

  // Show all rounds from the season config — future rounds show placeholders until games are set
  const weeks = SEASON_WEEKS.map(w => w.week)

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-green-500">{activeSport.displayName}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{activeSport.tagline}</p>
      </div>

<WeekSwitcher
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
        weeks={weeks}
        getLabel={(w) => getWeekLabel(w, sport)}
      />

      {/* Live Week Tracker — personal projection, current week only */}
      {!isHistorical && !isFuture && weekTracker && weekTracker.userSubmitted && (
        <div className={`rounded-xl border px-4 py-3 ${
          weekTracker.userIsLoser
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-zinc-900 border-zinc-800'
        }`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
            weekTracker.userIsLoser ? 'text-red-500' : 'text-zinc-500'
          }`}>
            Week Tracker
          </p>
          {weekTracker.loserCount === 0 ? (
            <p className="text-[14px] font-black leading-tight text-zinc-400">
              No losers yet
            </p>
          ) : (
            <>
              <p className={`text-[14px] font-black leading-tight ${
                weekTracker.userIsLoser ? 'text-red-400' : 'text-green-400'
              }`}>
                {weekTracker.userIsLoser
                  ? `−${Math.abs(weekTracker.userProjected / 100).toFixed(0)} pts`
                  : `+${(weekTracker.userProjected / 100).toFixed(0)} pts`
                }
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                {weekTracker.userIsLoser
                  ? `You have a losing pick. If the other ${weekTracker.survivorCount} player${weekTracker.survivorCount === 1 ? '' : 's'} win, you'd owe ${Math.abs(weekTracker.userProjected / 100).toFixed(0)} pts.`
                  : `${weekTracker.loserCount} player${weekTracker.loserCount === 1 ? ' has' : 's have'} lost so far. If nobody else loses, you'd earn ${(weekTracker.userProjected / 100).toFixed(0)} pts.`
                }
              </p>
            </>
          )}
        </div>
      )}

      {!isHistorical && !isFuture && editBarMode === 'locked' && savedPickCount > 0 && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
          <div className="flex gap-1.5">
            {(() => {
              const sorted = Array.from(picksMap.values()).sort((a, b) => {
                const at = a.game?.commence_time ? new Date(a.game.commence_time).getTime() : 0
                const bt = b.game?.commence_time ? new Date(b.game.commence_time).getTime() : 0
                return at - bt
              })
              const slots: (typeof sorted[0] | null)[] = [
                ...sorted,
                ...Array(Math.max(0, maxPicks - sorted.length)).fill(null),
              ].slice(0, maxPicks)

              return slots.map((p, idx) => {
                if (!p) {
                  return (
                    <div key={idx} className="flex-1 h-11 rounded-lg border border-dashed border-zinc-700 flex items-center justify-center">
                      <span className="text-[15px] text-zinc-700 font-black leading-none">+</span>
                    </div>
                  )
                }

                const isFinal = p.game?.status === 'final'
                const barColor = getPickBarColor(p, cushion)
                const isGreen = barColor.includes('green')
                const mascot = p.team_selected.split(' ').pop() ?? p.team_selected

                const boxClass = isFinal
                  ? p.result === 'win'
                    ? 'border-green-500/40 bg-green-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                  : isGreen
                    ? 'border-green-500/40 bg-green-500/5'
                    : 'border-red-500/30 bg-red-500/5'

                return (
                  <div key={`${p.game_id}|${p.team_selected}`} className={`flex-1 h-11 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${boxClass}`}>
                    <span className="text-[11px] font-black uppercase text-zinc-300 leading-tight">{mascot}</span>
                    {isFinal ? (
                      <span className={`text-[13px] font-black leading-none ${p.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                        {p.result === 'win' ? '✓' : '✗'}
                      </span>
                    ) : (
                      <div className={`h-1 w-4/5 rounded-full ${barColor}`} />
                    )}
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            {isHistorical ? 'Past Results' : isFuture ? 'Coming Soon' : 'Live Slate'}
          </h2>
          {activeSport.weekLabels && (
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">
              {getWeekLabel(selectedWeek, sport)}
            </p>
          )}
        </div>
        {isHistorical && (
          <Badge className="bg-zinc-800 text-green-500 border-none text-[10px]">
            COMPLETED
          </Badge>
        )}
        {!isHistorical && !isFuture && (
          <div className="flex items-center gap-2">
            {editBarMode === 'locked' && savedPickCount >= maxPicks ? (
              <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 text-[10px]">
                ✓ SUBMITTED
              </Badge>
            ) : editBarMode === 'locked' && savedPickCount < maxPicks ? (
              <Badge className="bg-zinc-800 text-zinc-400 border-none text-[10px]">
                {savedPickCount}/{maxPicks} PICKS MADE
              </Badge>
            ) : (
              <Badge className="bg-green-500/10 text-green-500 border-none text-[10px]">
                {picksMap.size}/{maxPicks} SELECTED
              </Badge>
            )}
            {editBarMode && (
              <button
                onClick={onEditPicks}
                className="text-[12px] font-black uppercase tracking-widest text-green-500 border border-green-500/40 px-3 py-1 rounded-full hover:bg-green-500/10 transition-colors"
              >
                {editBarMode === 'locked' ? 'EDIT' : 'DONE'}
              </button>
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
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-1 pb-1">
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
            const overPick = playoffRule ? picksMap.get(`${game.id}|OVER`) : undefined
            const underPick = playoffRule ? picksMap.get(`${game.id}|UNDER`) : undefined
            const hasKickedOff = game.commence_time ? new Date(game.commence_time) <= new Date() : false

            return (
              <GameCard
                key={game.id}
                game={game}
                favPick={favPick}
                dogPick={dogPick}
                overPick={overPick}
                underPick={underPick}
                isHistorical={isHistorical}
                onSelect={onTogglePick}
                disableInteraction={isFuture || disableInteraction || hasKickedOff}
                cushion={cushion}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
