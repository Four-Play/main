"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Trophy, Target, TrendingUp, TrendingDown, Star, CheckCircle2 } from "lucide-react"

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
            The favorite's spread is negative (e.g. <span className="text-red-400 font-black">–7</span>). Add the +13 cushion and your adjusted line is <span className="text-green-400 font-black">+6</span>. That means your team can actually <span className="text-white font-black">lose by up to 6 points</span> and you still win the pick.
          </Rule>

          <Rule icon={TrendingUp} title="Picking the Underdog">
            The underdog's spread is positive (e.g. <span className="text-green-400 font-black">+7</span>). Add the +13 cushion and your adjusted line is <span className="text-green-400 font-black">+20</span>. Your team can <span className="text-white font-black">lose by up to 19 points</span> and you still win the pick.
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
                The favorite can lose by 3 and you still win. If they lose by 4 or more, you lose the pick.
              </p>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
