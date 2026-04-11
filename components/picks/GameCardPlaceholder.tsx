"use client"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Shown when matchups haven't been announced yet.
 * Mirrors the layout of GameCard so the page doesn't jump when real cards load.
 */
export function GameCardPlaceholder() {
  return (
    <Card className="bg-zinc-900 border-zinc-800 opacity-60">
      <CardContent className="p-2">
        {/* Header row */}
        <div className="flex justify-between items-start mb-2">
          <span className="text-[9px] font-black text-zinc-600 bg-zinc-800 px-2 py-1 rounded uppercase">
            TBD
          </span>
          <div className="w-5 h-5 rounded-full border border-zinc-800" />
        </div>

        {/* Two-half layout */}
        <div className="flex gap-2 pointer-events-none">
          <div className="flex-1 rounded-lg p-3 border border-zinc-800">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="flex-1 rounded-lg p-3 border border-zinc-800">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
