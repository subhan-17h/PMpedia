import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function AnswerPanel({ answer }) {
  if (!answer) return null;

  return (
    <div className="answer-panel card">
      <div className="answer-content">
        <ReactMarkdown>{answer}</ReactMarkdown>
      </div>
    </div>
  );
}
