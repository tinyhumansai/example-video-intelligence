import { useEffect, useRef, useState } from 'react'
import { recallVideoMemories, queryVideoMemories } from '../api/client'
import type { ChatMessage, VideoHistoryEntry } from '../dashboard/types'

type MemoryChatPanelProps = {
  videoId: string | null
  videoHistory: VideoHistoryEntry[]
  onVideoSelect: (id: string) => void
}

const RECALL_KEYWORDS = ['summarize', 'summary', 'remember', 'recall', 'tell me', 'what do you']

function isRecallQuery(input: string): boolean {
  const lower = input.toLowerCase().trim()
  if (lower.split(/\s+/).length <= 3) return true
  return RECALL_KEYWORDS.some((kw) => lower.includes(kw))
}

function extractAnswer(raw: Record<string, unknown>): string {
  // SDK responses are wrapped: { success, data: { response?, llmContextMessage?, context? } }
  const data = (typeof raw.data === 'object' && raw.data !== null ? raw.data : raw) as Record<string, unknown>
  if (typeof data.response === 'string' && data.response) return data.response
  if (typeof data.llmContextMessage === 'string' && data.llmContextMessage) return data.llmContextMessage
  const ctx = data.context as { chunks?: { content: string }[] } | undefined
  if (ctx?.chunks?.length) {
    return ctx.chunks.map((c) => c.content).join('\n\n')
  }
  return 'No memories found for this video.'
}

export function MemoryChatPanel({ videoId, videoHistory, onVideoSelect }: MemoryChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const recalledRef = useRef<string | null>(null)

  // Reset and auto-recall when videoId changes
  useEffect(() => {
    if (!videoId || recalledRef.current === videoId) return
    recalledRef.current = videoId

    setMessages([])
    setError(null)
    setLoading(true)

    recallVideoMemories(videoId)
      .then((data) => {
        const msg: ChatMessage = {
          id: `recall-${Date.now()}`,
          role: 'system',
          text: extractAnswer(data),
          timestamp: new Date().toLocaleTimeString([], { hour12: false }),
        }
        setMessages([msg])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Recall failed'))
      .finally(() => setLoading(false))
  }, [videoId])

  // Auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading || !videoId) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const data = isRecallQuery(text)
        ? await recallVideoMemories(videoId)
        : await queryVideoMemories(videoId, text)

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: extractAnswer(data),
        timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const disabled = !videoId

  return (
    <article className="panel panel-chat">
      <div className="card-head">
        <h2>Memory Chat</h2>
        {loading && <span>thinking...</span>}
      </div>
      <div className="chat-video-selector">
        <label htmlFor="video-select">Video:</label>
        <select
          id="video-select"
          className="chat-video-select"
          value={videoId ?? ''}
          onChange={(e) => e.target.value && onVideoSelect(e.target.value)}
          disabled={videoHistory.length === 0}
        >
          {videoHistory.length === 0 && <option value="">No videos processed yet</option>}
          {videoHistory.map((v) => (
            <option key={v.videoId} value={v.videoId}>
              {v.name} — {new Date(v.processedAt).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>
      {disabled ? (
        <p className="chat-placeholder">Select or process a video to start chatting.</p>
      ) : (
        <>
          <ul className="chat-messages" ref={listRef}>
            {messages.map((msg) => (
              <li key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
                <span className="thought-time">{msg.timestamp}</span>
                <p>{msg.text}</p>
              </li>
            ))}
            {error && (
              <li className="chat-msg chat-msg-error">
                <p>{error}</p>
              </li>
            )}
          </ul>
          <div className="chat-input-row">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask about this video..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button className="chat-send" onClick={send} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </>
      )}
    </article>
  )
}
