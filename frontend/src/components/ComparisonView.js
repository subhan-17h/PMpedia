import React, { useState, useEffect, useCallback } from 'react';
import './ComparisonView.css';

const ComparisonView = ({ results }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const generateAiAnalysis = useCallback(async () => {
    if (!results || !results.query) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ai-compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: results.query,
          searchResults: {
            pmbok: results.pmbok || [],
            prince2: results.prince2 || [],
            iso: results.iso || []
          }
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage;
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || `AI analysis failed: ${response.statusText}`;
        } else {
          const textResponse = await response.text();
          errorMessage = `Server error: ${response.statusText}. The AI service may not be properly configured.`;
          console.error('Non-JSON response:', textResponse);
        }
        
        throw new Error(errorMessage);
      }

      const analysisResult = await response.json();
      setAiAnalysis(analysisResult);

    } catch (error) {
      console.error('Error generating AI analysis:', error);
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  }, [results, API_BASE_URL]);

  const retryAiAnalysis = () => {
    generateAiAnalysis();
  };

  // Load AI analysis when results change
  useEffect(() => {
    if (results && results.query) {
      generateAiAnalysis();
    }
  }, [results, generateAiAnalysis]);

  if (!results) return null;

  // Helper function to render formatted content with proper styling
  const renderFormattedContent = (text) => {
    if (!text) return null;

    // Remove any introductory text or preamble before the actual content
    // Look for patterns like "As an expert..." or "Comprehensive Comparison:" etc.
    let cleanedText = text;
    
    // Remove common preamble patterns
    cleanedText = cleanedText.replace(/^.*?(?=(Based|Here|The|This|In|When|All|None|Each|For|\*|-|•|\d+\.))/is, '');
    
    // If the text starts with a title or heading that's not part of the content, remove it
    cleanedText = cleanedText.replace(/^###?\s*Comprehensive Comparison:.*?\n/i, '');
    cleanedText = cleanedText.replace(/^###?\s*\d+\.\s*[A-Z\s&]+\n/i, '');
    
    const lines = cleanedText.split('\n');
    const elements = [];
    let currentList = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        // Empty line - close any open list and add spacing
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="analysis-list">
              {currentList.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          );
          currentList = [];
        }
        return;
      }

      // Check for section headers (lines ending with colon or starting with ###)
      if (trimmedLine.endsWith(':') || trimmedLine.startsWith('###')) {
        // Close any open list
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="analysis-list">
              {currentList.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          );
          currentList = [];
        }
        
        const headerText = trimmedLine.replace(/^###\s*/, '').replace(/:$/, '');
        elements.push(
          <h5 key={`header-${index}`} className="analysis-subheader">
            {headerText}
          </h5>
        );
        return;
      }

      // Check for list items (lines starting with *, -, or numbers)
      const bulletMatch = trimmedLine.match(/^[*\-•]\s+(.+)$/);
      const numberedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
      
      if (bulletMatch || numberedMatch) {
        const content = bulletMatch ? bulletMatch[1] : numberedMatch[1];
        currentList.push(content);
      } else {
        // Regular paragraph - close any open list first
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="analysis-list">
              {currentList.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          );
          currentList = [];
        }

        // Check for bold text patterns (**text** or __text__)
        const boldPattern = /(\*\*|__)(.*?)\1/g;
        const hasBold = boldPattern.test(trimmedLine);
        
        if (hasBold) {
          const parts = [];
          let lastIndex = 0;
          let match;
          const regex = /(\*\*|__)(.*?)\1/g;
          
          while ((match = regex.exec(trimmedLine)) !== null) {
            if (match.index > lastIndex) {
              parts.push(trimmedLine.substring(lastIndex, match.index));
            }
            parts.push(<strong key={`bold-${index}-${match.index}`}>{match[2]}</strong>);
            lastIndex = regex.lastIndex;
          }
          
          if (lastIndex < trimmedLine.length) {
            parts.push(trimmedLine.substring(lastIndex));
          }
          
          elements.push(<p key={`para-${index}`} className="analysis-paragraph">{parts}</p>);
        } else {
          elements.push(<p key={`para-${index}`} className="analysis-paragraph">{trimmedLine}</p>);
        }
      }
    });

    // Close any remaining open list
    if (currentList.length > 0) {
      elements.push(
        <ul key="list-final" className="analysis-list">
          {currentList.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }

    return elements;
  };

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <h2>⚖️ AI-Powered Comparison Analysis</h2>
        <p>Comparing standards for: "<em>{results.query}</em>"</p>
      </div>

      {/* AI-Powered Analysis */}
      <div className="ai-analysis-section">
        <div className="ai-analysis-header">
          <h3>🤖 AI-Powered Comparison Analysis</h3>
          <div className="ai-controls">
            <button 
              className="toggle-ai-btn"
              onClick={() => setShowAiAnalysis(!showAiAnalysis)}
            >
              {showAiAnalysis ? '🔼 Hide Analysis' : '🔽 Show Analysis'}
            </button>
            {aiAnalysis && !aiLoading && (
              <button 
                className="refresh-ai-btn"
                onClick={retryAiAnalysis}
                disabled={aiLoading}
              >
                🔄 Refresh Analysis
              </button>
            )}
          </div>
        </div>

        {showAiAnalysis && (
          <div className="ai-analysis-content">
            {aiLoading && (
              <div className="ai-loading">
                <div className="ai-spinner"></div>
                <p>🤖 AI is analyzing the comparison across all three standards...</p>
                <small>This may take a few moments</small>
              </div>
            )}

            {aiError && (
              <div className="ai-error">
                <h4>❌ AI Analysis Error</h4>
                <p>{aiError}</p>
                {aiError.includes('not be properly configured') && (
                  <div className="error-details">
                    <p><strong>Possible causes:</strong></p>
                    <ul>
                      <li>Backend server is not running</li>
                      <li>Gemini API key is not configured in .env file</li>
                      <li>Network connectivity issue</li>
                    </ul>
                    <p><small>Check the browser console for more details.</small></p>
                  </div>
                )}
                <button className="retry-ai-btn" onClick={retryAiAnalysis}>
                  🔄 Retry Analysis
                </button>
              </div>
            )}

            {aiAnalysis && !aiLoading && !aiError && (
              <div className="ai-analysis-results">
                <div className="analysis-sections">
                  {aiAnalysis.analysis.similarities && (
                    <div className="analysis-result-card similarities">
                      <div className="analysis-result-header">
                        <span className="analysis-badge similarities-badge">🤝 Similarities</span>
                      </div>
                      <h3>Similarities Across Standards</h3>
                      <div className="analysis-result-content">
                        {renderFormattedContent(aiAnalysis.analysis.similarities)}
                      </div>
                    </div>
                  )}

                  {aiAnalysis.analysis.differences && (
                    <div className="analysis-result-card differences">
                      <div className="analysis-result-header">
                        <span className="analysis-badge differences-badge">🔄 Differences</span>
                      </div>
                      <h3>Key Differences</h3>
                      <div className="analysis-result-content">
                        {renderFormattedContent(aiAnalysis.analysis.differences)}
                      </div>
                    </div>
                  )}

                  {aiAnalysis.analysis.strengths && (
                    <div className="analysis-result-card strengths">
                      <div className="analysis-result-header">
                        <span className="analysis-badge strengths-badge">💪 Strengths</span>
                      </div>
                      <h3>Strengths & Focus Areas</h3>
                      <div className="analysis-result-content">
                        {renderFormattedContent(aiAnalysis.analysis.strengths)}
                      </div>
                    </div>
                  )}

                  {aiAnalysis.analysis.practicalImplications && (
                    <div className="analysis-result-card practical">
                      <div className="analysis-result-header">
                        <span className="analysis-badge practical-badge">🎯 Practical</span>
                      </div>
                      <h3>Practical Implications</h3>
                      <div className="analysis-result-content">
                        {renderFormattedContent(aiAnalysis.analysis.practicalImplications)}
                      </div>
                    </div>
                  )}

                  {aiAnalysis.analysis.recommendations && (
                    <div className="analysis-result-card recommendations">
                      <div className="analysis-result-header">
                        <span className="analysis-badge recommendations-badge">📋 Recommendations</span>
                      </div>
                      <h3>Recommendations</h3>
                      <div className="analysis-result-content">
                        {renderFormattedContent(aiAnalysis.analysis.recommendations)}
                      </div>
                    </div>
                  )}

                  {/* Fallback to full response if sections aren't parsed */}
                  {!aiAnalysis.analysis.similarities && !aiAnalysis.analysis.differences && aiAnalysis.analysis.fullResponse && (
                    <div className="analysis-result-card full-response">
                      <div className="analysis-result-header">
                        <span className="analysis-badge full-badge">🤖 Complete Analysis</span>
                      </div>
                      <h3>Complete Analysis</h3>
                      <div className="analysis-result-content">
                        {renderFormattedContent(aiAnalysis.analysis.fullResponse)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="analysis-footer">
                  <small>
                    💡 This analysis is generated by AI and provides insights based on the search results. 
                    For critical decisions, please refer to the original standards documentation.
                  </small>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonView;