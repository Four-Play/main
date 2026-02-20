"use client"
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { GameCard } from '@/components/picks/GameCard';
import { WeekSwitcher } from '@/components/picks/WeekSwitcher';
import { GAMES_CURRENT, GAMES_HISTORY, PAST_PICKS } from '@/lib/constants';
import { CheckCircle2, Lock } from "lucide-react";

interface PicksTabProps {
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  selectedPicks: number[];
  onTogglePick: (id: number) => void;
  isLocked: boolean;
}

export function PicksTab({ 
  selectedWeek, 
  setSelectedWeek, 
  selectedPicks, 
  onTogglePick,
  isLocked
}: PicksTabProps) {
  const isHistorical = selectedWeek < 2;
  const gamesToDisplay = isHistorical ? GAMES_HISTORY : GAMES_CURRENT;

  return (
    <div className="space-y-6">
      <WeekSwitcher 
        selectedWeek={selectedWeek} 
        onSelectWeek={setSelectedWeek} 
      />
      {isLocked && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-1">
              <CheckCircle2 className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Picks Confirmed</p>
              <p className="text-[9px] text-zinc-500 uppercase">Week 2 is locked</p>
            </div>
          </div>
          <Lock className="w-4 h-4 text-zinc-700" />
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {isHistorical ? "Past Results" : "Live Slate"}
        </h2>
        {isHistorical && (
          <Badge className="bg-zinc-800 text-green-500 border-none text-[9px]">
            COMPLETED
          </Badge>
        )}
      </div>
      
      <div className="space-y-3">
        {gamesToDisplay.map((game) => (
          <GameCard 
            key={game.id}
            game={game}
            disabled={isLocked}
            isHistorical={isHistorical}
            isSelected={isHistorical ? PAST_PICKS.includes(game.id) : selectedPicks.includes(game.id)}
            onSelect={onTogglePick}
          />
        ))}
      </div>
    </div>
  );
}