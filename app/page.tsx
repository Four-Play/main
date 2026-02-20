"use client"
import React, { useState, useEffect } from 'react';
import { 
  WEEKS, 
  GAMES_CURRENT, 
  GAMES_HISTORY, 
  PAST_PICKS, 
  LEAGUE_STANDINGS 
} from '@/lib/constants';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { PicksTab } from '@/components/tabs/PicksTab';
import { LeagueTab } from '@/components/tabs/LeagueTab';
import { ProfileTab } from '@/components/tabs/ProfileTab';
import { ModalManager } from '@/components/modals/ModalManager';
import { Header } from '@/components/layout/Header';
import { Navbar } from '@/components/layout/Navbar';
import { mockSignIn } from '@/services/authService';
import { SelectionSlip } from '@/components/layout/SelectionSlip';

export default function VibeApp() {
  const [user, setUser] = useState<{name: string} | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState("picks");
  const [selectedWeek, setSelectedWeek] = useState(2); // Default to current week
  const [selectedPicks, setSelectedPicks] = useState<number[]>([]);
  const [currentLeague, setCurrentLeague] = useState("The Degenerates");
  const [modalOpen, setModalOpen] = useState<{open: boolean, type: 'join' | 'create'}>({ open: false, type: 'join' });
  const [viewingPlayer, setViewingPlayer] = useState<any | null>(null);
  const [leagueSettingsOpen, setLeagueSettingsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Global or general purpose
  const [isAuthLoading, setIsAuthLoading] = useState(false); // Specific to Login/Signup
  const [newLeagueName, setNewLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAuthLoading(true); // START LOADING
  
    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      
      // Call your mock service (Phase III)
      const profile = await mockSignIn(email); 
      
      setUser({ name: profile.username });
      localStorage.setItem("vibe_user", profile.username);
    } catch (error) {
      alert("Login failed. Please try again.");
    } finally {
      setIsAuthLoading(false); // STOP LOADING
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("vibe_user");
    if (saved) setUser({ name: saved });
  }, []);

  if (!user) {
    return (
      <AuthScreen 
        isSignUp={isSignUp} 
        setIsSignUp={setIsSignUp} 
        handleAuth={handleAuth} 
      />
    );
  }

  const isHistorical = selectedWeek < 2;
  const gamesToDisplay = isHistorical ? GAMES_HISTORY : GAMES_CURRENT;

  return (
    <div className="relative max-w-md mx-auto min-h-screen bg-black text-white overflow-x-hidden font-sans">
      <Header 
        currentLeague={currentLeague} 
        setCurrentLeague={setCurrentLeague} 
        setModalOpen={setModalOpen} 
      />

      <main className="p-4 pb-40">
        {activeTab === "picks" && (
          <PicksTab 
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            selectedPicks={selectedPicks}
            onTogglePick={(id) => {
              if (selectedPicks.includes(id)) {
                setSelectedPicks(p => p.filter(item => item !== id));
              } else if (selectedPicks.length < 4) {
                setSelectedPicks(p => [...p, id]);
              }
            }}
            isLocked={isLocked}
          />
        )}

        {/* STANDINGS AND SETTINGS (Simplified for brevity) */}
        {activeTab === "league" && (
          <LeagueTab 
            currentLeague={currentLeague}
            setLeagueSettingsOpen={setLeagueSettingsOpen}
            setViewingPlayer={setViewingPlayer}
          />
        )}

        {activeTab === "settings" && (
          <ProfileTab 
            user={user} 
            setUser={setUser} 
            isEditing={isEditing} 
            setIsEditing={setIsEditing} 
            setLeagueSettingsOpen={setLeagueSettingsOpen}
          />
        )}
      </main>

      <SelectionSlip 
        selectedCount={selectedPicks.length}
        maxPicks={4}
        isLoading={isLoading}
        isVisible={!isHistorical && selectedPicks.length > 0 && activeTab === "picks" && !isLocked}
        onLockIn={async () => {
          setIsLoading(true);
          await new Promise(r => setTimeout(r, 1500));
          setIsLoading(false);
          setIsLocked(true);
          alert("Picks Locked In! 🔒");
        }}
      />

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <ModalManager 
        viewingPlayer={viewingPlayer}
        setViewingPlayer={setViewingPlayer}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        newLeagueName={newLeagueName}
        setNewLeagueName={setNewLeagueName}
        leagueSettingsOpen={leagueSettingsOpen}
        setLeagueSettingsOpen={setLeagueSettingsOpen}
        currentLeague={currentLeague}
        setCurrentLeague={setCurrentLeague}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </div>
  );
}

