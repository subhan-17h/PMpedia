import React, { useState } from 'react';
import { searchStandards } from '../api/client';
import SourcesPanel from './SourcesPanel';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

const ALL_STANDARDS = ['PMBOK7', 'PRINCE2', 'ISO 21502'];

export default function SearchMode() {
  const [query, setQuery] = useState('');
  const [standards, setStandards] = useState([...ALL_STANDARDS]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleStandard = (std) => {
    setStandards((prev) =>
      prev.includes(std) ? prev.filter((s) => s !== std) : [...prev, std]
    );
  };

  const handleSearch = async () => {
    if (!query.trim() || standards.length === 0) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await searchStandards({ query, standards, topK: 8 });
      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <div className="search-container">
        <div className="search-box">
          <input
            id="search-input"
            className="search-input"
            type="text"
            placeholder="Search across PM standards... e.g., 'risk management procedures'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            id="search-btn"
            className="search-btn"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="filters">
          <span className="filter-label">Standards:</span>
          {ALL_STANDARDS.map((std) => (
            <button
              key={std}
              className={`filter-chip ${standards.includes(std) ? 'active' : ''}`}
              data-standard={std}
              onClick={() => toggleStandard(std)}
            >
              {standards.includes(std) ? '✓' : '○'} {std}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingState message="Searching documents..." />}
      {error && <ErrorState message={error} onRetry={handleSearch} />}
      {results && <SourcesPanel sources={results} />}
    </div>
  );
}
