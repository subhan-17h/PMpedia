import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './MarkdownViewer.css';

const MarkdownViewer = () => {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableDocuments, setAvailableDocuments] = useState([]);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    // Available markdown documents
    const documents = [
      { 
        id: 'pmbok7', 
        title: 'PMBOK Guide (7th Edition)', 
        path: 'pmbok7_output/pmbok7/auto/pmbok7.md',
        description: 'A Guide to the Project Management Body of Knowledge'
      },
      { 
        id: 'prince2', 
        title: 'PRINCE2', 
        path: 'prince2_output/prince2/auto/prince2.md',
        description: 'Projects IN Controlled Environments'
      },
      { 
        id: 'iso21502', 
        title: 'ISO 21502:2020', 
        path: 'iso21502_output/iso21502/auto/iso21502.md',
        description: 'Project, programme and portfolio management — Guidance on project management'
      },
      { 
        id: 'iso21500', 
        title: 'ISO 21500:2012', 
        path: 'iso21500_output/iso21500/auto/iso21500.md',
        description: 'Guidance on project management'
      }
    ];
    
    setAvailableDocuments(documents);
  }, []);

  const loadMarkdown = async (document) => {
    if (!document) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/markdown/${document.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.statusText}`);
      }
      
      const content = await response.text();
      setMarkdownContent(content);
      setSelectedDocument(document);
    } catch (error) {
      console.error('Error loading markdown:', error);
      setError(error.message);
      setMarkdownContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelect = (document) => {
    loadMarkdown(document);
  };

  // Custom component for rendering images with proper handling
  const ImageRenderer = ({ src, alt, ...props }) => {
    // Convert relative image paths to absolute paths
    const imageSrc = src?.startsWith('images/') 
      ? `${API_BASE_URL}/markdown/images/${selectedDocument?.id}/${src.replace('images/', '')}`
      : src;
    
    return (
      <img 
        src={imageSrc} 
        alt={alt} 
        {...props}
        onError={(e) => {
          e.target.style.display = 'none';
          console.warn(`Failed to load image: ${imageSrc}`);
        }}
      />
    );
  };

  return (
    <div className="markdown-viewer">
      <div className="markdown-sidebar">
        <div className="markdown-sidebar-header">
          <h2>📄 Documents</h2>
          <p className="sidebar-subtitle">Project Management Standards</p>
        </div>
        
        <div className="document-list">
          {availableDocuments.map((doc) => (
            <div
              key={doc.id}
              className={`document-item ${selectedDocument?.id === doc.id ? 'active' : ''}`}
              onClick={() => handleDocumentSelect(doc)}
            >
              <h3 className="document-title">{doc.title}</h3>
              <p className="document-description">{doc.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="markdown-content">
        {!selectedDocument && (
          <div className="welcome-message">
            <div className="welcome-content">
              <h2>📖 Document Viewer</h2>
              <p>Select a document from the sidebar to view its full content with proper formatting.</p>
              <div className="feature-list">
                <div className="feature-item">
                  <span className="feature-icon">📝</span>
                  <span>Rich markdown rendering</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🖼️</span>
                  <span>Image and diagram support</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <span>Tables and mathematical notation</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔗</span>
                  <span>Cross-references and links</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading document...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <div className="error-message">
              <h3>❌ Error Loading Document</h3>
              <p>{error}</p>
              <button 
                className="retry-button"
                onClick={() => selectedDocument && loadMarkdown(selectedDocument)}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {selectedDocument && markdownContent && !loading && (
          <div className="markdown-document">
            <div className="document-header">
              <h1 className="document-main-title">{selectedDocument.title}</h1>
              <p className="document-subtitle">{selectedDocument.description}</p>
            </div>
            
            <div className="markdown-content-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  img: ImageRenderer,
                  // Custom table rendering
                  table: ({ children, ...props }) => (
                    <div className="table-wrapper">
                      <table {...props}>{children}</table>
                    </div>
                  ),
                  // Custom code block rendering
                  code: ({ node, inline, className, children, ...props }) => {
                    return !inline ? (
                      <div className="code-block-wrapper">
                        <pre className={className} {...props}>
                          <code>{children}</code>
                        </pre>
                      </div>
                    ) : (
                      <code className="inline-code" {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Custom heading rendering with anchors
                  h1: ({ children, ...props }) => (
                    <h1 id={children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2 id={children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 id={children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props}>
                      {children}
                    </h3>
                  ),
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownViewer;