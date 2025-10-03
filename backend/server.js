const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const natural = require('natural');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for processed documents
let documents = {
  pmbok: null,
  prince2: null,
  iso: null
};

// Text processing utilities
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const TfIdf = natural.TfIdf;

class SearchEngine {
  constructor() {
    this.tfidf = new TfIdf();
    this.documentIndex = [];
    this.sectionsIndex = [];
  }

  loadDocuments() {
    const processedDir = path.join(__dirname, '..', 'backend', 'data', 'processed');
    
    try {
      // Load processed JSON files
      const files = fs.readdirSync(processedDir);
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const filePath = path.join(processedDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Determine standard type from filename
          let standardType = 'unknown';
          if (file.includes('pmbok')) standardType = 'pmbok';
          else if (file.includes('prince2')) standardType = 'prince2';
          else if (file.includes('iso')) standardType = 'iso';
          
          documents[standardType] = data;
          
          // Index all sections for search
          this.indexDocument(data, standardType);
        }
      });
      
      console.log(`📚 Loaded documents: ${Object.keys(documents).filter(k => documents[k]).join(', ')}`);
      
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  indexDocument(document, standardType) {
    // Handle both old structure (array with sections) and new structure (direct array)
    const sections = Array.isArray(document) ? document : (document.sections || []);
    
    sections.forEach((section, index) => {
      // Skip sections with minimal text
      if (!section.text || section.text.length < 50) return;
      
      // Filter out appendix, index, and table of contents sections
      const title = (section.section_title || section.title || '').toLowerCase();
      const content = (section.text || section.content || '').toLowerCase();
      
      const excludeKeywords = ['index', 'appendix', 'appendices', 'table of contents', 'contents', 'bibliography', 'references'];
      const shouldExclude = excludeKeywords.some(keyword => 
        title.includes(keyword) || content.startsWith(keyword)
      );
      
      if (shouldExclude) return;
      
      const sectionText = `${section.section_title || section.title || ''} ${section.text || section.content || ''}`;
      
      // Add to TF-IDF index
      this.tfidf.addDocument(sectionText);
      
      // Store section reference with new structure compatibility
      this.sectionsIndex.push({
        standardType: section.standard || standardType.toUpperCase(),
        sectionId: section.section_number || section.sectionId,
        title: section.section_title || section.title,
        content: section.text || section.content,
        sectionType: section.section_type || 'section',
        qualityScore: section.quality_score || 0.8, // Default quality for new structure
        crossReferences: section.cross_references || [],
        level: section.level,
        parent_chain: section.parent_chain,
        page_start: section.page_start,
        page_end: section.page_end,
        section_number: section.section_number,
        section_title: section.section_title,
        standard: section.standard,
        text: section.text,
        documentIndex: this.tfidf.documents.length - 1
      });
    });
  }

  search(query, options = {}) {
    const {
      standardType = null,
      maxResults = 10,
      minScore = 0.05, // Lowered threshold
      sectionTypes = null,
      excludeAppendix = true // Default to exclude appendix/index sections
    } = options;

    // Process query with enhanced tokenization
    const originalQuery = query.toLowerCase();
    const queryTerms = tokenizer.tokenize(originalQuery)
      .map(term => stemmer.stem(term))
      .filter(term => term.length > 2);
    
    const queryWords = tokenizer.tokenize(originalQuery)
      .filter(term => term.length > 2);

    if (queryTerms.length === 0 && queryWords.length === 0) {
      return { results: [], query, totalResults: 0 };
    }

    // Calculate enhanced scores
    const scores = [];
    
    this.sectionsIndex.forEach((section, index) => {
      // Apply filters
      if (standardType && section.standardType !== standardType) return;
      if (sectionTypes && !sectionTypes.includes(section.sectionType)) return;
      
      // Filter out appendix/index sections if enabled
      if (excludeAppendix && this.isAppendixOrIndex(section)) return;

      // Enhanced scoring system
      let totalScore = 0;
      
      // TF-CDIDF score
      queryTerms.forEach(term => {
        totalScore += this.tfidf.tfidf(term, section.documentIndex);
      });
      
      // Additional scoring methods
      const exactMatches = this.countExactMatches(originalQuery, section);
      const partialMatches = this.countPartialMatches(queryWords, section);
      const titleMatches = this.countTitleMatches(originalQuery, section);
      
      // Weighted scoring
      const exactBonus = exactMatches * 2.0;      // High weight for exact matches
      const partialBonus = partialMatches * 0.3;   // Medium weight for partial matches  
      const titleBonus = titleMatches * 1.5;      // High weight for title matches
      
      const finalScore = totalScore + exactBonus + partialBonus + titleBonus;

      // Include results with lower threshold
      if (finalScore >= minScore || exactMatches > 0 || titleMatches > 0) {
        scores.push({
          ...section,
          score: finalScore,
          exactMatches,
          partialMatches,
          titleMatches,
          matchedTerms: this.getMatchedTerms(queryWords, section)
        });
      }
    });

    // If no specific standard is requested, prepare both top 1 from each and all results
    let results, allResults;
    if (!standardType) {
      // Sort all scores first
      const sortedScores = scores.sort((a, b) => b.score - a.score);
      allResults = sortedScores.slice(0, maxResults);
      
      // Group results by standard and get top 1 from each
      const resultsByStandard = {};
      sortedScores.forEach(score => {
        const standard = score.standardType;
        if (!resultsByStandard[standard] || score.score > resultsByStandard[standard].score) {
          resultsByStandard[standard] = score;
        }
      });
      
      // Convert to array and sort by score
      results = Object.values(resultsByStandard)
        .sort((a, b) => b.score - a.score);
    } else {
      // Normal sorting and limiting for specific standard searches
      results = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
      allResults = results; // For specific standard, all results are the same
    }

    // Remove score information if hideScores option is set
    if (options.hideScores) {
      results = results.map(result => {
        const { score, exactMatches, partialMatches, titleMatches, matchedTerms, ...cleanResult } = result;
        return cleanResult;
      });
      
      if (allResults) {
        allResults = allResults.map(result => {
          const { score, exactMatches, partialMatches, titleMatches, matchedTerms, ...cleanResult } = result;
          return cleanResult;
        });
      }
    }

    return {
      results,
      allResults: allResults || results, // Include all results for frontend to choose from
      query,
      totalResults: scores.length,
      queryTerms: queryWords
    };
  }

  countExactMatches(query, section) {
    const text = `${section.title || section.section_title || ''} ${section.content || section.text || ''}`.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Count exact phrase matches
    const exactMatches = (text.match(new RegExp(this.escapeRegex(queryLower), 'g')) || []).length;
    
    // Count individual word matches
    const words = queryLower.split(/\s+/);
    const wordMatches = words.reduce((count, word) => {
      return count + (text.match(new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'g')) || []).length;
    }, 0);
    
    return exactMatches * 2 + wordMatches;
  }

  countPartialMatches(queryWords, section) {
    const text = `${section.title || section.section_title || ''} ${section.content || section.text || ''}`.toLowerCase();
    let partialCount = 0;
    
    queryWords.forEach(word => {
      // Check for partial word matches (substring)
      if (text.includes(word.toLowerCase())) {
        partialCount++;
      }
      
      // Check for similar words (simple Levenshtein-like matching)
      const regex = new RegExp(word.split('').join('.*?'), 'i');
      if (regex.test(text)) {
        partialCount += 0.5;
      }
    });
    
    return partialCount;
  }

  countTitleMatches(query, section) {
    const title = (section.title || section.section_title || '').toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Higher weight for title matches
    let titleMatches = 0;
    
    // Exact phrase in title
    if (title.includes(queryLower)) {
      titleMatches += 3;
    }
    
    // Individual words in title
    const words = queryLower.split(/\s+/);
    words.forEach(word => {
      if (title.includes(word)) {
        titleMatches += 1;
      }
    });
    
    return titleMatches;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  isAppendixOrIndex(section) {
    const title = (section.title || section.section_title || '').toLowerCase();
    const content = (section.content || section.text || '').toLowerCase();
    
    const excludeKeywords = ['index', 'appendix', 'appendices', 'references'];
    
    // Check if title contains any exclude keywords
    const titleContainsKeywords = excludeKeywords.some(keyword => 
      title.includes(keyword) || title.startsWith(keyword.charAt(0).toUpperCase())
    );
    
    // Check if content starts with any exclude keywords (more restrictive for content)
    const contentStartsWithKeywords = excludeKeywords.some(keyword => 
      content.trim().toLowerCase().startsWith(keyword)
    );
    
    return titleContainsKeywords || contentStartsWithKeywords;
  }

  getMatchedTerms(queryWords, section) {
    const text = `${section.title || section.section_title || ''} ${section.content || section.text || ''}`.toLowerCase();
    const matched = [];
    
    queryWords.forEach(term => {
      const termLower = term.toLowerCase();
      if (text.includes(termLower) || text.includes(stemmer.stem(termLower))) {
        matched.push(term);
      }
    });
    
    return [...new Set(matched)]; // Remove duplicates
  }

  compareAcrossStandards(query, options = {}) {
    const results = {
      pmbok: [],
      prince2: [],
      iso: [],
      query,
      summary: {}
    };

    // Map standard names correctly
    const standardMap = {
      'pmbok': 'PMBOK',
      'prince2': 'PRINCE2', 
      'iso': 'ISO_21502'
    };

    // Search each standard
    ['pmbok', 'prince2', 'iso'].forEach(standard => {
      if (documents[standard]) {
        const searchResults = this.search(query, {
          ...options,
          standardType: standardMap[standard] || standard,
          maxResults: 1 // Only get top 1 result per standard
        });
        
        // Remove score information from results
        const cleanResults = searchResults.results.map(result => {
          const { score, exactMatches, partialMatches, titleMatches, matchedTerms, ...cleanResult } = result;
          return cleanResult;
        });
        
        results[standard] = cleanResults;
        results.summary[standard] = {
          totalResults: searchResults.totalResults > 0 ? 1 : 0, // Show 1 if any results found
          hasResults: searchResults.results.length > 0
        };
      }
    });

    return results;
  }

  getDocumentStats() {
    const stats = {};
    
    Object.keys(documents).forEach(key => {
      if (documents[key]) {
        const doc = documents[key];
        
        // Handle both old and new structure
        if (Array.isArray(doc)) {
          // New structure - array of sections
          const validSections = doc.filter(section => 
            section.text && section.text.length >= 50
          );
          
          const maxPage = Math.max(...doc.map(s => s.page_end || s.page_start || 0));
          
          stats[key] = {
            title: doc[0]?.standard || key.toUpperCase(),
            standardType: doc[0]?.standard || key.toUpperCase(),
            totalSections: doc.length,
            validSections: validSections.length,
            successRate: Math.round((validSections.length / doc.length) * 100),
            totalPages: maxPage || 0
          };
        } else {
          // Old structure - object with metadata
          stats[key] = {
            title: doc.metadata?.title || key.toUpperCase(),
            standardType: doc.metadata?.standard_type || key.toUpperCase(),
            totalSections: doc.processing_stats?.total_sections || 0,
            validSections: doc.processing_stats?.valid_sections || 0,
            successRate: doc.processing_stats?.processing_success_rate || 0,
            totalPages: doc.metadata?.total_pages || 0
          };
        }
      }
    });
    
    return stats;
  }
}

// Initialize search engine
const searchEngine = new SearchEngine();

// Load documents on startup
searchEngine.loadDocuments();

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'PMPedia API is running',
    loadedDocuments: Object.keys(documents).filter(k => documents[k])
  });
});

// Get document statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = searchEngine.getDocumentStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search endpoint
app.get('/api/search', (req, res) => {
  try {
    const { 
      q: query, 
      standard, 
      maxResults = 10, 
      minScore = 0.1,
      sectionTypes,
      excludeAppendix = 'true'
    } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Map frontend standard names to backend standard names
    const standardMap = {
      'pmbok': 'PMBOK',
      'prince2': 'PRINCE2', 
      'iso': 'ISO_21502'
    };

    const options = {
      standardType: standard ? (standardMap[standard.toLowerCase()] || standard.toUpperCase()) : null,
      maxResults: parseInt(maxResults),
      minScore: parseFloat(minScore),
      excludeAppendix: excludeAppendix === 'true' || excludeAppendix === true
    };

    if (sectionTypes) {
      options.sectionTypes = sectionTypes.split(',');
    }

    const results = searchEngine.search(query.trim(), options);
    res.json(results);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compare across standards
app.get('/api/compare', (req, res) => {
  try {
    const { 
      q: query,
      maxResults = 5,
      minScore = 0.1 
    } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = searchEngine.compareAcrossStandards(query.trim(), {
      maxResults: parseInt(maxResults),
      minScore: parseFloat(minScore)
    });

    res.json(results);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific document
app.get('/api/document/:standard', (req, res) => {
  try {
    const { standard } = req.params;
    
    if (!documents[standard]) {
      return res.status(404).json({ error: `Document for standard "${standard}" not found` });
    }

    res.json(documents[standard]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PMPedia API server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /api/health - Health check`);
  console.log(`   GET /api/stats - Document statistics`);
  console.log(`   GET /api/search?q=<query> - Search across all standards`);
  console.log(`   GET /api/compare?q=<query> - Compare query across standards`);
  console.log(`   GET /api/document/<standard> - Get full document`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down server...');
  process.exit(0);
});