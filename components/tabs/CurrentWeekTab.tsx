"use client"
import { useEffect, useRef, useState } from 'react'
import { getWeekLabel, ACTIVE_SPORT } from '@/lib/weekUtils'
import type { LeagueMember, WeekSummary } from '@/types/database'

interface PickChartWeek {
  week: number
  games: Array<{
    id: string
    commence_time: string
    favorite_team: string
    underdog_team: string
    spread: number
    status: string
  }>
  picks: Array<{
    user_id: string
    game_id: string
    team_selected: string
    result: string | null
  }>
}

interface CurrentWeekTabProps {
  currentLeague: string | null
  currentWeek: number
  currentYear: number
  accessToken: string | null
}

function teamMascot(name: string): string {
  if (!name) return '?'
  return name.trim().split(' ').pop() ?? '?'
}

function adjSpreadStr(spread: number, pickedFav: boolean): string {
  const adj = pickedFav ? spread + 13 : Math.abs(spread) + 13
  const sign = adj >= 0 ? '+' : ''
  return `${sign}${Number.isInteger(adj) ? adj : adj.toFixed(1)}`
}

export function CurrentWeekTab({
  currentLeague,
  currentWeek,
  currentYear,
  accessToken,
}: CurrentWeekTabProps) {
  const [members, setMembers] = useState<LeagueMember[]>([])
  const [weekSummaries, setWeekSummaries] = useState<WeekSummary[]>([])
  const [weeklyPickCharts, setWeeklyPickCharts] = useState<PickChartWeek[]>([])
  const [weekTracker, setWeekTracker] = useState<{
    loserCount: number
    survivorCount: number
    totalMembers: number
    stake: number
    penaltyPerLoss: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'results' | 'split'>('results')
  const [refreshKey, setRefreshKey] = useState(0)
  const hiddenAtRef = useRef<number>(0)

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
      } else if (Date.now() - hiddenAtRef.current > 30_000) {
        setRefreshKey(k => k + 1)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    if (!currentLeague) { setLoading(false); return }

    let active = true
    const controller = new AbortController()
    const timeout = setTimeout(() => { if (active) setLoading(false) }, 8000)
    const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}

    fetch(
      `/api/league-tab?leagueId=${currentLeague}&year=${currentYear}&week=${currentWeek}`,
      { headers, signal: controller.signal }
    )
      .then(res => res.json())
      .then(data => {
        if (!active) return
        if (data.members) setMembers(data.members)
        if (data.weekSummaries) setWeekSummaries(data.weekSummaries)
        if (data.weeklyPickCharts) setWeeklyPickCharts(data.weeklyPickCharts)
        if (data.weekTracker) setWeekTracker(data.weekTracker)
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false) })

    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [currentLeague, currentYear, currentWeek, accessToken, refreshKey])

  if (!currentLeague) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
        <p className="text-zinc-500 text-[12px] uppercase tracking-widest font-bold leading-relaxed">
          No league yet!{'\n'}Join a league to start!
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('results')}
          className={`flex-1 py-2 rounded-xl text-[11px] font-black tracking-widest transition-all ${
            activeView === 'results'
              ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          RESULTS
        </button>
        <button
          onClick={() => setActiveView('split')}
          className={`flex-1 py-2 rounded-xl text-[11px] font-black tracking-widest transition-all ${
            activeView === 'split'
              ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          PICK SPLIT
        </button>
      </div>

      {/* League-wide Week Tracker */}
      {weekTracker && weekTracker.totalMembers > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Week Tracker</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${Math.round((weekTracker.loserCount / weekTracker.totalMembers) * 100)}%` }}
                />
              </div>
            </div>
            <span className={`text-[11px] font-black whitespace-nowrap ${weekTracker.loserCount > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
              {weekTracker.loserCount} / {weekTracker.totalMembers} lost
            </span>
          </div>
          {weekTracker.loserCount === 0 ? (
            <p className="text-[11px] text-zinc-500 leading-relaxed">No losers yet this week.</p>
          ) : (
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              If nobody else loses, each loser owes{' '}
              <span className="text-white font-black">{(weekTracker.penaltyPerLoss / 100).toFixed(0)} pts</span>
              {' '}({weekTracker.survivorCount} survivor{weekTracker.survivorCount === 1 ? '' : 's'} × {(weekTracker.stake / 100).toFixed(0)} pts stake).
            </p>
          )}
        </div>
      )}

      {activeView === 'results' ? (
        // ── Results view ──────────────────────────────────────────────────────
        <div className="space-y-5">
          {weeklyPickCharts.map(chart => {
            const { week, games, picks } = chart
            const gamesById = new Map(games.map(g => [g.id, g]))
            const now = new Date()

            return (
              <div key={week} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    {getWeekLabel(week, ACTIVE_SPORT)}
                  </h3>
                  {week === currentWeek && (
                    <span className="text-[9px] font-black bg-green-500/15 text-green-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Current
                    </span>
                  )}
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center py-1.5 px-3 border-b border-zinc-800">
                    <div className="w-[22%]" />
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="flex-1 text-center text-[9px] font-black text-zinc-600 uppercase tracking-widest">{n}</div>
                    ))}
                    <div className="w-[20%] text-right text-[9px] font-black text-zinc-600 uppercase tracking-widest pr-0.5">Result</div>
                  </div>

                  {members.map((member, idx) => {
                    const weeklySummary = weekSummaries.find(s => s.week === week)
                    const winResult = weeklySummary?.winners.find(r => r.user_id === member.user_id)
                    const lossResult = weeklySummary?.losers.find(r => r.user_id === member.user_id)

                    const enriched = picks
                      .filter(p => p.user_id === member.user_id)
                      .reduce<Array<any>>((acc, p) => {
                        const game = gamesById.get(p.game_id)
                        if (game) acc.push({ ...p, game })
                        return acc
                      }, [])
                      .sort((a, b) => new Date(a.game.commence_time).getTime() - new Date(b.game.commence_time).getTime())

                    const slots: any[] = [...enriched, null, null, null, null].slice(0, 4)

                    return (
                      <div
                        key={member.user_id}
                        className={`flex items-center py-2.5 px-3 ${idx < members.length - 1 ? 'border-b border-zinc-900' : ''}`}
                      >
                        <div className="w-[22%] pr-1">
                          <span className="text-[11px] font-bold uppercase text-white truncate block">
                            {(member.profile?.username ?? 'Player').substring(0, 8)}
                          </span>
                        </div>

                        {slots.map((slot, pickIdx) => {
                          if (!slot || new Date(slot.game.commence_time) > now) {
                            return (
                              <div key={pickIdx} className="flex-1 flex items-center justify-center">
                                <span className="text-zinc-800 text-[12px] font-mono">—</span>
                              </div>
                            )
                          }

                          const pickedFav = slot.team_selected === slot.game.favorite_team
                          const mascot = teamMascot(slot.team_selected)
                          const spreadStr = adjSpreadStr(slot.game.spread, pickedFav)
                          const color = slot.result === 'win' ? 'text-green-500' : slot.result === 'loss' ? 'text-red-500' : 'text-white'
                          const subColor = slot.result === 'win' ? 'text-green-500/70' : slot.result === 'loss' ? 'text-red-500/70' : 'text-zinc-500'

                          return (
                            <div key={pickIdx} className="flex-1 flex flex-col items-center">
                              <span className={`text-[10px] font-black uppercase leading-tight ${color}`}>{mascot}</span>
                              <span className={`text-[9px] font-mono leading-tight ${subColor}`}>{spreadStr}</span>
                            </div>
                          )
                        })}

                        <div className="w-[20%] flex flex-col items-end pr-0.5">
                          {winResult ? (
                            <>
                              <span className="text-[10px] font-black text-green-500 leading-tight">+{(winResult.amount_won_cents / 100).toFixed(0)}</span>
                              <span className="text-[7px] text-green-500/60 leading-tight uppercase">pts</span>
                            </>
                          ) : lossResult ? (
                            <>
                              <span className="text-[10px] font-black text-red-500 leading-tight">-{(lossResult.amount_owed_cents / 100).toFixed(0)}</span>
                              <span className="text-[7px] text-red-500/60 leading-tight uppercase">pts</span>
                            </>
                          ) : (
                            <span className="text-zinc-800 text-[12px] font-mono">—</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {weeklyPickCharts.length === 0 && (
            <div className="flex flex-col items-center py-12 text-zinc-600">
              <p className="text-[11px] font-black uppercase tracking-widest">No picks yet this season</p>
            </div>
          )}
        </div>
      ) : (
        // ── Pick Split view ───────────────────────────────────────────────────
        <div className="space-y-5">
          {weeklyPickCharts.map(chart => {
            const { week, games, picks } = chart
            const now = new Date()
            const sorted = [...games].sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())

            return (
              <div key={week} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    {getWeekLabel(week, ACTIVE_SPORT)}
                  </h3>
                  {week === currentWeek && (
                    <span className="text-[9px] font-black bg-green-500/15 text-green-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Current
                    </span>
                  )}
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                  {sorted.map((game, idx) => {
                    const revealed = new Date(game.commence_time) <= now
                    const isLast = idx === sorted.length - 1

                    if (!revealed) {
                      return (
                        <div key={game.id} className={`px-4 py-3 flex items-center justify-between ${!isLast ? 'border-b border-zinc-900' : ''}`}>
                          <span className="text-[11px] font-black uppercase text-zinc-600">
                            {teamMascot(game.favorite_team)} vs {teamMascot(game.underdog_team)}
                          </span>
                          <span className="text-[10px] text-zinc-700 uppercase font-bold tracking-wider">Locks at kickoff</span>
                        </div>
                      )
                    }

                    const favPicks = picks.filter(p => p.game_id === game.id && p.team_selected === game.favorite_team).length
                    const dogPicks = picks.filter(p => p.game_id === game.id && p.team_selected === game.underdog_team).length
                    const total = favPicks + dogPicks
                    const favPct = total > 0 ? (favPicks / total) * 100 : 50
                    const dogPct = total > 0 ? (dogPicks / total) * 100 : 50
                    const statusLabel = game.status === 'final' ? 'FINAL' : game.status === 'live' ? 'LIVE' : ''

                    return (
                      <div key={game.id} className={`px-4 py-3 space-y-2 ${!isLast ? 'border-b border-zinc-900' : ''}`}>
                        {/* Matchup header */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-white">{teamMascot(game.favorite_team)}</span>
                          {statusLabel && (
                            <span className={`text-[9px] font-black uppercase tracking-wider ${game.status === 'live' ? 'text-green-500' : 'text-zinc-500'}`}>
                              {statusLabel}
                            </span>
                          )}
                          <span className="text-[11px] font-black uppercase text-white">{teamMascot(game.underdog_team)}</span>
                        </div>

                        {/* Split bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-black text-white w-5 text-right">{favPicks}</span>
                          <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden flex">
                            <div className="h-full bg-zinc-300 transition-all" style={{ width: `${favPct}%` }} />
                            <div className="h-full bg-zinc-600 transition-all" style={{ width: `${dogPct}%` }} />
                          </div>
                          <span className="text-[12px] font-black text-white w-5">{dogPicks}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {weeklyPickCharts.length === 0 && (
            <div className="flex flex-col items-center py-12 text-zinc-600">
              <p className="text-[11px] font-black uppercase tracking-widest">No picks yet this season</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
