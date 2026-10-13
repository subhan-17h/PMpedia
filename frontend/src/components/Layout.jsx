import React from 'react';

export default function Layout({ mode, onModeChange, children }) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="header-logo">⬡</span>
            <div>
              <div className="header-title">PM Standards RAG</div>
              <div className="header-subtitle">Agentic search across PMBOK7 · PRINCE2 · ISO 21502</div>
            </div>
          </div>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'search' ? 'active' : ''}`}
              onClick={() => onModeChange('search')}
            >
              🔍 Search
            </button>
            <button
              className={`mode-btn ${mode === 'agent' ? 'active' : ''}`}
              onClick={() => onModeChange('agent')}
            >
              🤖 Agent
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        PM Standards Agentic RAG Assistant — Built with FastAPI, ChromaDB & React
      </footer>
    </div>
  );
}
