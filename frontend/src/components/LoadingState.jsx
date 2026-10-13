import React from 'react';

export default function LoadingState({ message = 'Processing...', steps = [] }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <div className="loading-text">{message}</div>
      {steps.length > 0 && (
        <div className="loading-steps">
          {steps.map((step, i) => (
            <div key={i} className="loading-step">{step}</div>
          ))}
        </div>
      )}
    </div>
  );
}
