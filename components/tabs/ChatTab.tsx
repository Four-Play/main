"use client"
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Send } from 'lucide-react'

interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles: { username: string | null }[] | { username: string | null } | null
}

interface ChatTabProps {
  currentLeague: string | null
  currentUserId: string
}

export function ChatTab({ currentLeague, currentUserId }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!currentLeague) { setLoading(false); return }
    setLoading(true)
    setMessages([])

    supabase
      .from('league_messages')
      .select('id, user_id, content, created_at, profiles(username)')
      .eq('league_id', currentLeague)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as Message[])
        setLoading(false)
      })

    const channel = supabase
      .channel(`chat:${currentLeague}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'league_messages', filter: `league_id=eq.${currentLeague}` },
        async (payload) => {
          const { data } = await supabase
            .from('league_messages')
            .select('id, user_id, content, created_at, profiles(username)')
            .eq('id', (payload.new as { id: string }).id)
            .single()
          if (data) setMessages(prev => [...prev, data as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentLeague])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const content = text.trim()
    if (!content || !currentLeague || sending) return
    setSending(true)
    setText('')
    inputRef.current?.blur()
    const { error } = await supabase
      .from('league_messages')
      .insert({ league_id: currentLeague, user_id: currentUserId, content })
    if (error) setText(content)
    setSending(false)
  }

  if (!currentLeague) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
        <p className="text-zinc-500 text-[11px] uppercase tracking-widest font-bold">
          No league yet! Join a league to start!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100svh - 230px)' }}>
      <div className="flex-1 overflow-y-auto space-y-2 py-1">
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center pt-16">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No messages yet. Say something!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.user_id === currentUserId
            const profileObj = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
            const username = profileObj?.username ?? 'Player'
            const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', hour12: true,
            })
            const showName = !isMe && (idx === 0 || messages[idx - 1].user_id !== msg.user_id)

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <span className="text-[9px] font-black uppercase text-zinc-500 px-1 mb-0.5">{username}</span>
                )}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                  isMe ? 'bg-green-500 text-black rounded-tr-sm' : 'bg-zinc-800 text-white rounded-tl-sm'
                }`}>
                  <p className="text-[13px] leading-snug break-words">{msg.content}</p>
                </div>
                <span className="text-[8px] text-zinc-600 px-1 mt-0.5">{time}</span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Message..."
          maxLength={500}
          className="flex-1 bg-zinc-900 border border-zinc-700 text-white text-[16px] rounded-full px-4 py-2.5 outline-none focus:border-green-500 placeholder:text-zinc-600 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
        >
          <Send className="w-4 h-4 text-black" />
        </button>
      </div>
    </div>
  )
}
