import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Support — Fourplay Picks",
  description: "Contact support for Fourplay Picks",
}

export const dynamic = "force-dynamic"

export default function SupportPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-black text-white font-sans">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.1)] p-8 text-center">
        <h1 className="text-3xl font-black tracking-tighter uppercase italic mb-2">
          Support
        </h1>
        <p className="text-zinc-500 font-medium mb-8">
          We&apos;re here to help.
        </p>
        <p className="text-zinc-300 mb-2">For support, contact us at:</p>
        <a
          href="mailto:michaellyonshow@gmail.com"
          className="text-green-500 font-bold text-lg break-all hover:underline"
        >
          michaellyonshow@gmail.com
        </a>
      </div>
    </div>
  )
}
