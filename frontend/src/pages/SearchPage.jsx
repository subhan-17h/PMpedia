import { useState, useRef } from 'react';
import { searchPerStandard } from '../api/client';

const STANDARDS = [
  { key: 'PMBOK7',    cls: 'pmbok7',  label: 'PMBOK 7' },
  { key: 'PRINCE2',   cls: 'prince2', label: 'PRINCE2' },
  { key: 'ISO 21502', cls: 'iso',     label: 'ISO 21502' },
];

const QUICK = [
  'Risk management',
  'Stakeholder engagement',
  'Project governance',
  'Change control',
  'Quality management',
  'Benefits realization',
  'Project lifecycle',
];

function stdClass(standard) {
  const s = (standard || '').toLowerCase();
  if (s.includes('pmbok'))  return 'pmbok7';
  if (s.includes('prince')) return 'prince2';
  if (s.includes('iso'))    return 'iso';
  return '';
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="sk" style={{ height: 14, width: '70%' }} />
      <div className="sk" style={{ height: 11, width: '90%' }} />
      <div className="sk" style={{ height: 11, width: '80%' }} />
      <div className="sk" style={{ height: 11, width: '55%' }} />
    </div>
  );
}

function ResultCard({ result, std }) {
  const cls = stdClass(std);
  return (
    <div className={`result-card ${cls}`}>
      <div className="result-card-top">
        <div className="result-title">{result.title || 'Untitled section'}</div>
        <div className="result-score">{(result.score * 100).toFixed(0)}%</div>
      </div>
      <div className="result-text">{result.text}</div>
      {result.deep_link && (
        <a className="result-link" href={result.deep_link}>
          <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
            <path d="M8.5 1.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V3.914L7.207 9.207a1 1 0 0 1-1.414-1.414L11.086 2.5H9.5a1 1 0 0 1-1-1z"/>
            <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2H7a1 1 0 0 1 0 2H3.5v9h9V9a1 1 0 1 1 2 0v3.5A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-9z"/>
          </svg>
          {result.section_id || result.deep_link}
        </a>
      )}
    </div>
  );
}

function StdColumn({ stdConfig, data, loading }) {
  const { key, cls, label } = stdConfig;
  const results = data?.results ?? [];

  return (
    <div className="std-col">
      <div className={`std-col-header ${cls}`}>
        <span className="std-dot" />
        {label}
        {!loading && (
          <span className="std-col-count">{results.length} result{results.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : results.length === 0 ? (
        <div className="col-empty">No results found</div>
      ) : (
        results.map((r, i) => (
          <ResultCard key={r.chunk_id || i} result={r} std={key} />
        ))
      )}
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery]           = useState('');
  const [submitted, setSubmitted]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [colData, setColData]       = useState(null);
  const inputRef = useRef(null);

  const runSearch = async (q) => {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setSubmitted(text);
    setLoading(true);
    setColData(null);

    const results = await searchPerStandard({ query: text, topK: 4 });
    setColData(results);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') runSearch();
  };

  const showResults = loading || colData;

  return (
    <div className="page search-page">
      <div className="search-hero">
        <h1>Search PM Standards</h1>
        <p>Find relevant sections across PMBOK7, PRINCE2, and ISO 21502 simultaneously</p>

        <div className="search-bar">
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. risk management, stakeholder engagement..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button onClick={() => runSearch()} disabled={loading || !query.trim()}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {!showResults && (
          <div className="search-chips">
            {QUICK.map((q) => (
              <button key={q} className="search-chip" onClick={() => runSearch(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {showResults && (
        <>
          <div className="search-query-label" style={{ padding: '0 24px 14px', maxWidth: 1280, alignSelf: 'center', width: '100%' }}>
            Results for <span>"{submitted}"</span>
          </div>
          <div className="search-results">
            <div className="results-grid">
              {STANDARDS.map((std) => (
                <StdColumn
                  key={std.key}
                  stdConfig={std}
                  data={colData?.find((d) => d.standard === std.key)}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
