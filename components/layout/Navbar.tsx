"use client"
import React from 'react';
import { Ticket, BarChart2, Trophy, MessageCircle, Settings } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadChatCount?: number;
}

export function Navbar({ activeTab, setActiveTab, unreadChatCount = 0 }: NavbarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 flex justify-around px-3 pt-3 max-w-md mx-auto z-50"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <NavButton active={activeTab === 'picks'} onClick={() => setActiveTab('picks')} icon={Ticket} label="PICKS" />
      <NavButton active={activeTab === 'current'} onClick={() => setActiveTab('current')} icon={BarChart2} label="CURRENT" />
      <NavButton active={activeTab === 'league'} onClick={() => setActiveTab('league')} icon={Trophy} label="LEAGUE" />
      <NavButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={MessageCircle} label="CHAT" badge={unreadChatCount} />
      <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="SETTINGS" />
    </nav>
  );
}

function NavButton({ active, onClick, icon: Icon, label, badge = 0 }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-green-500 scale-110' : 'text-zinc-600'}`}>
      <div className="relative">
        <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[9px] font-black tracking-wide uppercase">{label}</span>
    </button>
  );
}