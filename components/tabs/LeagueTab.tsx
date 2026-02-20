"use client"
import React from 'react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Sliders } from "lucide-react";
import { LEAGUE_MEMBERSHIPS, MOCK_PROFILES } from '@/lib/constants';

interface LeagueTabProps {
  currentLeague: string;
  setLeagueSettingsOpen: (open: boolean) => void;
  setViewingPlayer: (player: any) => void;
}

export function LeagueTab({ 
  currentLeague, 
  setLeagueSettingsOpen, 
  setViewingPlayer 
}: LeagueTabProps) {
  const members = LEAGUE_MEMBERSHIPS[currentLeague] || [];
  const displayPlayers = members.map((member) => {
    const profile = MOCK_PROFILES[member.user_id];
    return {
      id: member.user_id,
      name: profile?.username || "Unknown Player",
      league_points: member.league_points,
      role: member.role,
      w: member.w ?? 3, 
      l: member.l ?? 1
    };
  }).sort((a, b) => b.points - a.points);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Rankings: {currentLeague}
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLeagueSettingsOpen(true)}
          className="h-7 text-[9px] font-black uppercase text-green-500 hover:bg-green-500/10 gap-1.5"
        >
          <Sliders className="w-3 h-3" /> League Settings
        </Button>
      </div>

      <Card className="bg-zinc-950 border-zinc-800 rounded-2xl overflow-hidden">
        <Table>
          <TableBody>
            {displayPlayers.map((player) => (
              <TableRow 
                key={player.user_id || player.id} 
                className="border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-colors"
                onClick={() => setViewingPlayer(player)}
              >
                <TableCell className="font-bold uppercase text-white text-xs tracking-tight flex items-center gap-2">
                  {player.name}
                  {player.role === 'admin' && (
                    <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 rounded">ADM</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-mono text-zinc-500 text-xs">
                  {(player.w ?? 0)}-{(player.l ?? 0)}
                </TableCell>
                <TableCell className={`text-right font-mono font-black text-xs ${player.league_points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {player.league_points >= 0 ? `+$${player.league_points}` : `-$${Math.abs(player.league_points)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}