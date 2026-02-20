"use client"
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Crown, Sliders } from "lucide-react";

interface ProfileTabProps {
  user: { name: string };
  setUser: (user: any) => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  setLeagueSettingsOpen: (val: boolean) => void;
}

export function ProfileTab({ 
  user, 
  setUser, 
  isEditing, 
  setIsEditing, 
  setLeagueSettingsOpen 
}: ProfileTabProps) {
  
  const handleSignOut = () => {
    localStorage.clear();
    window.location.reload();
  };

  const saveProfile = () => {
    localStorage.setItem("vibe_user", user.name);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center pt-8 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* AVATAR */}
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-zinc-900 border-2 border-green-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.15)]">
          <Users className="w-10 h-10 text-green-500" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-4 border-black">
          <Crown className="w-3 h-3 text-black" />
        </div>
      </div>

      {!isEditing ? (
        <div className="w-full flex flex-col items-center space-y-2 mb-8 animate-in fade-in zoom-in-95 duration-300">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">{user.name}</h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Pro Player • Week 2 Active</p>
          <Button 
            onClick={() => setIsEditing(true)}
            className="mt-6 w-full max-w-[180px] bg-zinc-900 border border-zinc-800 text-white font-black uppercase text-[10px] tracking-widest h-11 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
          >
            <Sliders className="w-3.5 h-3.5 text-green-500" />
            Edit Profile
          </Button>
        </div>
      ) : (
        <div className="w-full space-y-4 mb-8 animate-in slide-in-from-right-4 duration-300">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Display Name</label>
            <Input 
              value={user.name} 
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="bg-zinc-900 border-zinc-800 text-white h-12 focus:ring-green-500 font-bold uppercase text-xs" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
            <Input 
              type="email"
              placeholder="player@fourplay.com"
              className="bg-zinc-900 border-zinc-800 text-white h-12 focus:ring-green-500 font-bold text-xs" 
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 border-zinc-800 bg-transparent text-zinc-500 font-black uppercase text-[10px] h-12">
              Cancel
            </Button>
            <Button onClick={saveProfile} className="flex-[2] bg-green-500 text-black font-black uppercase text-[10px] h-12 hover:bg-green-400">
              Save Profile
            </Button>
          </div>
        </div>
      )}

      <div className="w-full pt-6 border-t border-zinc-900 flex flex-col items-center gap-2">
        {!isEditing && (
          <Button variant="ghost" className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest hover:text-white" onClick={() => setLeagueSettingsOpen(true)}>
            League Management
          </Button>
        )}
        <Button variant="ghost" className="text-red-500 font-bold uppercase text-[9px] tracking-widest hover:bg-red-500/10 w-full" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}