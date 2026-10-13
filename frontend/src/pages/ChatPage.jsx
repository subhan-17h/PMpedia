import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { agentQuery } from '../api/client';

const SUGGESTIONS = [
  'Compare how PMBOK7, PRINCE2, and ISO 21502 handle risk management',
  'What is the role of a project sponsor in ISO 21502?',
  'How does PRINCE2 define project governance?',
  'Explain stakeholder engagement across all three standards',
  'What quality management practices does PMBOK7 recommend?',
  'Compare planning approaches in all three standards',
];

function stdClass(std) {
  const s = (std || '').toLowerCase();
  if (s.includes('pmbok'))  return 'pmbok7';
  if (s.includes('prince')) return 'prince2';
  if (s.includes('iso'))    return 'iso';
  return '';
}

function coverageClass(coverage) {
  if (!coverage) return '';
  if (coverage.is_sufficient) return 'full';
  if (coverage.missing_standards?.length > 0) return 'miss';
  return 'partial';
}

function coverageLabel(coverage) {
  if (!coverage) return '';
  if (coverage.is_sufficient) return '✓ Full coverage';
  const missing = coverage.missing_standards ?? [];
  const weak    = coverage.weak_standards ?? [];
  if (missing.length > 0) return `Missing: ${missing.join(', ')}`;
  if (weak.length > 0)    return `Weak: ${weak.join(', ')}`;
  return 'Partial';
}

function TypingIndicator() {
  return (
    <div className="typing-row">
      <div className="typing-avatar">⬡</div>
      <div className="typing-dots">
        <div className="t-dot" />
        <div className="t-dot" />
        <div className="t-dot" />
      </div>
    </div>
  );
}

function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="msg-sources">
      <details>
        <summary className="sources-summary">
          <svg className="chevron" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {sources.length} source{sources.length !== 1 ? 's' : ''}
        </summary>
        <div className="sources-grid">
          {sources.map((src, i) => (
            <div key={src.chunk_id || i} className="src-chip">
              <span className={`src-std ${stdClass(src.standard)}`}>
                {src.standard}
              </span>
              <div className="src-info">
                <div className="src-title">{src.title || 'Section'}</div>
                {src.text && <div className="src-text">{src.text}</div>}
              </div>
              <div className="src-score">{(src.score * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function Trace({ trace }) {
  if (!trace?.length) return null;
  return (
    <div className="msg-trace">
      <details>
        <summary className="trace-summary">
          <svg className="chevron" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Agent trace ({trace.length} steps)
        </summary>
        <div className="trace-steps">
          {trace.map((step, i) => (
            <div key={i} className="trace-step">{step}</div>
          ))}
        </div>
      </details>
    </div>
  );
}

function AssistantMessage({ msg }) {
  const covCls   = coverageClass(msg.coverage);
  const covLabel = coverageLabel(msg.coverage);
  return (
    <div className="msg-row assistant">
      <div className="msg-avatar">⬡</div>
      <div className="msg-body">
        <div className="md">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.answer}</ReactMarkdown>
        </div>

        {/* meta: intent + standards + coverage */}
        {(msg.intent || msg.required_standards?.length) && (
          <div className="msg-meta">
            {msg.intent && (
              <span className="intent-badge">{msg.intent.replace(/_/g, ' ')}</span>
            )}
            {msg.required_standards?.map((std) => (
              <span key={std} className={`std-badge ${stdClass(std)}`}>{std}</span>
            ))}
            {covCls && (
              <span className={`cov-badge ${covCls}`} title={msg.coverage?.reason}>
                {covLabel}
              </span>
            )}
          </div>
        )}

        <Sources sources={msg.sources} />
        <Trace   trace={msg.trace} />
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  return (
    <div className="msg-row user">
      <div className="msg-avatar">U</div>
      <div className="msg-body">{text}</div>
    </div>
  );
}

function Welcome({ onSelect }) {
  return (
    <div className="chat-welcome">
      <div className="chat-welcome-icon">⬡</div>
      <h2>PM Standards Assistant</h2>
      <p>Ask anything about PMBOK7, PRINCE2, or ISO 21502 — compare, explain, or explore across all three.</p>
      <div className="chat-suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chat-sug" onClick={() => onSelect(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef  = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const data = await agentQuery({ question: q, topK: 5, showTrace: true });
      setMessages((prev) => [
        ...prev,
        {
          role:               'assistant',
          answer:             data.answer,
          intent:             data.intent,
          required_standards: data.required_standards,
          coverage:           data.coverage,
          sources:            data.sources,
          trace:              data.trace,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', answer: `**Error:** ${err.message}`, sources: [], trace: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="page chat-page">
      {messages.length === 0 && !loading ? (
        <Welcome onSelect={send} />
      ) : (
        <div className="chat-messages">
          {messages.map((msg, i) =>
            msg.role === 'user'
              ? <UserMessage key={i} text={msg.text} />
              : <AssistantMessage key={i} msg={msg} />
          )}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="chat-input-bar">
        <div className="chat-input-wrap">
          <div className="chat-input-box">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask about PM standards…"
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="send-btn"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 8 2 2l3 6-3 6 12-6z"/>
              </svg>
            </button>
          </div>
          <div className="chat-hint">Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </div>
  );
}
