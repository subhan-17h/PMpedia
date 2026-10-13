import React, { useState } from 'react';

export default function AgentTrace({ trace }) {
  const [open, setOpen] = useState(false);

  if (!trace || trace.length === 0) return null;

  return (
    <div className="trace-container">
      <button className="trace-toggle" onClick={() => setOpen(!open)}>
        <span className={`trace-arrow ${open ? 'open' : ''}`}>▶</span>
        Agent Trace ({trace.length} steps)
      </button>

      {open && (
        <div className="trace-timeline">
          {trace.map((step, i) => (
            <div
              key={i}
              className="trace-step"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {step}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
