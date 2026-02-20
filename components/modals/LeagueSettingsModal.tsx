"use client"
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Crown, Lock } from "lucide-react";

interface LeagueSettingsModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  currentLeague: string;
  setCurrentLeague: (name: string) => void;
}

export function LeagueSettingsModal({
  isOpen,
  onClose,
  currentLeague,
  setCurrentLeague
}: LeagueSettingsModalProps) {
  
  const inviteId = `${currentLeague.toUpperCase().replace(/\s+/g, '-')}-2026`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteId);
    // Optional: Add a toast notification here later
  };

  const handleDelete = () => {
    if (confirm("Are you sure? This will delete the league for everyone.")) {
      setCurrentLeague("The Degenerates"); // Reset to default
      onClose(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-t-2xl sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-green-500 uppercase font-black italic tracking-widest flex items-center gap-2">
            League Settings
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-[10px] uppercase font-bold">
            Manage Rules & Invites
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* LEAGUE NAME */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
              League Name
            </label>
            <Input 
              value={currentLeague} 
              onChange={(e) => setCurrentLeague(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500 font-bold" 
            />
          </div>

          {/* LEAGUE ID / INVITE SECTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
              League Invite ID
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md flex items-center px-4 font-mono text-xs text-green-500">
                {inviteId}
              </div>
              <Button 
                variant="outline" 
                className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-bold uppercase"
                onClick={handleCopy}
              >
                Copy
              </Button>
            </div>
          </div>

          {/* LOCKED PREMIUM SECTIONS */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Scoring Rules
              </label>
              <Badge className="bg-green-500 text-black text-[8px] h-4 font-black tracking-tighter">
                PREMIUM ONLY
              </Badge>
            </div>
            
            <div className="space-y-3 opacity-50 pointer-events-none">
              <div className="relative">
                <Input disabled value="Spread Cushion: +13" className="bg-zinc-900/50 border-zinc-800 text-zinc-400 h-12 pr-10" />
                <Crown className="absolute right-3 top-3.5 w-5 h-5 text-green-500/50" />
              </div>
              <div className="relative">
                <Input disabled value="Payout Per Loss: $50.00" className="bg-zinc-900/50 border-zinc-800 text-zinc-400 h-12 pr-10" />
                <Lock className="absolute right-3 top-3.5 w-5 h-5 text-zinc-500/50" />
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="pt-4 border-t border-zinc-900">
            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest px-1 block mb-2">
              Danger Zone
            </label>
            <Button 
              variant="outline" 
              className="w-full border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-black uppercase text-[10px] h-10 tracking-widest"
              onClick={handleDelete}
            >
              Delete League
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={() => onClose(false)} 
            className="w-full bg-green-500 text-black font-black uppercase tracking-widest h-12"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}