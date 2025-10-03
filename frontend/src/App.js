import React, { useState, useEffect } from 'react';
import SearchInterface from './components/SearchInterface';
import ComparisonView from './components/ComparisonView';
import DocumentStats from './components/DocumentStats';
import './App.css';

function App() {
  const [searchResults, setSearchResults] = useState(null);
  const [comparisonResults, setComparisonResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('search'); // 'search' or 'comparison'
  const [documentStats, setDocumentStats] = useState(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [showAllFromStandards, setShowAllFromStandards] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Load document statistics on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (response.ok) {
          const stats = await response.json();
          setDocumentStats(stats);
        }
      } catch (error) {
        console.warn('Could not load document statistics:', error);
      }
    };

    loadStats();
  }, [API_BASE_URL]);

  const performSearch = async (query, options = {}) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setShowAllResults(false); // Reset to show limited results on new search
    setShowAllFromStandards(false); // Reset to show top 1 per standard on new search

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        ...options
      });

      const response = await fetch(`${API_BASE_URL}/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const results = await response.json();
      setSearchResults(results);
      setActiveView('search');

    } catch (error) {
      setError(error.message);
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const performComparison = async (query, options = {}) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        maxResults: 5,
        ...options
      });

      const response = await fetch(`${API_BASE_URL}/compare?${params}`);
      
      if (!response.ok) {
        throw new Error(`Comparison failed: ${response.statusText}`);
      }

      const results = await response.json();
      setComparisonResults(results);
      setActiveView('comparison');

    } catch (error) {
      setError(error.message);
      console.error('Comparison error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🎯 PMPedia</h1>
          <p>Search & Compare Project Management Standards</p>
          {documentStats && (
            <div className="quick-stats">
              {Object.entries(documentStats).map(([key, stats]) => (
                <span key={key} className="stat-badge">
                  {stats.standardType}: {stats.validSections} sections
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <SearchInterface 
          onSearch={performSearch}
          onCompare={performComparison}
          loading={loading}
          error={error}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        {error && (
          <div className="error-message">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Searching across all standards...</p>
          </div>
        )}

        {activeView === 'search' && searchResults && !loading && (
          <div className="search-results-container">
            <div className="results-header">
              <h2>🔍 Search Results</h2>
              <p>
                Found <strong>{searchResults.totalResults}</strong> results 
                for "<em>{searchResults.query}</em>"
              </p>
              
              {/* Toggle between top 1 per standard and all results */}
              <div className="toggle-buttons">
                {!showAllFromStandards && searchResults.allResults && searchResults.allResults.length > searchResults.results.length && (
                  <button 
                    className="show-all-standards-btn"
                    onClick={() => setShowAllFromStandards(true)}
                  >
                    Show All Results ({searchResults.allResults.length})
                  </button>
                )}
                {showAllFromStandards && (
                  <button 
                    className="show-top-per-standard-btn"
                    onClick={() => setShowAllFromStandards(false)}
                  >
                    Show Top 1 Per Standard ({searchResults.results.length})
                  </button>
                )}
              </div>

              {/* Current display toggle for limiting visible results */}
              {(() => {
                const currentResults = showAllFromStandards ? searchResults.allResults : searchResults.results;
                return (
                  <div className="display-toggle">
                    {currentResults && currentResults.length > 3 && !showAllResults && (
                      <button 
                        className="show-all-btn"
                        onClick={() => setShowAllResults(true)}
                      >
                        Show All Visible ({currentResults.length})
                      </button>
                    )}
                    {showAllResults && currentResults && currentResults.length > 3 && (
                      <button 
                        className="show-less-btn"
                        onClick={() => setShowAllResults(false)}
                      >
                        Show Less (Top 3)
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div className="results-grid">
              {(() => {
                const currentResults = showAllFromStandards ? searchResults.allResults : searchResults.results;
                const displayResults = showAllResults ? currentResults : (currentResults || []).slice(0, 3);
                
                return displayResults.map((result, index) => (
                  <div key={`${result.standard}-${result.section_number}-${index}`} className="result-card">
                    <div className="result-header">
                      <span className={`standard-badge ${(result.standard || result.standardType || '').toLowerCase()}`}>
                        {result.standard || result.standardType}
                      </span>
                    </div>
                    
                    <h3>{result.section_title || result.title}</h3>
                    
                    {result.parent_chain && result.parent_chain.length > 0 && (
                      <div className="breadcrumb">
                        {result.parent_chain.map((parent, idx) => (
                          <span key={idx} className="breadcrumb-item">
                            {parent.title || parent.section_number}
                            {idx < result.parent_chain.length - 1 && ' > '}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="result-content">
                      <p>{(result.text || result.content || '').substring(0, 300)}...</p>
                    </div>
                    
                    <div className="result-footer">
                      <span className="section-number">Section: {result.section_number}</span>
                      <span className="page-info">
                        {result.page_start && result.page_end ? 
                          `Pages: ${result.page_start}-${result.page_end}` : 
                          `Level: ${result.level || 'N/A'}`
                        }
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {activeView === 'comparison' && comparisonResults && !loading && (
          <ComparisonView results={comparisonResults} />
        )}

        {documentStats && (
          <DocumentStats stats={documentStats} />
        )}
      </main>

      <footer className="app-footer">
        <p>PMPedia - Powered by PMBOK 7, PRINCE2, and ISO 21500</p>
      </footer>
    </div>
  );
}

export default App;
