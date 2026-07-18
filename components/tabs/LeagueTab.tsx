"use client"
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Sliders, Users } from "lucide-react"
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

interface LeagueTabProps {
  currentLeague: string
  currentLeagueName: string
  setLeagueSettingsOpen: (open: boolean) => void
  setViewingPlayer: (player: any) => void
  currentWeek: number
  currentYear: number
  accessToken: string | null
}

// Returns the team mascot — last word of the full team name (e.g. "Kansas City Chiefs" → "Chiefs")
function teamMascot(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts[parts.length - 1]
}

// Adjusted spread shown in each pick cell (team's cushioned line)
function adjSpreadStr(spread: number, pickedFav: boolean): string {
  const adj = pickedFav ? spread + 13 : Math.abs(spread) + 13
  const sign = adj >= 0 ? '+' : ''
  return `${sign}${Number.isInteger(adj) ? adj : adj.toFixed(1)}`
}

export function LeagueTab({
  currentLeague,
  currentLeagueName,
  setLeagueSettingsOpen,
  setViewingPlayer,
  currentWeek,
  currentYear,
  accessToken,
}: LeagueTabProps) {
  const [members, setMembers] = useState<LeagueMember[]>([])
  const [weekSummaries, setWeekSummaries] = useState<WeekSummary[]>([])
  const [weeklyPickCharts, setWeeklyPickCharts] = useState<PickChartWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'standings' | 'results'>('standings')
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
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout)
        if (active) setLoading(false)
      })

    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [currentLeague, currentYear, currentWeek, accessToken, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {currentLeagueName}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLeagueSettingsOpen(true)}
          className="h-7 text-[9px] font-black uppercase text-green-500 hover:bg-green-500/10 gap-1.5"
        >
          <Sliders className="w-3 h-3" /> Settings
        </Button>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('standings')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
            activeView === 'standings'
              ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          STANDINGS
        </button>
        <button
          onClick={() => setActiveView('results')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
            activeView === 'results'
              ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          RESULTS
        </button>
      </div>

      {activeView === 'standings' ? (
        <Card className="bg-zinc-950 border-zinc-800 rounded-2xl overflow-hidden">
          <Table>
            <TableBody>
              {members.map((member, idx) => {
                const profile = member.profile
                const name = profile?.username ?? 'Unknown'
                const points = member.league_points
                const avatarUrl = profile?.avatar_url
                return (
                  <TableRow
                    key={member.id}
                    className="border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-colors"
                    onClick={() => setViewingPlayer({ ...member, name })}
                  >
                    <TableCell className="text-zinc-600 font-mono text-xs w-8">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-bold uppercase text-white text-xs tracking-tight">
                      <div className="flex items-center gap-2">
                        <div className="relative w-7 h-7 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex-shrink-0">
                          {avatarUrl ? (
                            <Image
                              src={avatarUrl}
                              alt=""
                              fill
                              sizes="28px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="w-3.5 h-3.5 text-zinc-600" />
                            </div>
                          )}
                        </div>
                        <span>{name}</span>
                        {member.role === 'admin' && (
                          <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 rounded">ADM</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-zinc-500 text-xs">
                      {member.wins}-{member.losses}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-black text-xs ${points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {points >= 0 ? `+${(points / 100).toFixed(0)} pts` : `-${(Math.abs(points) / 100).toFixed(0)} pts`}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        // RESULTS — pick chart, current week first, prior weeks below
        <div className="space-y-5">
          {weeklyPickCharts.map(chart => {
            const { week, games, picks } = chart
            const gamesById = new Map(games.map(g => [g.id, g as PickChartWeek['games'][0]]))
            const now = new Date()

            return (
              <div key={week} className="space-y-2">
                {/* Week label */}
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    {getWeekLabel(week, ACTIVE_SPORT)}
                  </h3>
                  {week === currentWeek && (
                    <span className="text-[8px] font-black bg-green-500/15 text-green-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Current
                    </span>
                  )}
                </div>

                {/* Chart card */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                  {/* Column headers */}
                  <div className="flex items-center py-1.5 px-3 border-b border-zinc-800">
                    <div className="w-[22%]" />
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="flex-1 text-center text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                        {n}
                      </div>
                    ))}
                    <div className="w-[20%] text-right text-[8px] font-black text-zinc-600 uppercase tracking-widest pr-0.5">
                      Result
                    </div>
                  </div>

                  {/* One row per member */}
                  {members.map((member, idx) => {
                    const weeklySummary = weekSummaries.find(s => s.week === week)
                    const winResult = weeklySummary?.winners.find(r => r.user_id === member.user_id)
                    const lossResult = weeklySummary?.losers.find(r => r.user_id === member.user_id)

                    // Get this member's picks for the week, enriched with game data, sorted by start time
                    const enriched = picks
                      .filter(p => p.user_id === member.user_id)
                      .reduce<Array<{ user_id: string; game_id: string; team_selected: string; result: string | null; game: PickChartWeek['games'][0] }>>(
                        (acc, p) => {
                          const game = gamesById.get(p.game_id)
                          if (game) acc.push({ ...p, game })
                          return acc
                        },
                        []
                      )
                      .sort((a, b) => new Date(a.game.commence_time).getTime() - new Date(b.game.commence_time).getTime())

                    // Pad to exactly 4 slots (null = no pick)
                    const slots: (typeof enriched[0] | null)[] = [...enriched, null, null, null, null].slice(0, 4)

                    return (
                      <div
                        key={member.user_id}
                        className={`flex items-center py-2.5 px-3 ${idx < members.length - 1 ? 'border-b border-zinc-900' : ''}`}
                      >
                        {/* Player name */}
                        <div className="w-[22%] pr-1">
                          <span className="text-[10px] font-bold uppercase text-white truncate block">
                            {(member.profile?.username ?? 'Player').substring(0, 8)}
                          </span>
                        </div>

                        {/* 4 pick slots */}
                        {slots.map((slot, pickIdx) => {
                          // No pick or game not found
                          if (!slot) {
                            return (
                              <div key={pickIdx} className="flex-1 flex items-center justify-center">
                                <span className="text-zinc-800 text-[11px] font-mono">—</span>
                              </div>
                            )
                          }

                          // Pick exists but game hasn't started — hide it
                          const revealed = new Date(slot.game.commence_time) <= now
                          if (!revealed) {
                            return (
                              <div key={pickIdx} className="flex-1 flex items-center justify-center">
                                <span className="text-zinc-800 text-[11px] font-mono">—</span>
                              </div>
                            )
                          }

                          const pickedFav = slot.team_selected === slot.game.favorite_team
                          const mascot = teamMascot(slot.team_selected)
                          const spreadStr = adjSpreadStr(slot.game.spread, pickedFav)

                          const color =
                            slot.result === 'win' ? 'text-green-500' :
                            slot.result === 'loss' ? 'text-red-500' :
                            'text-white'

                          const subColor =
                            slot.result === 'win' ? 'text-green-500/70' :
                            slot.result === 'loss' ? 'text-red-500/70' :
                            'text-zinc-500'

                          return (
                            <div key={pickIdx} className="flex-1 flex flex-col items-center">
                              <span className={`text-[9px] font-black uppercase leading-tight ${color}`}>
                                {mascot}
                              </span>
                              <span className={`text-[8px] font-mono leading-tight ${subColor}`}>
                                {spreadStr}
                              </span>
                            </div>
                          )
                        })}

                        {/* Week result — shown once all games are scored */}
                        <div className="w-[20%] flex flex-col items-end pr-0.5">
                          {winResult ? (
                            <>
                              <span className="text-[9px] font-black text-green-500 leading-tight">
                                +{(winResult.amount_won_cents / 100).toFixed(0)}
                              </span>
                              <span className="text-[7px] text-green-500/60 leading-tight uppercase">pts</span>
                            </>
                          ) : lossResult ? (
                            <>
                              <span className="text-[9px] font-black text-red-500 leading-tight">
                                -{(lossResult.amount_owed_cents / 100).toFixed(0)}
                              </span>
                              <span className="text-[7px] text-red-500/60 leading-tight uppercase">pts</span>
                            </>
                          ) : (
                            <span className="text-zinc-800 text-[11px] font-mono">—</span>
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
            <div className="flex flex-col items-center py-12 gap-2 text-zinc-600">
              <p className="text-[10px] font-black uppercase tracking-widest">No picks yet this season</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
