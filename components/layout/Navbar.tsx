"use client"
import React from 'react';
import { Ticket, Trophy, Settings } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 flex justify-around p-3 pb-8 max-w-md mx-auto z-50">
      <NavButton active={activeTab === 'picks'} onClick={() => setActiveTab('picks')} icon={Ticket} label="PICKS" />
      <NavButton active={activeTab === 'league'} onClick={() => setActiveTab('league')} icon={Trophy} label="LEAGUE" />
      <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="SETTINGS" />
    </nav>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-green-500 scale-110' : 'text-zinc-600'}`}>
      <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
      <span className="text-[9px] font-black tracking-widest uppercase">{label}</span>
    </button>
  );
}