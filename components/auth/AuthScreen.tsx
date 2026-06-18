"use client"
import React, { useState } from 'react'
import { UserPlus, Ticket, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface AuthScreenProps {
  isSignUp: boolean
  setIsSignUp: (val: boolean) => void
  handleAuth: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading?: boolean
  onRequestPasswordReset: (email: string) => Promise<void>
}

export function AuthScreen({ isSignUp, setIsSignUp, handleAuth, isLoading = false, onRequestPasswordReset }: AuthScreenProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError('')
    try {
      await onRequestPasswordReset(forgotEmail)
      setForgotSent(true)
    } catch (err: any) {
      setForgotError(err.message ?? 'Something went wrong')
    } finally {
      setForgotLoading(false)
    }
  }

  const backToSignIn = () => {
    setShowForgot(false)
    setForgotSent(false)
    setForgotEmail('')
    setForgotError('')
    setIsSignUp(false)
  }

  if (showForgot) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-black text-white font-sans">
        <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 rotate-3 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
              <Ticket className="text-black w-7 h-7" />
            </div>
            <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase italic">
              Reset Password
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium">
              {forgotSent ? "Check your email" : "Enter your email to get a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forgotSent ? (
              <div className="space-y-4">
                <p className="text-center text-zinc-400 text-sm">
                  We sent a reset link to <span className="text-green-500 font-bold">{forgotEmail}</span>. Tap it to set a new password.
                </p>
                <button
                  type="button"
                  onClick={backToSignIn}
                  className="w-full text-zinc-500 text-xs font-bold hover:text-green-500 transition-colors py-2 uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500"
                  required
                  disabled={forgotLoading}
                />
                {forgotError && (
                  <p className="text-red-400 text-xs text-center">{forgotError}</p>
                )}
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-black font-black uppercase tracking-widest transition-transform active:scale-95"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
                </Button>
                <button
                  type="button"
                  onClick={backToSignIn}
                  className="w-full text-zinc-500 text-xs font-bold hover:text-green-500 transition-colors py-2 uppercase tracking-widest flex items-center justify-center gap-2"
                  disabled={forgotLoading}
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-black text-white font-sans">
      <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 rotate-3 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
            {isSignUp ? <UserPlus className="text-black w-7 h-7" /> : <Ticket className="text-black w-7 h-7" />}
          </div>
          <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase italic">
            {isSignUp ? "Wanna Fourplay?" : "Fourplay"}
          </CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            {isSignUp ? "Create your player profile" : "The +13 Cushion Game"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              {isSignUp && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <Input
                    name="name"
                    placeholder="Display Name"
                    className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}
              <Input
                name="email"
                type="email"
                placeholder="Email Address"
                className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500"
                required
                disabled={isLoading}
              />
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
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
                  aria-label="Hold to show password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-green-500 hover:bg-green-600 text-black font-black uppercase tracking-widest transition-transform active:scale-95"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isSignUp ? "Create Account" : "Sign In"
              }
            </Button>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="w-full text-zinc-600 text-xs font-bold hover:text-zinc-400 transition-colors py-1 uppercase tracking-widest"
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-zinc-500 text-xs font-bold hover:text-green-500 transition-colors py-2 uppercase tracking-widest"
              disabled={isLoading}
            >
              {isSignUp ? "Already a member? Log In" : "New User? Create Account"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
