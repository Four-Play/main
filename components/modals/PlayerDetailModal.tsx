"use client"
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Loader2, ChevronDown, ChevronUp, Users } from "lucide-react"
import { supabase } from '@/lib/supabase/client'
import type { LeagueMember, Pick, WeeklyResult } from '@/types/database'
import { formatPoints } from '@/types/database'
import { getWeekLabel, ACTIVE_SPORT } from '@/lib/weekUtils'

interface PlayerDetailModalProps {
  player: (LeagueMember & { name: string }) | null
  onClose: () => void
  currentLeagueId: string | null
}

export function PlayerDetailModal({ player, onClose, currentLeagueId }: PlayerDetailModalProps) {
  const [history, setHistory] = useState<WeeklyResult[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!player || !currentLeagueId) return

    const load = async () => {
      setLoading(true)
      setExpandedWeeks(new Set())
      try {
        const [historyRes, picksRes] = await Promise.all([
          supabase
            .from('weekly_results')
            .select('*')
            .eq('user_id', player.user_id)
            .eq('league_id', currentLeagueId)
            .not('calculated_at', 'is', null)
            .order('nfl_week', { ascending: false })
            .limit(10),
          supabase
            .from('picks')
            .select('*, game:games(*)')
            .eq('user_id', player.user_id)
            .eq('league_id', currentLeagueId)
            .order('nfl_week', { ascending: false }),
        ])

        setHistory((historyRes.data ?? []) as WeeklyResult[])
        setPicks((picksRes.data ?? []) as Pick[])
      } catch (err) {
        console.error('Failed to load player history:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [player, currentLeagueId])

  const picksByWeek = useMemo(() => {
    const map = new Map<number, Pick[]>()
    for (const p of picks) {
      const arr = map.get(p.nfl_week) ?? []
      arr.push(p)
      map.set(p.nfl_week, arr)
    }
    return map
  }, [picks])

  const toggleWeek = (week: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(week)) next.delete(week)
      else next.add(week)
      return next
    })
  }

  if (!player) return null

  const totalOwed = player.total_owed_cents ?? 0
  const avatarUrl = player.profile?.avatar_url

  return (
    <Dialog open={!!player} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-t-2xl max-h-[85vh] overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-900 border-2 border-green-500 flex-shrink-0">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
              )}
            </div>
            <div className="text-left">
              <DialogTitle className="text-green-500 uppercase font-black italic">
                {player.name}
              </DialogTitle>
              <DialogDescription className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                Season Record
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Season Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-white">{player.wins ?? 0}</p>
              <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Wins</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-white">{player.losses ?? 0}</p>
              <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Losses</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <p className={`text-2xl font-black ${totalOwed >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalOwed >= 0 ? '+' : '-'}{formatPoints(totalOwed)}
              </p>
              <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                Points
              </p>
            </div>
          </div>

          {/* Weekly History */}
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 pt-2">
            Weekly History
          </h3>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-[10px] text-zinc-600 uppercase text-center py-4">No completed weeks yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((result) => {
                const weekPicks = picksByWeek.get(result.nfl_week) ?? []
                const isExpanded = expandedWeeks.has(result.nfl_week)
                const hasPicks = weekPicks.length > 0
                return (
                  <div
                    key={result.id}
                    className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => hasPicks && toggleWeek(result.nfl_week)}
                      disabled={!hasPicks}
                      className={`w-full flex justify-between items-center p-3 text-left ${hasPicks ? 'hover:bg-zinc-800/50 transition-colors' : 'cursor-default'}`}
                    >
                      <div>
                        <p className="text-[10px] font-bold text-white uppercase">
                          {getWeekLabel(result.nfl_week, ACTIVE_SPORT)}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono">
                          {result.picks_correct}/4 correct
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            result.is_winner
                              ? 'bg-green-500/20 text-green-500 border-none text-[9px]'
                              : 'bg-red-500/20 text-red-500 border-none text-[9px]'
                          }
                        >
                          {result.is_winner ? 'WIN' : 'LOSS'}
                        </Badge>
                        <span className={`font-black text-xs font-mono ${result.is_winner ? 'text-green-500' : 'text-red-500'}`}>
                          {result.is_winner
                            ? `+${formatPoints(result.amount_won_cents)}`
                            : `-${formatPoints(result.amount_owed_cents)}`
                          }
                        </span>
                        {hasPicks && (
                          isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                            : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </div>
                    </button>

                    {isExpanded && hasPicks && (
                      <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                        {weekPicks.map(pick => {
                          const game = pick.game
                          const team = pick.team_selected
                          const opponent = game
                            ? (team === game.home_team ? game.away_team : game.home_team)
                            : null
                          const spread = game?.spread != null
                            ? (team === game.favorite_team
                                ? `-${Math.abs(game.spread)}`
                                : `+${Math.abs(game.spread)}`)
                            : null
                          const r = pick.result
                          const badgeClass = r === 'win'
                            ? 'bg-green-500/20 text-green-500'
                            : r === 'loss'
                              ? 'bg-red-500/20 text-red-500'
                              : r === 'push'
                                ? 'bg-zinc-700/40 text-zinc-300'
                                : 'bg-zinc-800 text-zinc-500'
                          const label = r ? r.toUpperCase() : 'PENDING'
                          return (
                            <div
                              key={pick.id}
                              className="flex justify-between items-center px-3 py-2"
                            >
                              <div className="flex items-baseline gap-2 min-w-0">
                                <span className="font-black text-white text-xs uppercase tracking-tight">
                                  {team}
                                </span>
                                {spread && (
                                  <span className="text-[10px] font-mono text-zinc-400">{spread}</span>
                                )}
                                {opponent && (
                                  <span className="text-[9px] text-zinc-600 uppercase truncate">vs {opponent}</span>
                                )}
                              </div>
                              <Badge className={`${badgeClass} border-none text-[9px] font-black tracking-widest flex-shrink-0`}>
                                {label}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full bg-zinc-800 text-white font-black uppercase"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
