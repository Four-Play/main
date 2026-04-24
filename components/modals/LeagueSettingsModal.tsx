"use client"
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Crown, Copy, Check, Trash2, Loader2, FlaskConical, Play, Lock, Unlock } from "lucide-react"
import { updateLeague, deleteLeague } from '@/services/leagueService'
import type { League } from '@/types/database'

interface LeagueSettingsModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  currentLeague: League | null
  onLeagueUpdated: (league: League) => void
  currentWeek: number
  currentYear: number
  currentUserId: string
}

export function LeagueSettingsModal({
  isOpen,
  onClose,
  currentLeague,
  onLeagueUpdated,
  currentWeek,
  currentYear,
  currentUserId,
}: LeagueSettingsModalProps) {
  const [name, setName] = useState('')
  const [payoutDollars, setPayoutDollars] = useState('50')
  const [isLeagueLocked, setIsLeagueLocked] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [copied, setCopied] = useState(false)

  const isAdmin = currentLeague?.admin_id === currentUserId

  // Dev tools state
  const [simWeek, setSimWeek] = useState(1)
  const [isScoring, setIsScoring] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [devMessage, setDevMessage] = useState('')

  useEffect(() => {
    if (currentLeague) {
      setName(currentLeague.name)
      setPayoutDollars(String(currentLeague.payout_per_loss_cents / 100))
      setIsLeagueLocked(currentLeague.is_locked ?? false)
    }
    setSimWeek(currentWeek)
  }, [currentLeague, currentWeek])

  if (!currentLeague) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(currentLeague.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!name.trim() || name.length < 3) {
      alert('League name must be at least 3 characters')
      return
    }
    const dollars = parseFloat(payoutDollars)
    if (isNaN(dollars) || dollars < 1) {
      alert('Stake must be at least 1 point')
      return
    }
    setIsSaving(true)
    try {
      // Only include is_locked when the admin has actually toggled it — avoids
      // a schema error if the is_locked column hasn't been added to Supabase yet.
      const lockChanged = isAdmin && isLeagueLocked !== (currentLeague.is_locked ?? false)
      const updated = await updateLeague(currentLeague.id, {
        name: name.trim(),
        payout_per_loss_cents: Math.round(dollars * 100),
        ...(lockChanged && { is_locked: isLeagueLocked }),
      })
      onLeagueUpdated(updated)
      onClose(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = confirm(
      `Delete "${currentLeague.name}"? This removes all picks and results for everyone in the league. This cannot be undone.`
    )
    if (!confirmed) return
    setIsDeleting(true)
    try {
      await deleteLeague(currentLeague.id)
      localStorage.removeItem('lastLeagueId')
      onClose(false)
      window.location.href = '/'
    } catch (err: any) {
      alert(err.message)
      setIsDeleting(false)
    }
  }

  const handleReset = async () => {
    const confirmed = confirm(
      `Reset "${currentLeague.name}"? This clears all picks, results, standings, and the games cache. Member accounts stay. This cannot be undone.`
    )
    if (!confirmed) return
    setIsResetting(true)
    try {
      const res = await fetch('/api/admin/reset-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: currentLeague.id, clearGames: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDevMessage('✓ League reset — all picks, results, and games cleared')
    } catch (err: any) {
      setDevMessage(`✗ ${err.message}`)
    } finally {
      setIsResetting(false)
    }
  }

  const handleRunScoring = async () => {
    setIsScoring(true)
    setDevMessage('')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch('/api/admin/score', { method: 'POST', signal: controller.signal })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDevMessage(`✓ Scored ${data.picksScored} picks across ${data.weeksCalculated} week(s)`)
    } catch (err: any) {
      setDevMessage(`✗ ${err.name === 'AbortError' ? 'Request timed out' : err.message}`)
    } finally {
      clearTimeout(timeout)
      setIsScoring(false)
    }
  }

  const handleSimulateWeek = async () => {
    setIsSimulating(true)
    setDevMessage('')
    try {
      const res = await fetch('/api/admin/simulate-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: simWeek, year: currentYear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDevMessage(
        `✓ Week ${simWeek}: ${data.gamesSimulated} games simulated, ${data.picksScored} picks scored`
      )
    } catch (err: any) {
      setDevMessage(`✗ ${err.message}`)
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-green-500 uppercase font-black italic tracking-widest">
            {isAdmin ? 'League Settings' : 'League Info'}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-[10px] uppercase font-bold">
            {isAdmin ? 'Manage rules and invites' : 'View league rules and invite code'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 min-h-0">

          {/* Non-admin notice */}
          {!isAdmin && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5">
              <Lock className="w-3 h-3 text-zinc-500 flex-shrink-0" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                Only the league creator can edit these settings
              </p>
            </div>
          )}

          {/* League Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
              League Name
            </label>
            {isAdmin ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500 font-bold"
              />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-md flex items-center px-4 h-12 font-bold text-white">
                {name}
              </div>
            )}
          </div>

          {/* Invite Code — everyone can copy */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
              Invite Code
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md flex items-center px-4 font-mono text-sm text-green-500 h-12 tracking-widest">
                {currentLeague.invite_code}
              </div>
              <Button
                variant="outline"
                className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-bold uppercase h-12 px-4"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest px-1">
              Share this code with friends to join
            </p>
          </div>

          {/* Lock League — admin only */}
          {isAdmin && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                New Member Access
              </label>
              <button
                type="button"
                onClick={() => setIsLeagueLocked(prev => !prev)}
                className={`w-full h-12 rounded-md border font-black uppercase text-[10px] tracking-widest flex items-center justify-between px-4 transition-colors ${
                  isLeagueLocked
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isLeagueLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  {isLeagueLocked ? 'League Locked' : 'League Open'}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                  isLeagueLocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {isLeagueLocked ? 'NO NEW MEMBERS' : 'ACCEPTING MEMBERS'}
                </span>
              </button>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest px-1">
                When locked, invite codes are disabled and no one can join
              </p>
            </div>
          )}

          {/* League Stake */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
              League Stake (Points Per Loss)
            </label>
            {isAdmin ? (
              <Input
                type="number"
                min="1"
                step="1"
                value={payoutDollars}
                onChange={(e) => setPayoutDollars(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500 font-bold"
              />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-md flex items-center px-4 h-12 font-bold text-white">
                {payoutDollars} pts
              </div>
            )}
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest px-1">
              Points lost per week if you don't go 4-for-4
            </p>
          </div>

          {/* Spread Cushion (locked) */}
          <div className="space-y-2 opacity-50 pointer-events-none">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Spread Cushion
              </label>
              <Badge className="bg-green-500 text-black text-[8px] h-4 font-black tracking-tighter">
                PREMIUM ONLY
              </Badge>
            </div>
            <div className="relative">
              <Input
                disabled
                value="+13 Points"
                className="bg-zinc-900/50 border-zinc-800 text-zinc-400 h-12 pr-10"
              />
              <Crown className="absolute right-3 top-3.5 w-5 h-5 text-green-500/50" />
            </div>
          </div>

          {/* Dev / Simulate — admin only */}
          {isAdmin && (
            <div className="pt-4 border-t border-zinc-900 space-y-3">
              <div className="flex items-center gap-2 px-1">
                <FlaskConical className="w-3 h-3 text-zinc-500" />
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  Dev Tools
                </label>
              </div>

              <Button
                variant="outline"
                disabled={isScoring}
                onClick={handleRunScoring}
                className="w-full border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-black uppercase text-[10px] h-10 tracking-widest"
              >
                {isScoring
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Play className="w-3 h-3 mr-2" /> Run Scoring Now</>
                }
              </Button>

              <div className="flex gap-2">
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-md px-3 h-10 flex-shrink-0">
                  <span className="text-[10px] text-zinc-500 font-black uppercase">Wk</span>
                  <input
                    type="number"
                    min={1}
                    value={simWeek}
                    onChange={(e) => setSimWeek(Number(e.target.value))}
                    className="w-10 bg-transparent text-white font-mono text-sm text-center outline-none"
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={isSimulating}
                  onClick={handleSimulateWeek}
                  className="flex-1 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-black uppercase text-[10px] h-10 tracking-widest"
                >
                  {isSimulating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Simulate Week'
                  }
                </Button>
              </div>

              {devMessage && (
                <p className={`text-[10px] font-mono px-1 ${devMessage.startsWith('✓') ? 'text-green-500' : 'text-red-400'}`}>
                  {devMessage}
                </p>
              )}
              <p className="text-[9px] text-zinc-700 uppercase tracking-widest px-1">
                Load the week in Picks first, then simulate to auto-score with random results
              </p>
            </div>
          )}

          {/* Danger Zone — admin only */}
          {isAdmin && (
            <div className="pt-4 border-t border-zinc-900 space-y-2">
              <label className="text-[10px] font-black text-red-500 uppercase tracking-widest px-1 block">
                Danger Zone
              </label>
              <Button
                variant="outline"
                disabled={isResetting}
                className="w-full border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400 font-black uppercase text-[10px] h-10 tracking-widest"
                onClick={handleReset}
              >
                {isResetting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><FlaskConical className="w-3.5 h-3.5 mr-2" /> Reset League</>
                }
              </Button>
              <Button
                variant="outline"
                disabled={isDeleting}
                className="w-full border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-black uppercase text-[10px] h-10 tracking-widest"
                onClick={handleDelete}
              >
                {isDeleting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete League</>
                }
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {isAdmin ? (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-green-500 text-black font-black uppercase tracking-widest h-12"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          ) : (
            <Button
              onClick={() => onClose(false)}
              variant="outline"
              className="w-full border-zinc-700 bg-zinc-900 text-white font-black uppercase tracking-widest h-12"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
