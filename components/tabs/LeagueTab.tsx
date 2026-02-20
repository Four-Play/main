"use client"
import React from 'react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Sliders } from "lucide-react";
import { LEAGUE_STANDINGS } from '@/lib/constants';

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
            {LEAGUE_STANDINGS[currentLeague].map((m) => (
              <TableRow 
                key={m.name} 
                className="border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-colors"
                onClick={() => setViewingPlayer(m)}
              >
                <TableCell className="font-bold uppercase text-white text-xs tracking-tight">
                  {m.name}
                </TableCell>
                <TableCell className="text-center font-mono text-zinc-500 text-xs">
                  {m.w}-{m.l}
                </TableCell>
                <TableCell className={`text-right font-mono font-black text-xs ${m.p >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {m.p >= 0 ? `+$${m.p}` : `-$${Math.abs(m.p)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}