"use client"
import React, { useState } from 'react'
import { Ticket, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface ResetPasswordScreenProps {
  onSubmit: (newPassword: string) => Promise<void>
}

export function ResetPasswordScreen({ onSubmit }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await onSubmit(password)
      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-black text-white font-sans">
      <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 rotate-3 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            <Ticket className="text-black w-7 h-7" />
          </div>
          <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase italic">
            New Password
          </CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            {done ? "Password updated" : "Choose a new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-center text-zinc-400 text-sm">
              You're all set. <span className="text-green-500 font-bold">Sign in</span> with your new password.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500 pr-12"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500"
                required
                minLength={6}
                disabled={isLoading}
              />
              {error && (
                <p className="text-red-400 text-xs text-center">{error}</p>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-green-500 hover:bg-green-600 text-black font-black uppercase tracking-widest transition-transform active:scale-95"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
