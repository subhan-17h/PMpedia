import React, { useState } from 'react';
import './SearchInterface.css';

const SearchInterface = ({ onSearch, loading, compareMode, setCompareMode, searchOptions = {} }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query, searchOptions);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search project management standards..."
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
              <span>🔍</span>
            )}
          </button>
        </div>


      </form>
    </>
  );
};

export default SearchInterface;