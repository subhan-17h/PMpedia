import React, { useState } from 'react';
import './SearchInterface.css';

const SearchInterface = ({ onSearch, onCompare, loading, error, activeView, setActiveView }) => {
  const [query, setQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState({
    standard: '',
    maxResults: 10,
    minScore: 0.1,
    sectionTypes: '',
    excludeAppendix: true
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      const options = {};
      if (searchOptions.standard) options.standard = searchOptions.standard;
      if (searchOptions.maxResults !== 10) options.maxResults = searchOptions.maxResults;
      if (searchOptions.minScore !== 0.1) options.minScore = searchOptions.minScore;
      if (searchOptions.sectionTypes) options.sectionTypes = searchOptions.sectionTypes;
      options.excludeAppendix = searchOptions.excludeAppendix;

      onSearch(query, options);
    }
  };

  const handleCompare = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onCompare(query, {
        maxResults: 5,
        minScore: searchOptions.minScore
      });
    }
  };

  const handleOptionChange = (key, value) => {
    setSearchOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Predefined search suggestions
  const suggestions = [
    'risk management',
    'stakeholder engagement',
    'project lifecycle',
    'quality assurance',
    'resource planning',
    'project governance',
    'change management',
    'communication planning',
    'project monitoring',
    'benefits realization'
  ];

  return (
    <div className="search-interface">
      <div className="search-container">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across PMBOK, PRINCE2, and ISO 21500... (e.g., 'risk management')"
              className="search-input"
              disabled={loading}
            />
            
            <div className="search-buttons">
              <button 
                type="submit" 
                className="search-btn primary"
                disabled={loading || !query.trim()}
              >
                🔍 Search
              </button>
              
              <button 
                type="button"
                onClick={handleCompare}
                className="search-btn secondary"
                disabled={loading || !query.trim()}
              >
                ⚖️ Compare
              </button>
            </div>
          </div>
        </form>

        <div className="search-controls">
          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="toggle-advanced"
          >
            {showAdvanced ? '▲ Hide Advanced' : '▼ Advanced Options'}
          </button>

          <div className="view-toggle">
            <button 
              onClick={() => setActiveView('search')}
              className={`view-btn ${activeView === 'search' ? 'active' : ''}`}
            >
              📋 Search Results
            </button>
            <button 
              onClick={() => setActiveView('comparison')}
              className={`view-btn ${activeView === 'comparison' ? 'active' : ''}`}
            >
              ⚖️ Comparison View
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="advanced-options">
            <h4>Advanced Search Options</h4>
            
            <div className="option-grid">
              <div className="option-group">
                <label>Filter by Standard:</label>
                <select 
                  value={searchOptions.standard}
                  onChange={(e) => handleOptionChange('standard', e.target.value)}
                >
                  <option value="">All Standards</option>
                  <option value="pmbok">PMBOK 7</option>
                  <option value="prince2">PRINCE2</option>
                  <option value="iso">ISO 21500</option>
                </select>
              </div>

              <div className="option-group">
                <label>Max Results:</label>
                <input
                  type="number"
                  value={searchOptions.maxResults}
                  onChange={(e) => handleOptionChange('maxResults', parseInt(e.target.value))}
                  min="5"
                  max="50"
                />
              </div>

              <div className="option-group">
                <label>Minimum Score:</label>
                <input
                  type="range"
                  value={searchOptions.minScore}
                  onChange={(e) => handleOptionChange('minScore', parseFloat(e.target.value))}
                  min="0"
                  max="1"
                  step="0.1"
                />
                <span>{searchOptions.minScore}</span>
              </div>

              <div className="option-group">
                <label>Section Types:</label>
                <input
                  type="text"
                  value={searchOptions.sectionTypes}
                  onChange={(e) => handleOptionChange('sectionTypes', e.target.value)}
                  placeholder="e.g., chapter,section (comma-separated)"
                />
              </div>

              <div className="option-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={searchOptions.excludeAppendix}
                    onChange={(e) => handleOptionChange('excludeAppendix', e.target.checked)}
                  />
                  Exclude Appendix/Index sections
                </label>
                <small>Filter out appendices, indices, and reference sections from results</small>
              </div>
            </div>
          </div>
        )}

        <div className="search-suggestions">
          <h4>💡 Popular Searches:</h4>
          <div className="suggestion-tags">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setQuery(suggestion)}
                className="suggestion-tag"
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;