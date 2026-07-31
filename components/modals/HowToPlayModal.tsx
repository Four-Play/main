"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Trophy, Target, TrendingUp, TrendingDown, Star, CheckCircle2, Zap } from "lucide-react"

interface HowToPlayModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
}

function Rule({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-green-500" />
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-white mb-1">{title}</p>
        <p className="text-[11px] text-zinc-400 leading-relaxed">{children}</p>
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

        <div className="space-y-5 py-4 overflow-y-auto flex-1 min-h-0">

          {/* The Basics */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">The Basics</p>
            <p className="text-[12px] text-zinc-300 leading-relaxed">
              Each round, every player picks <span className="text-white font-black">4 games</span>. For each game you choose either the <span className="text-white font-black">Favorite</span> or the <span className="text-white font-black">Underdog</span>. Go 4-for-4 to win the week.
            </p>
          </div>

          <Rule icon={Target} title="The +13 Cushion">
            Every pick comes with a built-in <span className="text-white font-black">+13 point cushion</span> on top of the spread. This makes it easier to win — your team doesn't have to cover the line, they just have to stay within the cushion.
          </Rule>

          <Rule icon={TrendingDown} title="Picking the Favorite">
            The favorite's spread is negative (e.g. <span className="text-red-400 font-black">–7</span>). Add the +13 cushion and your adjusted line is <span className="text-green-400 font-black">+6</span>. Your team must <span className="text-white font-black">not lose by 6 or more</span> — so they can lose by up to 5 points and you still win the pick.
          </Rule>

          <Rule icon={TrendingUp} title="Picking the Underdog">
            The underdog's spread is positive (e.g. <span className="text-green-400 font-black">+7</span>). Add the +13 cushion and your adjusted line is <span className="text-green-400 font-black">+20</span>. Your team must <span className="text-white font-black">not lose by 20 or more</span> — so they can lose by up to 19 points and you still win the pick.
          </Rule>

          <Rule icon={CheckCircle2} title="Winning the Week">
            You need to win <span className="text-white font-black">all 4 picks</span> to be a weekly winner. If any single pick loses, you're in the loser pool for that round. There's no partial credit — it's all or nothing.
          </Rule>

          <Rule icon={Star} title="Points & Scoring">
            At the end of each round, every player who <span className="text-white font-black">didn't go 4-for-4</span> loses points equal to the league stake. Those points are split evenly among all players who <span className="text-white font-black">did go 4-for-4</span>. No winners? No points change — the round is a wash.
          </Rule>

          <Rule icon={Trophy} title="Season Standings">
            Season points track your total across all rounds. The leaderboard in the League tab shows where everyone stands. The default league stake is 50 points per loss.
          </Rule>

          {/* Playoffs */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Playoffs</p>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              The playoffs shrink the cushion each round and require fewer picks — go perfect on all your required picks to win the week. Points still work the same way.
            </p>
            <div className="space-y-1.5 pt-1">
              {[
                { round: 'Wild Card',    cushion: 10, picks: 3 },
                { round: 'Divisional',   cushion: 7,  picks: 3 },
                { round: 'Conf. Champ.', cushion: 3,  picks: 2 },
                { round: 'Super Bowl',   cushion: 0,  picks: 1 },
              ].map(r => (
                <div key={r.round} className="flex justify-between items-center">
                  <span className="text-[11px] text-zinc-400">{r.round}</span>
                  <span className="text-[11px] font-mono text-white">
                    +{r.cushion} cushion · {r.picks} pick{r.picks !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-px bg-zinc-800" />
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Example — Wild Card, pick the favorite with a <span className="text-white">–7</span> spread: adjusted line is <span className="text-green-400">–7 + 10 = +3</span>. Your team must not lose by 3 or more.
            </p>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Super Bowl cushion is <span className="text-white">0</span> — your pick must actually beat the spread to win.
            </p>
          </div>

          <Rule icon={Zap} title="Over / Under (Playoffs Only)">
            In every playoff round you can also pick the <span className="text-white font-black">Over or Under</span> on a game's total score — it counts as one of your required picks. The same round cushion applies: <span className="text-white font-black">OVER wins</span> if the combined score exceeds the total line minus the cushion; <span className="text-white font-black">UNDER wins</span> if it stays below the total plus the cushion. Ties count as a loss.
          </Rule>

          {/* O/U example */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">O/U Example — Wild Card</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-zinc-400">Total line</span>
                <span className="text-[11px] font-mono text-zinc-300">47.5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-zinc-400">Wild Card cushion</span>
                <span className="text-[11px] font-mono text-green-400">+10</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-white">OVER wins if total &gt;</span>
                <span className="text-[11px] font-black font-mono text-green-400">37.5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-white">UNDER wins if total &lt;</span>
                <span className="text-[11px] font-black font-mono text-green-400">57.5</span>
              </div>
            </div>
          </div>

          {/* Quick Example */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quick Example</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-zinc-400">Spread</span>
                <span className="text-[11px] font-mono text-red-400">–10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-zinc-400">+13 Cushion</span>
                <span className="text-[11px] font-mono text-green-400">+13</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-white">Adjusted Line (Fav)</span>
                <span className="text-[11px] font-black font-mono text-green-400">+3</span>
              </div>
              <p className="text-[10px] text-zinc-500 pt-1">
                The favorite can lose by up to 2 and you still win. If they lose by 3 or more, you lose the pick.
              </p>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
