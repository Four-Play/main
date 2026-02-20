"use client"

import React from 'react';
import { UserPlus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface AuthScreenProps {
  isSignUp: boolean;
  setIsSignUp: (val: boolean) => void;
  handleAuth: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function AuthScreen({ isSignUp, setIsSignUp, handleAuth }: AuthScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-black text-white font-sans transition-all duration-500">
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
              {/* --- NAME FIELD: SIGN UP ONLY --- */}
              {isSignUp && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <Input 
                    name="name" 
                    placeholder="Full Name" 
                    className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500" 
                    required 
                  />
                </div>
              )}
              
              <Input 
                name="email" 
                type="email" 
                placeholder="Email Address" 
                className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500" 
                required 
              />
              <Input 
                name="password" 
                type="password" 
                placeholder="Password" 
                className="bg-zinc-900 border-zinc-700 text-white h-12 focus:ring-green-500" 
                required 
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-green-500 hover:bg-green-600 text-black font-black uppercase tracking-widest transition-transform active:scale-95"
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
            
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)} 
              className="w-full text-zinc-500 text-xs font-bold hover:text-green-500 transition-colors py-2 uppercase tracking-widest"
            >
              {isSignUp ? "Already a member? Log In" : "New User? Create Account"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}