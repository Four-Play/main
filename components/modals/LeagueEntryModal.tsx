"use client"
import React from 'react'
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

  const handleJoin = async () => {
    setIsLoading(true)
    try {
      const league = await joinLeagueWithCode(inviteCode, currentUserId)
      setInviteCode('')
      setCurrentLeague(league)
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
      const league = await createLeague(newLeagueName, currentUserId)
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
          <DialogDescription className="text-zinc-500 text-[10px] uppercase font-bold">
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
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest px-1">
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