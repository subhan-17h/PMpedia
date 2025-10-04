const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.warn('Warning: GEMINI_API_KEY not found in environment variables');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  isConfigured() {
    return this.genAI !== null;
  }

  async compareStandards(query, searchResults) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API is not properly configured. Please check GEMINI_API_KEY environment variable.');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = this.buildComparisonPrompt(query, searchResults);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAIResponse(text);

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to generate AI comparison: ' + error.message);
    }
  }

  buildComparisonPrompt(query, searchResults) {
    const { pmbok, prince2, iso } = searchResults;
    
    // Extract content from each standard
    const pmbokContent = this.extractContentSummary(pmbok, 'PMBOK 7');
    const prince2Content = this.extractContentSummary(prince2, 'PRINCE2');
    const isoContent = this.extractContentSummary(iso, 'ISO 21500');

    return `
You are an expert project management consultant analyzing three major project management standards. 
Please provide a comprehensive comparison based on the search query: "${query}"

Here are the relevant sections found in each standard:

**PMBOK 7 (Project Management Body of Knowledge):**
${pmbokContent}

**PRINCE2 (Projects IN Controlled Environments):**
${prince2Content}

**ISO 21500 (International Standard for Project Management):**
${isoContent}

IMPORTANT: Structure your response EXACTLY using these 5 section headers with ** markers:

**1. SIMILARITIES**
[What common approaches, concepts, or principles do all three standards share regarding "${query}"?]

**2. KEY DIFFERENCES**
[How do the standards differ in their approach to "${query}"? What are the unique perspectives or methodologies each brings?]

**3. STRENGTHS & FOCUS AREAS**
[What are the particular strengths of each standard for "${query}"?]
- PMBOK 7: [strengths]
- PRINCE2: [strengths]
- ISO 21500: [strengths]

**4. PRACTICAL IMPLICATIONS**
[How might these differences impact project managers in practice when dealing with "${query}"?]

**5. RECOMMENDATIONS**
[When might a project manager choose one standard over another for addressing "${query}"?]

CRITICAL FORMATTING RULES:
- Use EXACTLY these section headers with numbers: **1. SIMILARITIES**, **2. KEY DIFFERENCES**, etc.
- DO NOT add any introduction or preamble before the first section
- DO NOT add any title like "Comprehensive Comparison" before the sections
- Start directly with **1. SIMILARITIES**
- Use bullet points (- or *) for lists within sections
- Keep the analysis professional and practical
`;
  }

  extractContentSummary(standardResults, standardName) {
    if (!standardResults || standardResults.length === 0) {
      return `No relevant content found in ${standardName} for this query.`;
    }

    return standardResults.map((result, index) => {
      const title = result.section_title || result.title || 'Untitled Section';
      const content = (result.text || result.content || '').substring(0, 500);
      const sectionNumber = result.section_number || result.sectionId || 'N/A';
      
      return `
**Section ${sectionNumber}: ${title}**
${content}${content.length >= 500 ? '...' : ''}
`;
    }).join('\n');
  }

  parseAIResponse(responseText) {
    try {
      // Try to parse structured sections from the response
      const sections = {
        similarities: '',
        differences: '',
        strengths: '',
        practicalImplications: '',
        recommendations: '',
        fullResponse: responseText
      };

      // Extract specific sections using more flexible regex patterns
      // Pattern 1: **1. SIMILARITIES** or **SIMILARITIES** or ## 1. SIMILARITIES
      const similaritiesMatch = responseText.match(/(?:\*\*|##)\s*(?:\d+\.\s*)?SIMILARITIES\*\*?(.*?)(?=(?:\*\*|##)\s*(?:\d+\.\s*)?(?:KEY DIFFERENCES|DIFFERENCES)|$)/is);
      if (similaritiesMatch) {
        sections.similarities = similaritiesMatch[1].trim();
      }

      // Pattern 2: **2. KEY DIFFERENCES** or **KEY DIFFERENCES**
      const differencesMatch = responseText.match(/(?:\*\*|##)\s*(?:\d+\.\s*)?(?:KEY\s+)?DIFFERENCES\*\*?(.*?)(?=(?:\*\*|##)\s*(?:\d+\.\s*)?(?:STRENGTHS|FOCUS AREAS)|$)/is);
      if (differencesMatch) {
        sections.differences = differencesMatch[1].trim();
      }

      // Pattern 3: **3. STRENGTHS & FOCUS AREAS** or **STRENGTHS**
      const strengthsMatch = responseText.match(/(?:\*\*|##)\s*(?:\d+\.\s*)?(?:STRENGTHS\s*(?:&|AND)?\s*FOCUS\s*AREAS?|STRENGTHS)\*\*?(.*?)(?=(?:\*\*|##)\s*(?:\d+\.\s*)?(?:PRACTICAL|IMPLICATIONS)|$)/is);
      if (strengthsMatch) {
        sections.strengths = strengthsMatch[1].trim();
      }

      // Pattern 4: **4. PRACTICAL IMPLICATIONS**
      const practicalMatch = responseText.match(/(?:\*\*|##)\s*(?:\d+\.\s*)?PRACTICAL\s+IMPLICATIONS\*\*?(.*?)(?=(?:\*\*|##)\s*(?:\d+\.\s*)?RECOMMENDATIONS|$)/is);
      if (practicalMatch) {
        sections.practicalImplications = practicalMatch[1].trim();
      }

      // Pattern 5: **5. RECOMMENDATIONS**
      const recommendationsMatch = responseText.match(/(?:\*\*|##)\s*(?:\d+\.\s*)?RECOMMENDATIONS\*\*?(.*?)$/is);
      if (recommendationsMatch) {
        sections.recommendations = recommendationsMatch[1].trim();
      }

      // Check if we successfully parsed at least some sections
      const hasValidSections = sections.similarities || sections.differences || 
                               sections.strengths || sections.practicalImplications || 
                               sections.recommendations;

      if (!hasValidSections) {
        console.warn('Could not parse AI response into sections. Using fallback.');
        // Try alternative parsing for numbered format: "1. SIMILARITIES"
        const altSimilarities = responseText.match(/1\.\s*\*\*SIMILARITIES\*\*(.*?)(?=2\.|$)/is);
        const altDifferences = responseText.match(/2\.\s*\*\*(?:KEY\s+)?DIFFERENCES\*\*(.*?)(?=3\.|$)/is);
        const altStrengths = responseText.match(/3\.\s*\*\*STRENGTHS.*?\*\*(.*?)(?=4\.|$)/is);
        const altPractical = responseText.match(/4\.\s*\*\*PRACTICAL\s+IMPLICATIONS\*\*(.*?)(?=5\.|$)/is);
        const altRecommendations = responseText.match(/5\.\s*\*\*RECOMMENDATIONS\*\*(.*?)$/is);

        if (altSimilarities) sections.similarities = altSimilarities[1].trim();
        if (altDifferences) sections.differences = altDifferences[1].trim();
        if (altStrengths) sections.strengths = altStrengths[1].trim();
        if (altPractical) sections.practicalImplications = altPractical[1].trim();
        if (altRecommendations) sections.recommendations = altRecommendations[1].trim();
      }

      return {
        success: true,
        analysis: sections,
        query: '',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        success: true,
        analysis: {
          fullResponse: responseText,
          similarities: '',
          differences: '',
          strengths: '',
          practicalImplications: '',
          recommendations: ''
        },
        query: '',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Test method to check if the service is working
  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, message: 'Gemini API not configured' };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent('Hello, this is a test. Please respond with "API connection successful".');
      const response = await result.response;
      
      return { 
        success: true, 
        message: 'API connection successful',
        testResponse: response.text()
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'API connection failed: ' + error.message 
      };
    }
  }
}

module.exports = GeminiService;