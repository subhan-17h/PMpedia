import React from 'react';

function getStandardClass(standard) {
  const key = (standard || '').toLowerCase().replace(/\s/g, '');
  if (key.includes('pmbok')) return 'pmbok7';
  if (key.includes('prince')) return 'prince2';
  if (key.includes('iso')) return 'iso21502';
  return '';
}

export default function SourcesPanel({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div>
      <div className="section-header">Sources ({sources.length})</div>
      <div className="source-list">
        {sources.map((source, i) => (
          <div key={source.chunk_id || i} className="source-card">
            <div className="source-header">
              <span className={`standard-badge ${getStandardClass(source.standard)}`}>
                {source.standard}
              </span>
              <span className="source-title">{source.title || source.section_id}</span>
              <span className="source-score">{(source.score * 100).toFixed(0)}%</span>
            </div>
            <div className="source-text">{source.text}</div>
            {source.deep_link && (
              <a className="source-link" href={source.deep_link} title="View section">
                📎 {source.deep_link}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
