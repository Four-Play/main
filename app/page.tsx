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
import { EditPicksBar } from '@/components/layout/EditPicksBar'
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
  // A pick is keyed by `${gameId}|${team_selected}` so a user can hold picks
  // on both sides of the same game (each side counts as one of the 4 weekly picks).
  const [picksMap, setPicksMap] = useState<Map<string, Pick>>(new Map()) // current UI state, may include unsaved drafts
  const [savedPickKeys, setSavedPickKeys] = useState<Set<string>>(new Set()) // composite keys known to exist in DB
  const [isSubmittingPicks, setIsSubmittingPicks] = useState(false)
  const [isEditingPicks, setIsEditingPicks] = useState(false)
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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(`/api/games?week=${week}&year=${year}`, { signal: controller.signal })
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
      clearTimeout(timeout)
      setGamesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGames(selectedWeek, currentYear)
  }, [selectedWeek, currentYear, loadGames])

  // Load user's existing picks for this week
  const loadPicks = useCallback(async () => {
    if (!user || !currentLeague) return
    try {
      const picks = await getMyPicks(user.id, currentLeague.id, selectedWeek, currentYear)
      const map = new Map<string, Pick>()
      const saved = new Set<string>()

      for (const pick of picks) {
        const key = pickKey(pick.game_id, pick.team_selected)
        map.set(key, pick)
        saved.add(key)
      }

      setPicksMap(map)
      setSavedPickKeys(saved)
      // Freshly-loaded picks are the committed state — exit any edit session
      setIsEditingPicks(false)
    } catch (err) {
      console.error('Failed to load picks:', err)
    }
  }, [user, currentLeague, selectedWeek, currentYear])

  useEffect(() => {
    loadPicks()
  }, [loadPicks])

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

  // Once the user has submitted picks, further edits are disabled until they
  // explicitly tap "Edit Picks". This prevents accidental changes.
  const picksLocked = savedPickKeys.size > 0 && !isEditingPicks

  const handleTogglePick = (gameId: string, teamSelected: string) => {
    if (!user || !currentLeague) return
    if (picksLocked) return

    const game = games.find(g => g.id === gameId)
    if (!game) return

    // Each game is locked individually once it starts
    if (game.commence_time && new Date(game.commence_time) < new Date()) {
      alert('This game has already started and cannot be changed.')
      return
    }

    const key = pickKey(gameId, teamSelected)

    // Unselect: clicking an already-selected side removes that pick
    if (picksMap.has(key)) {
      setPicksMap(prev => { const n = new Map(prev); n.delete(key); return n })
      return
    }

    // Max 4 picks — each side is its own pick, both sides of a game cost 2
    if (picksMap.size >= 4) return

    const nextPick: Pick = {
      id: `draft-${key}`,
      user_id: user.id,
      league_id: currentLeague.id,
      game_id: gameId,
      team_selected: teamSelected,
      is_locked: false,
      nfl_week: selectedWeek,
      season_year: currentYear,
    }
    setPicksMap(prev => new Map(prev).set(key, nextPick))
  }

  // Compute the diff between local state and last-known DB state
  const pickDiff = useMemo(() => {
    const toSave: Array<{ gameId: string; team: string }> = []
    const toDelete: Array<{ gameId: string; team: string }> = []

    for (const [key, pick] of picksMap) {
      if (!savedPickKeys.has(key)) {
        toSave.push({ gameId: pick.game_id, team: pick.team_selected })
      }
    }
    for (const key of savedPickKeys) {
      if (!picksMap.has(key)) {
        const [gameId, team] = splitPickKey(key)
        toDelete.push({ gameId, team })
      }
    }
    return { toSave, toDelete, total: toSave.length + toDelete.length }
  }, [picksMap, savedPickKeys])

  const handleSubmitPicks = async () => {
    if (!user || !currentLeague) return
    if (pickDiff.total === 0) return
    setIsSubmittingPicks(true)

    // Hard timeout — never leave the spinner hanging forever
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Submission timed out — please try again')), 20000)
    )

    try {
      const now = new Date()
      const canEdit = (gameId: string) => {
        const game = games.find(g => g.id === gameId)
        if (!game?.commence_time) return true
        return new Date(game.commence_time) > now
      }

      const savesToMake = pickDiff.toSave.filter(({ gameId }) => canEdit(gameId))
      const deletesToMake = pickDiff.toDelete.filter(({ gameId }) => canEdit(gameId))

      console.log('[submit] saving:', savesToMake, 'deleting:', deletesToMake)

      const work = Promise.all([
        ...savesToMake.map(({ gameId, team }) =>
          savePick(user.id, currentLeague!.id, gameId, team, selectedWeek, currentYear)
            .catch((err: any) => {
              console.error(`[submit] savePick failed for ${gameId}:`, err)
              throw new Error(`Failed to save pick: ${err?.message ?? 'unknown error'}`)
            })
        ),
        ...deletesToMake.map(({ gameId, team }) =>
          deletePick(user.id, currentLeague!.id, gameId, team)
            .catch((err: any) => {
              console.error(`[submit] deletePick failed for ${gameId}:`, err)
              throw new Error(`Failed to remove pick: ${err?.message ?? 'unknown error'}`)
            })
        ),
      ])

      await Promise.race([work, timeout])

      // Reload authoritative state from DB so the UI matches what was actually saved
      await loadPicks()
    } catch (err: any) {
      console.error('[submit] handleSubmitPicks error:', err)
      alert(err.message ?? 'Failed to submit picks')
    } finally {
      setIsSubmittingPicks(false)
    }
  }

  const handleLeagueChange = (league: League) => {
    setCurrentLeague(league)
    setPicksMap(new Map())
    setSavedPickKeys(new Set())
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
                picksMap={picksMap}
                onTogglePick={handleTogglePick}
                disableInteraction={picksLocked}
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

      <EditPicksBar
        mode={picksLocked ? 'locked' : 'editing'}
        onClick={() => setIsEditingPicks(v => !v)}
        isVisible={
          !isHistorical &&
          activeTab === 'picks' &&
          savedPickKeys.size > 0 &&
          pickDiff.total === 0 &&
          // Hide if every picked game has already started — nothing left to edit
          (() => {
            const now = new Date()
            const pickedGameIds = new Set([...picksMap.values()].map(p => p.game_id))
            return [...pickedGameIds].some(gid => {
              const game = games.find(g => g.id === gid)
              return !game?.commence_time || new Date(game.commence_time) > now
            })
          })()
        }
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

function pickKey(gameId: string, team: string): string {
  return `${gameId}|${team}`
}

function splitPickKey(key: string): [string, string] {
  const idx = key.indexOf('|')
  return [key.slice(0, idx), key.slice(idx + 1)]
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
