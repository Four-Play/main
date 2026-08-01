"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Trophy, Zap } from "lucide-react"

interface HowToPlayModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
}

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
        <span className="text-[9px] font-black text-black">{n}</span>
      </div>
      <p className="text-[11px] font-black uppercase tracking-widest text-white">{title}</p>
    </div>
  )
}

function MiniPickButton({ team, spreadLabel, adjLabel, selected }: {
  team: string
  spreadLabel: string
  adjLabel: string
  selected?: boolean
}) {
  const spreadIsNeg = spreadLabel.startsWith('–') || spreadLabel.startsWith('-')
  return (
    <div className={`flex-1 rounded-lg p-2 border ${selected ? 'border-green-500 bg-green-500/10' : 'border-zinc-800'}`}>
      <p className="font-bold text-[11px] text-white uppercase leading-tight">{team}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-[9px] font-mono">
          <span className="text-zinc-500">Spread: </span>
          <span className={spreadIsNeg ? 'text-red-400' : 'text-green-400'}>{spreadLabel}</span>
        </p>
        <p className="text-[9px] font-mono">
          <span className="text-zinc-500">Adj: </span>
          <span className="text-green-400">{adjLabel}</span>
        </p>
      </div>
    </div>
  )
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-green-500 uppercase font-black italic tracking-widest">
            How to Play
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-[10px] uppercase font-bold">
            The +13 Cushion Game
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-7 py-4 overflow-y-auto flex-1 min-h-0 pr-1">

          {/* ── Step 1: Make picks + Cushion ── */}
          <div>
            <StepHeader n={1} title="Make 4 Picks Each Week" />
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 mb-3">
              <div className="flex gap-1.5 mb-2.5">
                {['CHIEFS', 'BILLS', 'RAVENS', '?'].map((label, i) => {
                  const filled = i < 3
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-9 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${
                        filled ? 'border-green-500/40 bg-green-500/5' : 'border-dashed border-zinc-700'
                      }`}
                    >
                      {filled ? (
                        <>
                          <span className="text-[7px] font-black uppercase text-zinc-300">{label}</span>
                          <span className="text-green-500 text-[8px] font-black">✓</span>
                        </>
                      ) : (
                        <span className="text-[13px] text-zinc-700 font-black leading-none">+</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mb-1.5">
                <span className="text-[8px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono uppercase">SUN 4:25 PM</span>
              </div>
              <div className="flex gap-2">
                <MiniPickButton team="CHIEFS" spreadLabel="–10" adjLabel="+3" selected />
                <MiniPickButton team="EAGLES" spreadLabel="+10" adjLabel="+23" />
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
              Choose the Favorite or Underdog for <span className="text-white font-black">4 games</span> each week. Every pick comes with a <span className="text-white font-black">+13 point cushion</span> on top of the spread — your team doesn't need to cover the line, just stay within 13.
            </p>

            {/* Cushion equation */}
            <div className="flex items-center justify-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-3">
              <div className="text-center">
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-0.5">Spread</p>
                <p className="text-2xl font-black font-mono text-red-400">–10</p>
              </div>
              <p className="text-zinc-600 font-black text-xl pb-2">+</p>
              <div className="text-center">
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-0.5">Cushion</p>
                <p className="text-2xl font-black font-mono text-green-400">+13</p>
              </div>
              <p className="text-zinc-600 font-black text-xl pb-2">=</p>
              <div className="text-center">
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-0.5">Your Line</p>
                <p className="text-2xl font-black font-mono text-green-400">+3</p>
              </div>
            </div>

            {/* Win / Loss bar */}
            <div className="mb-3">
              <div className="flex h-8 rounded-lg overflow-hidden border border-zinc-800">
                <div className="w-[38%] bg-red-500/15 border-r border-red-500/20 flex items-center justify-center">
                  <span className="text-[9px] font-black text-red-400">LOSS</span>
                </div>
                <div className="flex-1 bg-green-500/10 flex items-center justify-center">
                  <span className="text-[9px] font-black text-green-400">WIN</span>
                </div>
              </div>
              <div className="flex mt-1 px-0.5">
                <div className="w-[38%] text-center">
                  <span className="text-[8px] text-zinc-600 font-mono">lose by 3+</span>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-[8px] text-zinc-500 font-mono">lose by ≤2, or win</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">
              Chiefs picked at –10: adjusted line is <span className="text-green-400 font-black">+3</span>, so they can lose by up to 2 and you still win. You need to go <span className="text-white font-black">4-for-4</span> — one wrong pick loses the week.
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Hit <span className="text-white font-black">Submit</span> to lock in your picks. Each game locks individually at its own kickoff — you can still edit other picks after an early game kicks off.
            </p>
          </div>

          {/* ── Step 2: Scoring ── */}
          <div>
            <StepHeader n={2} title="How Points Work" />

            <p className="text-[11px] text-zinc-400 leading-relaxed mb-4">
              Each loser pays the <span className="text-white font-black">league stake (50 pts)</span> to <span className="text-white font-black">every winner</span>. More winners = less you earn. Fewer winners = bigger payday.
            </p>

            {/* Scenario A: 1 winner */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mb-3">
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">1 Winner</span>
                <span className="text-[9px] font-mono text-zinc-600">4 × 50 = 200 pt pot</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex gap-1.5">
                  {[['You', '–50'], ['Player B', '–50'], ['Player C', '–50'], ['Player D', '–50']].map(([n, p]) => (
                    <div key={n} className="flex-1 rounded-lg bg-red-500/8 border border-red-500/15 p-1.5 text-center">
                      <p className="text-[8px] text-zinc-500">{n}</p>
                      <p className="text-[10px] font-black text-red-400">{p}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-[8px] text-zinc-600 font-mono">200 pts →</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1 rounded-lg bg-green-500/8 border border-green-500/20 p-1.5 text-center">
                    <p className="text-[8px] text-zinc-400">Player E</p>
                    <p className="text-[13px] font-black text-green-400">+200</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario B: multiple winners */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mb-3">
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">3 Winners</span>
                <span className="text-[9px] font-mono text-zinc-600">each loser pays 3 × 50</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex gap-1.5">
                  {[['You', '–150'], ['Player B', '–150']].map(([n, p]) => (
                    <div key={n} className="flex-1 rounded-lg bg-red-500/8 border border-red-500/15 p-1.5 text-center">
                      <p className="text-[8px] text-zinc-500">{n}</p>
                      <p className="text-[10px] font-black text-red-400">{p}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-[8px] text-zinc-600 font-mono">each winner gets 2 × 50</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
                <div className="flex gap-1.5">
                  {['Player C', 'Player D', 'Player E'].map(n => (
                    <div key={n} className="flex-1 rounded-lg bg-green-500/8 border border-green-500/20 p-1.5 text-center">
                      <p className="text-[8px] text-zinc-400">{n}</p>
                      <p className="text-[10px] font-black text-green-400">+100</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scenario C: no winners */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">0 Winners</span>
                <span className="text-[9px] font-mono text-zinc-600">nobody went 4-for-4</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex gap-1.5">
                  {['You', 'Player B', 'Player C', 'Player D', 'Player E'].map(n => (
                    <div key={n} className="flex-1 rounded-lg border border-zinc-800 p-1.5 text-center">
                      <p className="text-[8px] text-zinc-600">{n}</p>
                      <p className="text-[10px] font-black text-zinc-500">0</p>
                    </div>
                  ))}
                </div>
                <p className="text-center text-[9px] text-zinc-600 pt-1">No points change — the round is a wash.</p>
              </div>
            </div>
          </div>

          {/* ── Playoffs ── */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-green-500" />
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Playoffs</p>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Fewer picks required each round — but the cushion shrinks too. Go perfect on all required picks to win the week.
            </p>
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              {[
                { round: 'Wild Card',    cushion: 10, picks: 3, barW: 'w-[77%]' },
                { round: 'Divisional',   cushion: 7,  picks: 3, barW: 'w-[54%]' },
                { round: 'Conf. Champ.', cushion: 3,  picks: 2, barW: 'w-[23%]' },
                { round: 'Super Bowl',   cushion: 0,  picks: 1, barW: 'w-0' },
              ].map((r, i) => (
                <div key={r.round} className={`flex items-center gap-3 px-3 py-2 ${i < 3 ? 'border-b border-zinc-800' : ''}`}>
                  <div className="w-[90px] flex-shrink-0">
                    <p className="text-[10px] text-zinc-300">{r.round}</p>
                    <p className="text-[8px] text-zinc-600">{r.picks} pick{r.picks !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-green-500 rounded-full ${r.barW}`} />
                    </div>
                    <span className="text-[10px] font-black font-mono text-green-400 w-6 text-right">+{r.cushion}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500">
              Super Bowl cushion is <span className="text-white font-bold">0</span> — your pick must actually cover the spread to win.
            </p>
          </div>

          {/* ── Over / Under ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                <Zap className="w-2.5 h-2.5 text-green-500" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-white">Over / Under (Playoffs Only)</p>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
              In every playoff round you can also pick the <span className="text-white font-black">combined score</span> going Over or Under — it counts as one of your required picks. The round cushion applies here too.
            </p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3">Wild Card · Total Line 47.5 · Cushion +10</p>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-zinc-800 p-2.5 text-center">
                  <p className="text-[11px] font-black text-white uppercase mb-1">OVER</p>
                  <p className="text-[9px] font-mono text-zinc-500">Win if combined &gt;</p>
                  <p className="text-[14px] font-black font-mono text-green-400">37.5</p>
                  <p className="text-[8px] text-zinc-700 mt-0.5">47.5 – 10</p>
                </div>
                <div className="flex-1 rounded-lg border border-zinc-800 p-2.5 text-center">
                  <p className="text-[11px] font-black text-white uppercase mb-1">UNDER</p>
                  <p className="text-[9px] font-mono text-zinc-500">Win if combined &lt;</p>
                  <p className="text-[14px] font-black font-mono text-green-400">57.5</p>
                  <p className="text-[8px] text-zinc-700 mt-0.5">47.5 + 10</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
