import React from 'react';
import './DocumentStats.css';

const DocumentStats = ({ stats }) => {
  if (!stats) return null;

  const totalSections = Object.values(stats).reduce((sum, stat) => sum + (stat.validSections || 0), 0);
  const totalPages = Object.values(stats).reduce((sum, stat) => sum + (stat.totalPages || 0), 0);
  const avgSuccessRate = Object.values(stats).reduce((sum, stat) => sum + (stat.successRate || 0), 0) / Object.keys(stats).length;

  return (
    <div className="document-stats">
      <h3>📊 Document Statistics</h3>
      
      <div className="stats-overview">
        <div className="overview-card">
          <h4>📚 Total Collection</h4>
          <div className="stat-number">{Object.keys(stats).length}</div>
          <div className="stat-label">Standards</div>
        </div>
        
        <div className="overview-card">
          <h4>📄 Total Sections</h4>
          <div className="stat-number">{totalSections}</div>
          <div className="stat-label">Searchable Sections</div>
        </div>
        
        <div className="overview-card">
          <h4>📖 Total Pages</h4>
          <div className="stat-number">{totalPages}</div>
          <div className="stat-label">Pages Processed</div>
        </div>
        
        <div className="overview-card">
          <h4>✅ Success Rate</h4>
          <div className="stat-number">{avgSuccessRate.toFixed(1)}%</div>
          <div className="stat-label">Average Quality</div>
        </div>
      </div>

      <div className="stats-grid">
        {Object.entries(stats).map(([key, stat]) => (
          <div key={key} className={`stat-card ${key}`}>
            <div className="stat-header">
              <h4>{stat.standardType}</h4>
              <span className="standard-badge">{key.toUpperCase()}</span>
            </div>
            
            <div className="stat-details">
              <div className="stat-row">
                <span>📄 Total Sections:</span>
                <span>{stat.totalSections}</span>
              </div>
              
              <div className="stat-row">
                <span>✅ Valid Sections:</span>
                <span>{stat.validSections}</span>
              </div>
              
              <div className="stat-row">
                <span>📖 Pages:</span>
                <span>{stat.totalPages}</span>
              </div>
              
              <div className="stat-row">
                <span>🎯 Success Rate:</span>
                <span>{stat.successRate}%</span>
              </div>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${stat.successRate}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="stats-footer">
        <p>
          💡 <strong>Pro Tip:</strong> Higher quality sections (above 30% score) provide more 
          accurate and comprehensive search results. Use the comparison view to see how 
          different standards approach the same topics.
        </p>
      </div>
    </div>
  );
};

export default DocumentStats;