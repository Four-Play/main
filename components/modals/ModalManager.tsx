"use client"
import React from 'react'
import { PlayerDetailModal } from './PlayerDetailModal'
import { LeagueEntryModal } from './LeagueEntryModal'
import { LeagueSettingsModal } from './LeagueSettingsModal'
import type { League } from '@/types/database'

interface ModalManagerProps {
  // Player Detail
  viewingPlayer: any
  setViewingPlayer: (player: any) => void

  // League Entry (Join / Create)
  modalOpen: { open: boolean; type: 'join' | 'create' }
  setModalOpen: (val: any) => void
  inviteCode: string
  setInviteCode: (val: string) => void
  newLeagueName: string
  setNewLeagueName: (val: string) => void

  // League Settings
  leagueSettingsOpen: boolean
  setLeagueSettingsOpen: (val: boolean) => void

  // Shared
  currentLeague: League | null
  setCurrentLeague: (league: League) => void
  isLoading: boolean
  setIsLoading: (val: boolean) => void
  currentUserId: string
  onLeagueJoined?: (league: League) => void
  onLeagueCreated?: (league: League) => void
}

export function ModalManager({
  viewingPlayer,
  setViewingPlayer,
  modalOpen,
  setModalOpen,
  inviteCode,
  setInviteCode,
  newLeagueName,
  setNewLeagueName,
  leagueSettingsOpen,
  setLeagueSettingsOpen,
  currentLeague,
  setCurrentLeague,
  isLoading,
  setIsLoading,
  currentUserId,
  onLeagueJoined,
  onLeagueCreated,
}: ModalManagerProps) {
  return (
    <>
      <PlayerDetailModal
        player={viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        currentLeagueId={currentLeague?.id ?? null}
      />

      <LeagueEntryModal
        isOpen={modalOpen.open}
        type={modalOpen.type}
        onClose={() => setModalOpen({ ...modalOpen, open: false })}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        newLeagueName={newLeagueName}
        setNewLeagueName={setNewLeagueName}
        setCurrentLeague={setCurrentLeague}
        currentUserId={currentUserId}
        onLeagueJoined={onLeagueJoined}
        onLeagueCreated={onLeagueCreated}
      />

      <LeagueSettingsModal
        isOpen={leagueSettingsOpen}
        onClose={setLeagueSettingsOpen}
        currentLeague={currentLeague}
        onLeagueUpdated={setCurrentLeague}
      />
    </>
  )
}