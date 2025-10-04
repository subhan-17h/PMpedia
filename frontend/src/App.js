import React, { useState, useEffect } from 'react';
import SearchInterface from './components/SearchInterface';
import ComparisonView from './components/ComparisonView';
import DocumentStats from './components/DocumentStats';
import Settings from './components/Settings';
import MarkdownViewer from './components/MarkdownViewer';
import './App.css';

function App() {
  const [searchResults, setSearchResults] = useState(null);
  const [comparisonResults, setComparisonResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('search'); // 'search', 'stats', 'settings', 'fullContent', 'markdown'
  const [documentStats, setDocumentStats] = useState(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [showAllFromStandards, setShowAllFromStandards] = useState(false);
  const [fullContentView, setFullContentView] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchMode, setSearchMode] = useState('search'); // 'search' or 'ai-comparison'
  const [searchOptions, setSearchOptions] = useState({
    standard: '',
    maxResults: 10,
    minScore: 0.1,
    sectionTypes: '',
    excludeAppendix: true
  });

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

    // Merge searchOptions with passed options
    const searchParams = { ...searchOptions, ...options };

    try {
      let response, results;

      if (searchMode === 'ai-comparison') {
        // First get comparison results
        const compareParams = new URLSearchParams({
          q: query.trim(),
          maxResults: 5,
          minScore: 0.1
        });

        response = await fetch(`${API_BASE_URL}/compare?${compareParams}`);
        
        if (!response.ok) {
          throw new Error(`Comparison failed: ${response.statusText}`);
        }

        results = await response.json();
        setComparisonResults(results);
      } else {
        // Regular search
        const params = new URLSearchParams({
          q: query.trim(),
          ...searchParams
        });

        response = await fetch(`${API_BASE_URL}/search?${params}`);
        
        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        results = await response.json();
        setSearchResults(results);
      }

      setActiveView('search');

    } catch (error) {
      setError(error.message);
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };



  const openFullContent = (result) => {
    setFullContentView(result);
    setActiveView('fullContent');
  };

  const closeFullContent = () => {
    setFullContentView(null);
    setActiveView('search');
  };

  const handleSearch = (query) => {
    performSearch(query);
  };

  const popularSearches = [
    "Risk Management",
    "Stakeholder Engagement", 
    "Project Lifecycle",
  ];

  return (
    <div className="App">
      {/* Sidebar Navigation */}
      <nav className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">PMPedia</div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '☰' : '✕'}
          </button>
        </div>
        
        <ul className="sidebar-nav">
          <li className="sidebar-nav-item">
            <button 
              className={`sidebar-nav-link ${activeView === 'search' ? 'active' : ''}`}
              onClick={() => setActiveView('search')}
            >
              <span className="nav-icon">🔍</span>
              <span className="nav-text">Search</span>
            </button>
          </li>
          <li className="sidebar-nav-item">
            <button 
              className={`sidebar-nav-link ${activeView === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveView('stats')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Document Stats</span>
            </button>
          </li>
          <li className="sidebar-nav-item">
            <button 
              className={`sidebar-nav-link ${activeView === 'markdown' ? 'active' : ''}`}
              onClick={() => setActiveView('markdown')}
            >
              <span className="nav-icon">📄</span>
              <span className="nav-text">Documents</span>
            </button>
          </li>
          <li className="sidebar-nav-item">
            <button 
              className={`sidebar-nav-link ${activeView === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveView('settings')}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Settings</span>
            </button>
          </li>
        </ul>
      </nav>

      <main className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Hero Section */}
        {activeView === 'search' && (
          <section className="hero-section">
            <h1 className="hero-title">PMPedia</h1>
            <p className="hero-subtitle">Compare Project Management Standards with Precision</p>
            
            <div className="search-container">
              <SearchInterface 
                onSearch={handleSearch}
                loading={loading}
                error={error}
                searchMode={searchMode}
                setSearchMode={setSearchMode}
                searchOptions={searchOptions}
              />

              <div className="popular-searches">
                <h3 className="popular-title">Popular Searches</h3>
                <div className="popular-chips">
                  {popularSearches.map((search, index) => (
                    <button 
                      key={index} 
                      className="popular-chip"
                      onClick={() => handleSearch(search)}
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {error && (
          <div className="error-message">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}

        {loading && activeView === 'search' && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="spinner"></div>
              <p>Searching across all standards...</p>
            </div>
          </div>
        )}

        {activeView === 'search' && searchMode === 'search' && searchResults && !loading && (
          <div className="search-results-container">
            <div className="results-header">
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

              <p>
                Results for "<em>{searchResults.query}</em>"
              </p>
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
                      <p>{(result.text || result.content || '').substring(0, 180)}...</p>
                    </div>
                    
                    <div className="result-footer">
                      <div className="result-meta">
                        <span className="section-number">Section: {result.section_number}</span>
                        <span className="page-info">
                          {result.page_start && result.page_end ? 
                            `Pages: ${result.page_start}-${result.page_end}` : 
                            `Level: ${result.level || 'N/A'}`
                          }
                        </span>
                      </div>
                      <button 
                        className="view-full-btn"
                        onClick={() => openFullContent(result)}
                      >
                        View More
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {activeView === 'search' && searchMode === 'ai-comparison' && comparisonResults && !loading && (
          <ComparisonView results={comparisonResults} />
        )}

        {activeView === 'stats' && (
          <DocumentStats stats={documentStats} />
        )}

        {activeView === 'markdown' && (
          <MarkdownViewer />
        )}

        {activeView === 'settings' && (
          <Settings 
            searchOptions={searchOptions}
            onSearchOptionsChange={setSearchOptions}
          />
        )}

        {activeView === 'fullContent' && fullContentView && !loading && (
          <div className="full-content-container">
            <div className="full-content-header">
              <button className="back-btn" onClick={closeFullContent}>
                ← Back to Search Results
              </button>
              <div className="content-meta">
                <span className={`standard-badge ${(fullContentView.standard || fullContentView.standardType || '').toLowerCase()}`}>
                  {fullContentView.standard || fullContentView.standardType}
                </span>
                <h1>{fullContentView.section_title || fullContentView.title}</h1>
                {fullContentView.parent_chain && fullContentView.parent_chain.length > 0 && (
                  <div className="breadcrumb-full">
                    {fullContentView.parent_chain.map((parent, idx) => (
                      <span key={idx} className="breadcrumb-item">
                        {parent.title || parent.section_number}
                        {idx < fullContentView.parent_chain.length - 1 && ' > '}
                      </span>
                    ))}
                  </div>
                )}
                <div className="section-info">
                  <span className="section-number">Section: {fullContentView.section_number}</span>
                  {fullContentView.page_start && fullContentView.page_end && (
                    <span className="page-info">Pages: {fullContentView.page_start}-{fullContentView.page_end}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="full-content-body">
              <div className="content-text">
                {(fullContentView.text || fullContentView.content || '').split('\n\n').map((paragraph, index) => (
                  <p key={index} className="content-paragraph">
                    {paragraph}
                  </p>
                ))}
              </div>
              
              {fullContentView.crossReferences && fullContentView.crossReferences.length > 0 && (
                <div className="cross-references">
                  <h3>📚 Cross References</h3>
                  <ul>
                    {fullContentView.crossReferences.map((ref, index) => (
                      <li key={index}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

    </div>
  );
}

export default App;
