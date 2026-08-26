"use client"
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Sliders, Users } from "lucide-react"
import type { LeagueMember } from '@/types/database'

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
  const [loading, setLoading] = useState(true)
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
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {currentLeagueName}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLeagueSettingsOpen(true)}
          className="h-7 text-[10px] font-black uppercase text-green-500 hover:bg-green-500/10 gap-1.5"
        >
          <Sliders className="w-3 h-3" /> Settings
        </Button>
      </div>

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
                        <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1 rounded">ADM</span>
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
    </div>
  )
}
