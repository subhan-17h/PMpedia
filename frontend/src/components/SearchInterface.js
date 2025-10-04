import React, { useState, useEffect, useRef } from 'react';
import './SearchInterface.css';

const SearchInterface = ({ onSearch, loading, searchMode, setSearchMode, searchOptions = {} }) => {
  const [query, setQuery] = useState('');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query, searchOptions);
    }
  };

  const searchModes = {
    'search': { label: 'Standard Search', icon: '🔍', description: 'Search across all standards' },
    'ai-comparison': { label: 'AI Comparison', icon: '🤖', description: 'AI-powered cross-standard analysis' }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowModeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-wrapper">
          {/* Mode Selector */}
          <div className="mode-selector" ref={dropdownRef}>
            <button 
              type="button"
              className="mode-toggle"
              onClick={() => setShowModeDropdown(!showModeDropdown)}
            >
              <span className="stars-icon">✨</span>
            </button>
            
            {showModeDropdown && (
              <div className="mode-dropdown">
                {Object.entries(searchModes).map(([mode, config]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`mode-option ${searchMode === mode ? 'active' : ''}`}
                    onClick={() => {
                      setSearchMode(mode);
                      setShowModeDropdown(false);
                    }}
                  >
                    <span className="mode-icon">{config.icon}</span>
                    <div className="mode-info">
                      <div className="mode-label">{config.label}</div>
                      <div className="mode-description">{config.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchMode === 'ai-comparison' ? 
              "Enter topic for AI comparison across standards..." : 
              "Search project management standards..."
            }
            className="search-input"
            disabled={loading}
          />
          
          <button 
            type="submit" 
            className="search-btn"
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <div className="btn-spinner"></div>
            ) : (
              <span>{searchModes[searchMode].icon}</span>
            )}
          </button>
        </div>

        {/* Current Mode Indicator */}
        <div className="current-mode-indicator">
          <span className="mode-badge">
            {searchModes[searchMode].icon} {searchModes[searchMode].label}
          </span>
        </div>

      </form>
    </>
  );
};

export default SearchInterface;