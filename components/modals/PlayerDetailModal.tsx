"use client"
import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Lock, Loader2 } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import type { LeagueMember, Pick, WeeklyResult } from '@/types/database'
import { formatCents } from '@/types/database'

interface PlayerDetailModalProps {
  player: (LeagueMember & { name: string }) | null
  onClose: () => void
  currentLeagueId: string | null
}

export function PlayerDetailModal({ player, onClose, currentLeagueId }: PlayerDetailModalProps) {
  const [history, setHistory] = useState<WeeklyResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!player || !currentLeagueId) return

    const load = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('weekly_results')
          .select('*')
          .eq('user_id', player.user_id)
          .eq('league_id', currentLeagueId)
          .not('calculated_at', 'is', null)
          .order('nfl_week', { ascending: false })
          .limit(10)

        setHistory((data ?? []) as WeeklyResult[])
      } catch (err) {
        console.error('Failed to load player history:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [player, currentLeagueId])

  if (!player) return null

  const totalOwed = player.total_owed_cents ?? 0

  return (
    <Dialog open={!!player} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-t-2xl max-h-[85vh] overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-green-500 uppercase font-black italic">
            {player.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
            Season Record
          </DialogDescription>
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
                {totalOwed >= 0 ? '+' : ''}{formatCents(totalOwed)}
              </p>
              <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                {totalOwed >= 0 ? 'Winnings' : 'Owed'}
              </p>
            </div>
          </div>

          {/* Current Week Picks - Hidden */}
          <Card className="bg-zinc-900 border-dashed border-zinc-700">
            <CardContent className="p-4 flex items-center justify-center gap-3 text-zinc-500">
              <Lock className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Current week picks hidden until kickoff
              </span>
            </CardContent>
          </Card>

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
              {history.map((result) => (
                <div
                  key={result.id}
                  className="flex justify-between items-center p-3 bg-zinc-900 rounded-lg border border-zinc-800"
                >
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase">Week {result.nfl_week}</p>
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
                        ? `+${formatCents(result.amount_won_cents)}`
                        : `-${formatCents(result.amount_owed_cents)}`
                      }
                    </span>
                  </div>
                </div>
              ))}
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