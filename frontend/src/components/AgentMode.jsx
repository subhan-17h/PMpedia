import React, { useState } from 'react';
import { agentQuery } from '../api/client';
import AnswerPanel from './AnswerPanel';
import SourcesPanel from './SourcesPanel';
import AgentTrace from './AgentTrace';
import CoverageBadge from './CoverageBadge';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

const SUGGESTIONS = [
  'Compare how PMBOK7, PRINCE2, and ISO 21502 handle risk management',
  'What is the role of a project sponsor in ISO 21502?',
  'How does PRINCE2 define project governance?',
  'Explain stakeholder engagement across all three standards',
  'What quality management practices does PMBOK7 recommend?',
  'Where does PRINCE2 discuss change control?',
  'Compare planning approaches in all three standards',
];

function formatIntent(intent) {
  return (intent || '').replace(/_/g, ' ');
}

function getStandardClass(standard) {
  const key = (standard || '').toLowerCase().replace(/\s/g, '');
  if (key.includes('pmbok')) return 'pmbok7';
  if (key.includes('prince')) return 'prince2';
  if (key.includes('iso')) return 'iso21502';
  return '';
}

export default function AgentMode() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAsk = async (q) => {
    const questionText = q || question;
    if (!questionText.trim()) return;

    setQuestion(questionText);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await agentQuery({ question: questionText, topK: 5 });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAsk();
  };

  return (
    <div>
      <div className="search-container">
        <div className="search-box">
          <input
            id="agent-input"
            className="search-input"
            type="text"
            placeholder="Ask a question... e.g., 'Compare risk management across all standards'"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            id="agent-btn"
            className="search-btn"
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
          >
            {loading ? 'Thinking...' : 'Ask Agent'}
          </button>
        </div>

        {!result && !loading && (
          <div className="suggestions">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                className="suggestion-chip"
                onClick={() => handleAsk(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <LoadingState
          message="Agent is processing your question..."
          steps={[
            'Classifying intent...',
            'Routing to standards...',
            'Generating queries...',
            'Searching vector store...',
          ]}
        />
      )}

      {error && <ErrorState message={error} onRetry={() => handleAsk()} />}

      {result && (
        <>
          {/* Agent meta bar */}
          <div className="agent-meta">
            <span className="agent-intent">
              🎯 {formatIntent(result.intent)}
            </span>
            <div className="agent-standards">
              {result.required_standards?.map((std) => (
                <span key={std} className={`standard-badge ${getStandardClass(std)}`}>
                  {std}
                </span>
              ))}
            </div>
            <CoverageBadge coverage={result.coverage} />
          </div>

          {/* Answer */}
          <AnswerPanel answer={result.answer} />

          {/* Sources */}
          <SourcesPanel sources={result.sources} />

          {/* Agent trace */}
          <AgentTrace trace={result.trace} />
        </>
      )}
    </div>
  );
}
