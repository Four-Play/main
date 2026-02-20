"use client"
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SelectionSlipProps {
  selectedCount: number;
  maxPicks: number;
  isLoading: boolean;
  onLockIn: () => Promise<void>;
  isVisible: boolean;
}

export function SelectionSlip({ 
  selectedCount, 
  maxPicks, 
  isLoading, 
  onLockIn, 
  isVisible 
}: SelectionSlipProps) {
  
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md z-[100] px-4 animate-in slide-in-from-bottom-10">
      <Card className="bg-green-500 border-none shadow-[0_20px_60px_rgba(34,197,94,0.5)] overflow-hidden rounded-full p-2 flex items-center justify-between">
        <span className="pl-6 text-black font-black italic uppercase text-[10px] tracking-widest">
          {selectedCount}/{maxPicks} PICKS SELECTED
        </span>
        <Button 
          disabled={selectedCount < maxPicks || isLoading} 
          onClick={onLockIn}
          className="h-10 px-8 rounded-full font-black text-[10px] tracking-widest uppercase bg-black text-green-500 hover:bg-zinc-900 transition-colors"
        >
          {isLoading ? "Saving..." : "LOCK IN"}
        </Button>
      </Card>
    </div>
  );
}