"use client"
import React from 'react'

interface WeekSwitcherProps {
  selectedWeek: number
  onSelectWeek: (week: number) => void
  weeks: number[]
}

export function WeekSwitcher({ selectedWeek, onSelectWeek, weeks }: WeekSwitcherProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {weeks.map((w) => (
        <button
          key={w}
          onClick={() => onSelectWeek(w)}
          className={`flex-shrink-0 px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
            selectedWeek === w
              ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          WK {w}
        </button>
      ))}
    </div>
  )
}