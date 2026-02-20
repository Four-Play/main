"use client"
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, Link as LinkIcon } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { LEAGUE_STANDINGS } from '@/lib/constants';

interface HeaderProps {
  currentLeague: string;
  setCurrentLeague: (name: string) => void;
  setModalOpen: (val: any) => void;
}

export function Header({ currentLeague, setCurrentLeague, setModalOpen }: HeaderProps) {
  return (
    <header className="p-4 bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50 flex justify-between items-center backdrop-blur-md bg-zinc-950/90">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-green-500 tracking-tighter uppercase">Active League</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 h-auto text-lg font-black italic text-white hover:bg-transparent hover:text-green-400 flex items-center gap-1 uppercase tracking-tighter">
              {currentLeague} <ChevronDown className="w-4 h-4 text-green-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white w-56 shadow-2xl">
            {Object.keys(LEAGUE_STANDINGS).map((league) => (
              <DropdownMenuItem key={league} onClick={() => setCurrentLeague(league)} className="focus:bg-green-500 focus:text-black font-bold uppercase text-[10px]">
                {league}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={() => setModalOpen({open: true, type: 'join'})} className="text-green-500 focus:bg-green-500/10 focus:text-green-400 uppercase text-[10px] font-black">
              <LinkIcon className="mr-2 h-4 w-4" /> Join League
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setModalOpen({open: true, type: 'create'})} 
              className="text-green-500 focus:bg-green-500/10 focus:text-green-400 uppercase text-[10px] font-black"
            >
              <Plus className="mr-2 h-4 w-4" /> Create League
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Badge variant="outline" className="border-green-500 text-green-500 font-mono font-bold italic">FOURPLAY</Badge>
    </header>
  );
}