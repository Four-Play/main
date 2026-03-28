"use client"
import React, { useEffect, useState } from 'react'
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Sliders, Trophy, TrendingDown, TrendingUp } from "lucide-react"
import { getLeagueMembers, getLeagueWeeklyResults } from '@/services/leagueService'
import type { LeagueMember, WeekSummary } from '@/types/database'
import { formatCents } from '@/types/database'

interface LeagueTabProps {
  currentLeague: string        // league ID
  currentLeagueName: string
  setLeagueSettingsOpen: (open: boolean) => void
  setViewingPlayer: (player: any) => void
  currentWeek: number
  currentYear: number
}

export function LeagueTab({
  currentLeague,
  currentLeagueName,
  setLeagueSettingsOpen,
  setViewingPlayer,
  currentWeek,
  currentYear,
}: LeagueTabProps) {
  const [members, setMembers] = useState<LeagueMember[]>([])
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'standings' | 'week'>('standings')

  useEffect(() => {
    if (!currentLeague) return
    const load = async () => {
      setLoading(true)
      try {
        const [memberData, weekData] = await Promise.all([
          getLeagueMembers(currentLeague),
          getLeagueWeeklyResults(currentLeague, currentWeek, currentYear),
        ])

        // LOG THIS: Verify what the component received
        console.log('LeagueTab: Received memberData array:', memberData);
        
        setMembers(memberData)
        setWeekSummary(weekData)
      } catch (err) {
        console.error('Failed to load league data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentLeague, currentWeek, currentYear])

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
          WEEK {currentWeek}
        </button>
      </div>

      {activeView === 'standings' ? (
        /* STANDINGS TABLE */
        <Card className="bg-zinc-950 border-zinc-800 rounded-2xl overflow-hidden">
          <Table>
            <TableBody>
              {members.map((member, idx) => {
                const profile = member.profile
                const name = profile?.username ?? 'Unknown'
                const points = member.league_points
                const owed = member.total_owed_cents

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
                        {name}
                        {member.role === 'admin' && (
                          <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 rounded">ADM</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-zinc-500 text-xs">
                      {member.wins}-{member.losses}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-black text-xs ${points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {points >= 0 ? `+$${(points / 100).toFixed(0)}` : `-$${(Math.abs(points) / 100).toFixed(0)}`}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* WEEK SUMMARY */
        <div className="space-y-3">
          {weekSummary && weekSummary.isFinal ? (
            <>
              {/* Winners */}
              {weekSummary.winners.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-500 px-1 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" /> Winners — each collects {formatCents(weekSummary.prizePerWinner)}
                  </p>
                  {weekSummary.winners.map(r => (
                    <div key={r.id} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-green-500/20">
                      <span className="font-bold uppercase text-white text-xs">{r.profile?.username}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">{r.picks_correct}/4 correct</span>
                        <span className="text-green-500 font-black text-xs font-mono">+{formatCents(r.amount_won_cents)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Losers */}
              {weekSummary.losers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500 px-1 flex items-center gap-1.5">
                    <TrendingDown className="w-3 h-3" /> Losers — each owes {formatCents(weekSummary.losers[0]?.amount_owed_cents ?? 0)}
                  </p>
                  {weekSummary.losers.map(r => (
                    <div key={r.id} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-red-500/10">
                      <span className="font-bold uppercase text-white text-xs">{r.profile?.username}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">{r.picks_correct}/4 correct</span>
                        <span className="text-red-500 font-black text-xs font-mono">-{formatCents(r.amount_owed_cents)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-12 gap-3 text-zinc-600">
              <TrendingUp className="w-8 h-8" />
              <p className="text-[10px] font-black uppercase tracking-widest">Week {currentWeek} in progress</p>
              <p className="text-[9px] text-zinc-700 uppercase">Results calculated after all games final</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}