import React from 'react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <div className="error-message">{message}</div>
      {onRetry && (
        <button className="error-retry" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
