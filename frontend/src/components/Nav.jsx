export default function Nav({ page, onNavigate }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <div className="nav-logo">⬡</div>
        <div className="nav-wordmark">
          <span className="nav-title">PM Standards</span>
          <span className="nav-subtitle">PMBOK7 · PRINCE2 · ISO 21502</span>
        </div>
      </div>

      <div className="nav-tabs">
        <button
          className={`nav-tab${page === 'search' ? ' active' : ''}`}
          onClick={() => onNavigate('search')}
        >
          Search
        </button>
        <button
          className={`nav-tab${page === 'chat' ? ' active' : ''}`}
          onClick={() => onNavigate('chat')}
        >
          Chat
        </button>
      </div>
    </nav>
  );
}
