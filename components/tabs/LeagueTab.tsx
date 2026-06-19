"use client"
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Sliders, Trophy, TrendingDown, TrendingUp, Users } from "lucide-react"
import { getWeekLabel, ACTIVE_SPORT } from '@/lib/weekUtils'
import type { LeagueMember, WeekSummary } from '@/types/database'
import { formatPoints } from '@/types/database'

interface LeagueTabProps {
  currentLeague: string
  currentLeagueName: string
  setLeagueSettingsOpen: (open: boolean) => void
  setViewingPlayer: (player: any) => void
  currentWeek: number
  currentYear: number
  accessToken: string | null
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
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'standings' | 'week'>('standings')
  const [refreshKey, setRefreshKey] = useState(0)
  const hiddenAtRef = useRef<number>(0)

  // Re-fetch when app comes back to foreground after 30+ seconds away.
  // This runs once and is not dependent on any fetch state.
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

    // Hard wall-clock timeout: directly clears loading even if the fetch
    // or session lookup hangs. AbortController.abort() alone is not enough
    // because it only cancels fetch(), not upstream async work.
    const timeout = setTimeout(() => {
      if (active) setLoading(false)
    }, 8000)

    const headers: HeadersInit = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}

    fetch(`/api/league-tab?leagueId=${currentLeague}&year=${currentYear}`, {
      headers,
      signal: controller.signal,
    })
      .then(res => res.json())
      .then(data => {
        if (!active) return
        if (data.members) setMembers(data.members)
        if (data.weekSummaries) setWeekSummaries(data.weekSummaries)
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
  }, [currentLeague, currentYear, accessToken, refreshKey])

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
          onClick={() => setActiveView('week')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
            activeView === 'week'
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
        <div className="space-y-6">
          {weekSummaries.filter(s => s.isFinal).length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-zinc-600">
              <TrendingUp className="w-8 h-8" />
              <p className="text-[10px] font-black uppercase tracking-widest">{getWeekLabel(currentWeek, ACTIVE_SPORT)} in progress</p>
              <p className="text-[9px] text-zinc-700 uppercase">Results calculated after all games final</p>
            </div>
          ) : (
            weekSummaries
              .filter(s => s.isFinal)
              .map(summary => (
                <div key={summary.week} className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300 px-1 pb-1 border-b border-zinc-800">
                    {getWeekLabel(summary.week, ACTIVE_SPORT)}
                  </h3>

                  {summary.winners.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-green-500 px-1 flex items-center gap-1.5">
                        <Trophy className="w-3 h-3" /> Winners — each earns {formatPoints(summary.prizePerWinner)}
                      </p>
                      {summary.winners.map(r => (
                        <div key={r.id} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-green-500/20">
                          <span className="font-bold uppercase text-white text-xs">{r.profile?.username}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500">{r.picks_correct}/4 correct</span>
                            <span className="text-green-500 font-black text-xs font-mono">+{formatPoints(r.amount_won_cents)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {summary.losers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-500 px-1 flex items-center gap-1.5">
                        <TrendingDown className="w-3 h-3" /> Losers — each loses {formatPoints(summary.losers[0]?.amount_owed_cents ?? 0)}
                      </p>
                      {summary.losers.map(r => (
                        <div key={r.id} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-red-500/10">
                          <span className="font-bold uppercase text-white text-xs">{r.profile?.username}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500">{r.picks_correct}/4 correct</span>
                            <span className="text-red-500 font-black text-xs font-mono">-{formatPoints(r.amount_owed_cents)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}
