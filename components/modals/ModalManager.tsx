"use client"
import React from 'react';
import { PlayerDetailModal } from './PlayerDetailModal';
import { LeagueEntryModal } from './LeagueEntryModal';
import { LeagueSettingsModal } from './LeagueSettingsModal';

interface ModalManagerProps {
  // Player Detail Props
  viewingPlayer: any;
  setViewingPlayer: (player: any) => void;
  
  // League Entry Props (Join/Create)
  modalOpen: { open: boolean; type: 'join' | 'create' };
  setModalOpen: (val: any) => void;
  inviteCode: string;
  setInviteCode: (val: string) => void;
  newLeagueName: string;
  setNewLeagueName: (val: string) => void;
  
  // League Settings Props
  leagueSettingsOpen: boolean;
  setLeagueSettingsOpen: (val: boolean) => void;
  
  // Shared State
  currentLeague: string;
  setCurrentLeague: (val: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
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
  setIsLoading
}: ModalManagerProps) {
  
  return (
    <>
      {/* 1. Show player history and team details */}
      <PlayerDetailModal 
        player={viewingPlayer} 
        onClose={() => setViewingPlayer(null)} 
      />

      {/* 2. Handle Joining or Creating a League */}
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
      />

      {/* 3. Handle League Rules and Admin actions */}
      <LeagueSettingsModal 
        isOpen={leagueSettingsOpen}
        onClose={setLeagueSettingsOpen}
        currentLeague={currentLeague}
        setCurrentLeague={setCurrentLeague}
      />
    </>
  );
}