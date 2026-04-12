"use client"
import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Crown, Sliders, Loader2, Sun, Moon, Camera, HelpCircle } from "lucide-react"
import { updateProfile, uploadAvatar } from '@/services/authService'
import { useTheme } from '@/lib/theme'
import { HowToPlayModal } from '@/components/modals/HowToPlayModal'
import type { Profile } from '@/types/database'

interface ProfileTabProps {
  user: Profile
  setUser: (user: Profile) => void
  isEditing: boolean
  setIsEditing: (val: boolean) => void
  setLeagueSettingsOpen: (val: boolean) => void
  onSignOut: () => Promise<void>
}

export function ProfileTab({
  user,
  setUser,
  isEditing,
  setIsEditing,
  setLeagueSettingsOpen,
  onSignOut,
}: ProfileTabProps) {
  const [username, setUsername] = useState(user.username)
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? null)
  const [howToPlayOpen, setHowToPlayOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    if (!username.trim() || username.length < 2) {
      alert('Username must be at least 2 characters')
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateProfile(user.id, { username: username.trim() })
      setUser(updated)
      setIsEditing(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await onSignOut()
    } catch (err: any) {
      alert(err.message)
      setIsSigningOut(false)
    }
  }

  const handleCancel = () => {
    setUsername(user.username)
    setIsEditing(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAvatar(true)
    try {
      const url = await uploadAvatar(user.id, file)
      await updateProfile(user.id, { avatar_url: url })
      setAvatarUrl(url)
      setUser({ ...user, avatar_url: url })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsUploadingAvatar(false)
      // Reset so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center pt-8 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Avatar */}
      <div className="relative mb-6">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingAvatar}
          className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.15)] group focus:outline-none"
          aria-label="Upload profile picture"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Profile picture"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <Users className="w-10 h-10 text-green-500" />
            </div>
          )}
          {/* Camera overlay on hover / while uploading */}
          <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {isUploadingAvatar
              ? <Loader2 className="w-6 h-6 text-white animate-spin" />
              : <Camera className="w-6 h-6 text-white" />
            }
          </div>
        </button>
        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-4 border-black pointer-events-none">
          <Crown className="w-3 h-3 text-black" />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {!isEditing ? (
        <div className="w-full flex flex-col items-center space-y-2 mb-8 animate-in fade-in zoom-in-95 duration-300">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">
            {user.username}
          </h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
            Season Points: {user.total_points > 0 ? `+${(user.total_points / 100).toFixed(0)} pts` : user.total_points < 0 ? `-${(Math.abs(user.total_points) / 100).toFixed(0)} pts` : '0 pts'}
          </p>
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
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
              Display Name
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white h-12 focus:ring-green-500 font-bold uppercase text-xs"
              disabled={isSaving}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 border-zinc-800 bg-transparent text-zinc-500 font-black uppercase text-[10px] h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-[2] bg-green-500 text-black font-black uppercase text-[10px] h-12 hover:bg-green-400"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile'}
            </Button>
          </div>
        </div>
      )}

      {/* Theme Toggle */}
      <div className="w-full mb-4">
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1 block mb-2">
          Appearance
        </label>
        <div className="flex rounded-md border border-zinc-700 overflow-hidden">
          <button
            type="button"
            onClick={() => theme === 'light' ? null : toggleTheme()}
            className={`flex-1 h-11 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-colors ${
              theme === 'light'
                ? 'bg-green-500 text-black'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
          <button
            type="button"
            onClick={() => theme === 'dark' ? null : toggleTheme()}
            className={`flex-1 h-11 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-colors ${
              theme === 'dark'
                ? 'bg-green-500 text-black'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
        </div>
      </div>

      <div className="w-full pt-6 border-t border-zinc-900 flex flex-col items-center gap-2">
        <Button
          variant="ghost"
          className="text-zinc-400 font-bold uppercase text-[9px] tracking-widest hover:text-white w-full flex items-center gap-2"
          onClick={() => setHowToPlayOpen(true)}
        >
          <HelpCircle className="w-3.5 h-3.5 text-green-500" />
          How to Play
        </Button>
        {!isEditing && (
          <Button
            variant="ghost"
            className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest hover:text-white w-full"
            onClick={() => setLeagueSettingsOpen(true)}
          >
            League Management
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={isSigningOut}
          className="text-red-500 font-bold uppercase text-[9px] tracking-widest hover:bg-red-500/10 w-full"
          onClick={handleSignOut}
        >
          {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign Out'}
        </Button>
      </div>

      <HowToPlayModal isOpen={howToPlayOpen} onClose={setHowToPlayOpen} />
    </div>
  )
}