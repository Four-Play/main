"use client"
import { useEffect, useState } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(target: string): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - Date.now())
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

interface CountdownProps {
  targetDate: string   // ISO date string
  label: string        // e.g. "2026 NBA Playoffs"
  sublabel?: string    // e.g. "Play-In Tournament · April 14"
}

export function Countdown({ targetDate, label, sublabel }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(targetDate))

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-green-500">{label}</p>
        {sublabel && (
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">{sublabel}</p>
        )}
      </div>

      <div className="flex items-end gap-3">
        {[
          { value: timeLeft.days,    unit: 'Days' },
          { value: timeLeft.hours,   unit: 'Hrs' },
          { value: timeLeft.minutes, unit: 'Min' },
          { value: timeLeft.seconds, unit: 'Sec' },
        ].map(({ value, unit }) => (
          <div key={unit} className="flex flex-col items-center gap-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-16 h-16 flex items-center justify-center">
              <span className="text-2xl font-black text-white tabular-nums">{pad(value)}</span>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">{unit}</span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
        Picks open when the games drop
      </p>
    </div>
  )
}
