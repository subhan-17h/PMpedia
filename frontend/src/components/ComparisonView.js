import React, { useState } from 'react';
import './ComparisonView.css';

const ComparisonView = ({ results }) => {
  const [selectedStandards, setSelectedStandards] = useState(['pmbok', 'prince2', 'iso']);
  const [expandedSections, setExpandedSections] = useState(new Set());

  if (!results) return null;

  const toggleSection = (standardType, sectionId) => {
    const key = `${standardType}-${sectionId}`;
    const newExpanded = new Set(expandedSections);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    
    setExpandedSections(newExpanded);
  };

  const toggleStandard = (standard) => {
    setSelectedStandards(prev => 
      prev.includes(standard) 
        ? prev.filter(s => s !== standard)
        : [...prev, standard]
    );
  };

  const standardDisplayNames = {
    pmbok: 'PMBOK 7',
    prince2: 'PRINCE2',
    iso: 'ISO 21500'
  };

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <h2>⚖️ Cross-Standard Comparison</h2>
        <p>Comparing results for: "<em>{results.query}</em>"</p>
        
        <div className="standard-toggles">
          {Object.keys(standardDisplayNames).map(standard => (
            <label key={standard} className="standard-toggle">
              <input
                type="checkbox"
                checked={selectedStandards.includes(standard)}
                onChange={() => toggleStandard(standard)}
              />
              <span className={`toggle-label ${standard}`}>
                {standardDisplayNames[standard]}
                {results.summary[standard] && (
                  <span className="result-count">
                    ({results[standard]?.length || 0} results)
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="comparison-grid">
        {selectedStandards.map(standard => (
          <div key={standard} className={`comparison-column ${standard}`}>
            <div className="column-header">
              <h3>{standardDisplayNames[standard]}</h3>
              {results.summary[standard] && results.summary[standard].hasResults && (
                <div className="column-stats">
                  <span>📊 Found match</span>
                </div>
              )}
            </div>

            <div className="column-results">
              {results[standard] && results[standard].length > 0 ? (
                results[standard].map((result, index) => {
                  const sectionKey = result.section_number || result.sectionId;
                  const isExpanded = expandedSections.has(`${standard}-${sectionKey}`);
                  
                  return (
                    <div key={sectionKey} className="comparison-result-card">
                      <div className="card-header">
                        <h4>{result.section_title || result.title}</h4>
                      </div>
                      
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

                      <div className="card-content">
                        <p className={isExpanded ? 'expanded' : 'collapsed'}>
                          {isExpanded ? 
                            (result.text || result.content) : 
                            `${(result.text || result.content).substring(0, 150)}...`
                          }
                        </p>
                        
                        <button 
                          onClick={() => toggleSection(standard, sectionKey)}
                          className="expand-toggle"
                        >
                          {isExpanded ? '🔼 Show Less' : '🔽 Show More'}
                        </button>
                      </div>

                      <div className="card-footer">
                        <span className="section-number">Section: {result.section_number || result.sectionId}</span>
                        {result.page_start && result.page_end && (
                          <span className="page-info">Pages: {result.page_start}-{result.page_end}</span>
                        )}
                        {result.level && (
                          <span className="level-info">Level: {result.level}</span>
                        )}
                        {result.matchedTerms && result.matchedTerms.length > 0 && (
                          <div className="matched-terms">
                            🎯 {result.matchedTerms.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-results">
                  <p>No matching results found in {standardDisplayNames[standard]}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Summary */}
      <div className="comparison-summary">
        <h3>📋 Summary</h3>
        <div className="summary-grid">
          {Object.entries(results.summary).map(([standard, stats]) => (
            <div key={standard} className="summary-card">
              <h4>{standardDisplayNames[standard]}</h4>
              <div className="summary-stats">
                <div>📊 Total Results: {stats.totalResults}</div>
                <div>📄 Displayed: {results[standard]?.length || 0}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="insight-box">
          <h4>🔍 Quick Insights</h4>
          <ul>
            {Object.entries(results.summary).map(([standard, stats]) => {
              if (stats.totalResults === 0) return null;
              
              return (
                <li key={standard}>
                  <strong>{standardDisplayNames[standard]}</strong>: Found relevant content 
                  ({stats.totalResults} sections available)
                </li>
              );
            }).filter(Boolean)}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;