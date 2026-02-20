"use client"
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { GAMES_HISTORY, PAST_PICKS } from '@/lib/constants';

interface PlayerDetailModalProps {
  player: any;
  onClose: () => void;
}

export function PlayerDetailModal({ player, onClose }: PlayerDetailModalProps) {
  if (!player) return null;

  return (
    <Dialog open={!!player} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-green-500 uppercase font-black italic">
            {player.name}'s Team
          </DialogTitle>
          <DialogDescription className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
            Week 2 Picks (Hidden)
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Card className="bg-zinc-900 border-dashed border-zinc-700">
            <CardContent className="p-4 flex items-center justify-center gap-3 text-zinc-500">
              <Lock className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Picks Hidden until kickoff
              </span>
            </CardContent>
          </Card>

          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 pt-2">
            Week 1 History
          </h3>
          
          <div className="space-y-2">
            {GAMES_HISTORY.map((game) => {
              const isSelected = PAST_PICKS.includes(game.id);
              if (!isSelected) return null;

              return (
                <div key={game.id} className="flex justify-between items-center p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase">{game.fav} vs {game.dog}</p>
                    <p className="text-[9px] text-green-500 font-mono">Cushion: +{game.spread + 13}</p>
                  </div>
                  <Badge className={game.result === 'WIN' ? "bg-green-500/20 text-green-500 border-none" : "bg-red-500/20 text-red-500 border-none"}>
                    {game.result}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full bg-zinc-800 text-white font-black uppercase">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}