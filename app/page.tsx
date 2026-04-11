"use client"
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { PicksTab } from '@/components/tabs/PicksTab'
import { LeagueTab } from '@/components/tabs/LeagueTab'
import { ProfileTab } from '@/components/tabs/ProfileTab'
import { ModalManager } from '@/components/modals/ModalManager'
import { Header } from '@/components/layout/Header'
import { Navbar } from '@/components/layout/Navbar'
import { SubmitBar } from '@/components/layout/SubmitBar'
import { signIn, signUp, signOut, getProfile } from '@/services/authService'
import { getMyLeagues } from '@/services/leagueService'
import { getMyPicks, savePick, deletePick } from '@/services/picksService'
import { createClient } from '@/lib/supabase/client'
import type { Profile, League, Game, Pick } from '@/types/database'
import { computeCurrentWeek, ACTIVE_SPORT } from '@/lib/weekUtils'
import { SEASON_YEAR } from '@/config/season'

export default function FourplayApp() {
  // Auth state
  const [user, setUser] = useState<Profile | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // App state
  const [activeTab, setActiveTab] = useState('picks')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // League state
  const [leagues, setLeagues] = useState<League[]>([])
  const [currentLeague, setCurrentLeague] = useState<League | null>(null)
  const [modalOpen, setModalOpen] = useState<{ open: boolean; type: 'join' | 'create' }>({ open: false, type: 'join' })
  const [leagueSettingsOpen, setLeagueSettingsOpen] = useState(false)
  const [viewingPlayer, setViewingPlayer] = useState<any | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [newLeagueName, setNewLeagueName] = useState('')

  // Games + Picks state
  const [games, setGames] = useState<Game[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const [selectedPicks, setSelectedPicks] = useState<Set<string>>(new Set()) // Set of game IDs
  const [picksMap, setPicksMap] = useState<Map<string, Pick>>(new Map()) // gameId -> Pick (current UI state, may include unsaved drafts)
  const [savedPicksMap, setSavedPicksMap] = useState<Map<string, string>>(new Map()) // gameId -> team_selected (last-known DB state, for diffing)
  const [isSubmittingPicks, setIsSubmittingPicks] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(() => computeCurrentWeek(ACTIVE_SPORT))
  const [currentYear, setCurrentYear] = useState(SEASON_YEAR)
  const [selectedWeek, setSelectedWeek] = useState(() => computeCurrentWeek(ACTIVE_SPORT))

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      // Safety net: never stay stuck on the loading screen.
      // If anything hangs (stale token, network blip, bad cache after a deploy)
      // we force the auth check to complete and show the login screen.
      const giveUpTimer = setTimeout(() => {
        console.warn('Auth check timed out — clearing session')
        createClient().auth.signOut().catch(() => {})
        setAuthChecked(true)
      }, 6000)

      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          await supabase.auth.signOut().catch(() => {})
          return
        }

        // Invalid / revoked refresh token — common after a new deployment
        const isStaleToken =
          (error as any)?.code === 'refresh_token_not_found' ||
          (error as any)?.message?.includes('Refresh Token')
        if (isStaleToken) {
          await supabase.auth.signOut().catch(() => {})
          return
        }

        const profile = await getProfile(session.user.id)
        if (profile) setUser(profile)
      } catch (err: any) {
        console.error('Session check failed:', err)
        try { await createClient().auth.signOut() } catch {}
      } finally {
        clearTimeout(giveUpTimer)
        setAuthChecked(true)
      }
    }

    checkSession()

    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        setUser(null)
        setLeagues([])
        setCurrentLeague(null)
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await getProfile(session.user.id)
        if (profile) setUser(profile)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load leagues when user is set
  useEffect(() => {
    if (!user) return
    const loadLeagues = async () => {
      try {
        const userLeagues = await getMyLeagues(user.id)
        setLeagues(userLeagues)
        if (userLeagues.length > 0 && !currentLeague) {
          setCurrentLeague(userLeagues[0])
        }
      } catch (err) {
        console.error('Failed to load leagues:', err)
      }
    }
    loadLeagues()
  }, [user])

  // Load games for current week
  const loadGames = useCallback(async (week: number, year: number) => {
    setGamesLoading(true)
    try {
      const res = await fetch(`/api/games?week=${week}&year=${year}`)
      const data = await res.json()
      if (data.games) {
        const mapped = data.games.map((g: any) => ({
          ...g,
          fav: g.favorite_team,
          dog: g.underdog_team,
          time: formatGameTime(g.commence_time, g.status),
        }))
        setGames(mapped)
        setCurrentWeek(data.currentWeek ?? data.week)
        setCurrentYear(data.year)
      }
    } catch (err) {
      console.error('Failed to load games:', err)
    } finally {
      setGamesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGames(selectedWeek, currentYear)
  }, [selectedWeek, currentYear, loadGames])

  // Load user's existing picks for this week
  useEffect(() => {
    if (!user || !currentLeague) return

    const loadPicks = async () => {
      try {
        const picks = await getMyPicks(user.id, currentLeague.id, selectedWeek, currentYear)
        const map = new Map<string, Pick>()
        const saved = new Map<string, string>()
        const selected = new Set<string>()

        for (const pick of picks) {
          map.set(pick.game_id, pick)
          saved.set(pick.game_id, pick.team_selected)
          selected.add(pick.game_id)
        }

        setPicksMap(map)
        setSavedPicksMap(saved)
        setSelectedPicks(selected)
      } catch (err) {
        console.error('Failed to load picks:', err)
      }
    }

    loadPicks()
  }, [user, currentLeague, selectedWeek, currentYear])

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsAuthLoading(true)

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out — please check your connection and try again.')), 10000)
    )

    try {
      const formData = new FormData(e.currentTarget)
      const email = formData.get('email') as string
      const password = formData.get('password') as string

      let profile: Profile
      if (isSignUp) {
        const username = formData.get('name') as string
        profile = await Promise.race([signUp(email, password, username), timeout])
      } else {
        profile = await Promise.race([signIn(email, password), timeout])
      }

      setUser(profile)
    } catch (error: any) {
      alert(error.message || 'Authentication failed. Please try again.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleTogglePick = (gameId: string, teamSelected: string) => {
    if (!user || !currentLeague) return

    const game = games.find(g => g.id === gameId)
    if (!game) return

    // Each game is locked individually once it starts
    if (game.commence_time && new Date(game.commence_time) < new Date()) {
      alert('This game has already started and cannot be changed.')
      return
    }

    const alreadyPicked = selectedPicks.has(gameId)
    const currentTeam = picksMap.get(gameId)?.team_selected

    // Case 1: Clicking already-selected team → remove pick (local only)
    if (alreadyPicked && currentTeam === teamSelected) {
      setSelectedPicks(prev => { const n = new Set(prev); n.delete(gameId); return n })
      setPicksMap(prev => { const n = new Map(prev); n.delete(gameId); return n })
      return
    }

    // Case 2: Game already picked, clicking the other team → switch (local only)
    if (alreadyPicked && currentTeam !== teamSelected) {
      setPicksMap(prev => {
        const n = new Map(prev)
        const existing = n.get(gameId)
        n.set(gameId, { ...(existing as Pick), team_selected: teamSelected })
        return n
      })
      return
    }

    // Case 3: New pick (local only)
    if (!alreadyPicked && selectedPicks.size < 4) {
      const draftPick: Pick = {
        id: `draft-${gameId}`,
        user_id: user.id,
        league_id: currentLeague.id,
        game_id: gameId,
        team_selected: teamSelected,
        is_locked: false,
        nfl_week: selectedWeek,
        season_year: currentYear,
      }
      setSelectedPicks(prev => new Set([...prev, gameId]))
      setPicksMap(prev => new Map([...prev, [gameId, draftPick]]))
    }
  }

  // Compute the diff between local state and last-known DB state
  const pickDiff = useMemo(() => {
    const toSave: Array<{ gameId: string; team: string }> = []
    const toDelete: string[] = []

    for (const [gameId, pick] of picksMap) {
      const savedTeam = savedPicksMap.get(gameId)
      if (savedTeam !== pick.team_selected) {
        toSave.push({ gameId, team: pick.team_selected })
      }
    }
    for (const gameId of savedPicksMap.keys()) {
      if (!picksMap.has(gameId)) {
        toDelete.push(gameId)
      }
    }
    return { toSave, toDelete, total: toSave.length + toDelete.length }
  }, [picksMap, savedPicksMap])

  const handleSubmitPicks = async () => {
    if (!user || !currentLeague) return
    if (pickDiff.total === 0) return
    setIsSubmittingPicks(true)

    try {
      const now = new Date()

      // Skip anything for games that have already started — those are locked
      const canEdit = (gameId: string) => {
        const game = games.find(g => g.id === gameId)
        if (!game?.commence_time) return true
        return new Date(game.commence_time) > now
      }

      const savePromises = pickDiff.toSave
        .filter(({ gameId }) => canEdit(gameId))
        .map(({ gameId, team }) =>
          savePick(user.id, currentLeague.id, gameId, team, selectedWeek, currentYear)
        )
      const deletePromises = pickDiff.toDelete
        .filter(canEdit)
        .map((gameId) => deletePick(user.id, currentLeague.id, gameId))

      const savedPicks = await Promise.all(savePromises)
      await Promise.all(deletePromises)

      // Update maps with authoritative DB results
      setPicksMap(prev => {
        const n = new Map(prev)
        for (const pick of savedPicks) n.set(pick.game_id, pick)
        return n
      })
      setSavedPicksMap(prev => {
        const n = new Map(prev)
        for (const pick of savedPicks) n.set(pick.game_id, pick.team_selected)
        for (const gameId of pickDiff.toDelete) {
          if (canEdit(gameId)) n.delete(gameId)
        }
        return n
      })
    } catch (err: any) {
      alert(err.message ?? 'Failed to submit picks')
    } finally {
      setIsSubmittingPicks(false)
    }
  }

  const handleLeagueChange = (league: League) => {
    setCurrentLeague(league)
    setSelectedPicks(new Set())
    setPicksMap(new Map())
    setSavedPicksMap(new Map())
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <AuthScreen
        isSignUp={isSignUp}
        setIsSignUp={setIsSignUp}
        handleAuth={handleAuth}
        isLoading={isAuthLoading}
      />
    )
  }

  const isHistorical = selectedWeek < currentWeek

  return (
    <div className="relative max-w-md mx-auto min-h-screen bg-black text-white overflow-x-hidden font-sans">
      <Header
        currentLeague={currentLeague?.name ?? 'No League'}
        leagues={leagues}
        setCurrentLeague={handleLeagueChange}
        setModalOpen={setModalOpen}
      />

      <main className="p-4 pb-40">
        {/* Add this check at the top of your main content */}
        {leagues.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center px-6">
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">No Leagues Yet</h2>
            <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-bold mb-8">Join a friend's league or start your own</p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => setModalOpen({ open: true, type: 'create' })}
                className="bg-green-500 text-black px-6 py-3 rounded-full font-black uppercase text-[11px] tracking-widest"
              >
                Create a League
              </button>
              <button
                onClick={() => setModalOpen({ open: true, type: 'join' })}
                className="bg-zinc-900 border border-zinc-700 text-white px-6 py-3 rounded-full font-black uppercase text-[11px] tracking-widest"
              >
                Join a League
              </button>
            </div>
          </div>
        ) : (
          <> 
            {activeTab === 'picks' && (
              <PicksTab
                selectedWeek={selectedWeek}
                setSelectedWeek={setSelectedWeek}
                currentWeek={currentWeek}
                games={games}
                gamesLoading={gamesLoading}
                selectedPicks={selectedPicks}
                picksMap={picksMap}
                onTogglePick={handleTogglePick}
              />
            )}

            {activeTab === 'league' && currentLeague && (
              <LeagueTab
                currentLeague={currentLeague.id}
                currentLeagueName={currentLeague.name}
                setLeagueSettingsOpen={setLeagueSettingsOpen}
                setViewingPlayer={setViewingPlayer}
                currentWeek={currentWeek}
                currentYear={currentYear}
              />
            )}
            
            {activeTab === 'settings' && (
              <ProfileTab
                user={user}
                setUser={setUser}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                setLeagueSettingsOpen={setLeagueSettingsOpen}
                onSignOut={async () => {
                  await signOut()
                  setUser(null)
                }}
              />
            )}
          </>
        )}
      </main>

      <SubmitBar
        changeCount={pickDiff.total}
        isSubmitting={isSubmittingPicks}
        onSubmit={handleSubmitPicks}
        isVisible={!isHistorical && activeTab === 'picks' && pickDiff.total > 0}
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
        setCurrentLeague={(league: League) => {
          setLeagues(prev => [...prev.filter(l => l.id !== league.id), league])
          setCurrentLeague(league)
        }}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        currentUserId={user.id}
        currentWeek={currentWeek}
        currentYear={currentYear}
        onLeagueJoined={(league: League) => {
          setLeagues(prev => [...prev, league])
          setCurrentLeague(league)
        }}
        onLeagueCreated={(league: League) => {
          setLeagues(prev => [...prev, league])
          setCurrentLeague(league)
        }}
      />
    </div>
  )
}

function formatGameTime(commenceTime: string, status: string): string {
  if (status === 'final') return 'FINAL'
  if (status === 'live') return 'LIVE'

  const date = new Date(commenceTime)
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
  return `${days[date.getDay()]} ${timeStr}`
}
