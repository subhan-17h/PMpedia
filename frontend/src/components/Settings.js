import React from 'react';
import './Settings.css';

const Settings = ({ searchOptions, onSearchOptionsChange }) => {
  const handleOptionChange = (key, value) => {
    onSearchOptionsChange({
      ...searchOptions,
      [key]: value
    });
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="settings-title">⚙️ Search Settings</h1>
        <p className="settings-subtitle">Configure your search preferences</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2 className="section-title">Search Configuration</h2>
          
          <div className="settings-grid">
            <div className="setting-group">
              <label className="setting-label">Standard Filter:</label>
              <select 
                value={searchOptions.standard || ''}
                onChange={(e) => handleOptionChange('standard', e.target.value)}
                className="setting-select"
              >
                <option value="">All Standards</option>
                <option value="pmbok">PMBOK Guide</option>
                <option value="prince2">PRINCE2</option>
                <option value="iso">ISO 21500</option>
              </select>
              <p className="setting-description">Filter results by specific project management standard</p>
            </div>

            <div className="setting-group">
              <label className="setting-label">Maximum Results:</label>
              <select 
                value={searchOptions.maxResults || 10}
                onChange={(e) => handleOptionChange('maxResults', parseInt(e.target.value))}
                className="setting-select"
              >
                <option value={5}>5 Results</option>
                <option value={10}>10 Results</option>
                <option value={20}>20 Results</option>
                <option value={50}>50 Results</option>
              </select>
              <p className="setting-description">Number of results to display per search</p>
            </div>

            <div className="setting-group">
              <label className="setting-label">Quality Threshold:</label>
              <select 
                value={searchOptions.minScore || 0.1}
                onChange={(e) => handleOptionChange('minScore', parseFloat(e.target.value))}
                className="setting-select"
              >
                <option value={0.01}>Low (0.01)</option>
                <option value={0.1}>Medium (0.1)</option>
                <option value={0.2}>High (0.2)</option>
              </select>
              <p className="setting-description">Minimum relevance score for search results</p>
            </div>

            <div className="setting-group checkbox-setting">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={searchOptions.excludeAppendix || true}
                  onChange={(e) => handleOptionChange('excludeAppendix', e.target.checked)}
                  className="setting-checkbox"
                />
                <span className="checkbox-text">Exclude Appendix Sections</span>
              </label>
              <p className="setting-description">Hide appendix and supplementary sections from results</p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="section-title">About Search Settings</h2>
          <div className="info-card">
            <h3>How to use these settings:</h3>
            <ul className="info-list">
              <li><strong>Standard Filter:</strong> Narrow your search to specific methodologies</li>
              <li><strong>Maximum Results:</strong> Control the number of results displayed</li>
              <li><strong>Quality Threshold:</strong> Filter out less relevant matches</li>
              <li><strong>Exclude Appendix:</strong> Focus on main content sections</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;