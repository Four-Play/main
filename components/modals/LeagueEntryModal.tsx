"use client"
import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { joinLeagueWithCode, createLeague } from '@/services/leagueService'
import type { League } from '@/types/database'

interface LeagueEntryModalProps {
  isOpen: boolean
  type: 'join' | 'create'
  onClose: () => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  inviteCode: string
  setInviteCode: (code: string) => void
  newLeagueName: string
  setNewLeagueName: (name: string) => void
  setCurrentLeague: (league: League) => void
  currentUserId: string
  onLeagueJoined?: (league: League) => void
  onLeagueCreated?: (league: League) => void
}

export function LeagueEntryModal({
  isOpen,
  type,
  onClose,
  isLoading,
  setIsLoading,
  inviteCode,
  setInviteCode,
  newLeagueName,
  setNewLeagueName,
  setCurrentLeague,
  currentUserId,
  onLeagueJoined,
  onLeagueCreated,
}: LeagueEntryModalProps) {
  const [selectedSport, setSelectedSport] = useState<'americanfootball_nfl' | 'americanfootball_ncaaf'>('americanfootball_nfl')

  const handleJoin = async () => {
    setIsLoading(true)
    try {
      const league = await joinLeagueWithCode(inviteCode, currentUserId)
      setInviteCode('')
      onLeagueJoined?.(league)
      onClose()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    setIsLoading(true)
    try {
      const league = await createLeague(newLeagueName, currentUserId, 5000, selectedSport)
      setNewLeagueName('')
      setCurrentLeague(league)
      onLeagueCreated?.(league)
      onClose()
      alert(`League created! Share your invite code: ${league.invite_code}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-t-2xl sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-green-500 uppercase font-black italic tracking-widest">
            {type === 'join' ? 'Join League' : 'Create League'}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-[11px] uppercase font-bold">
            {type === 'join'
              ? "Enter your crew's invite code"
              : 'Start a new pool for your squad'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {type === 'join' ? (
            <div className="space-y-4">
              <Input
                placeholder="INVITE CODE (E.G. ABC123)"
                className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500 uppercase"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
              <Button
                disabled={isLoading || !inviteCode}
                onClick={handleJoin}
                className="w-full bg-green-500 text-black font-black uppercase tracking-widest h-12"
              >
                {isLoading ? 'Checking Code...' : 'JOIN LEAGUE'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="LEAGUE NAME"
                className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
              />

              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 px-1">Sport</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSport('americanfootball_nfl')}
                    className={`flex-1 py-2.5 rounded-lg border text-[11px] font-black uppercase tracking-wide transition-all ${
                      selectedSport === 'americanfootball_nfl'
                        ? 'bg-green-500/10 border-green-500 text-green-500'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    NFL
                  </button>
                  <button
                    onClick={() => setSelectedSport('americanfootball_ncaaf')}
                    className={`flex-1 py-2.5 rounded-lg border text-[11px] font-black uppercase tracking-wide transition-all ${
                      selectedSport === 'americanfootball_ncaaf'
                        ? 'bg-green-500/10 border-green-500 text-green-500'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    College
                  </button>
                </div>
                {selectedSport === 'americanfootball_ncaaf' && (
                  <p className="text-[10px] text-zinc-600 px-1 mt-1.5">
                    Power 4 + Notre Dame matchups only
                  </p>
                )}
              </div>

              <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-1">
                Default stake: 50 pts per loss. Change in league settings after creation.
              </p>
              <Button
                disabled={isLoading || !newLeagueName || newLeagueName.length < 3}
                onClick={handleCreate}
                className="w-full bg-green-500 text-black font-black uppercase tracking-widest h-12 hover:bg-green-600 transition-colors"
              >
                {isLoading ? 'CREATING...' : 'START LEAGUE'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
