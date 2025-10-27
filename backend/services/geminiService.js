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

  async generateProcessProposal(scenarioData) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API is not properly configured. Please check GEMINI_API_KEY environment variable.');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = this.buildProcessProposalPrompt(scenarioData);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseProcessProposal(text);

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to generate process proposal: ' + error.message);
    }
  }

  buildProcessProposalPrompt(scenarioData) {
    const { scenario, scenarioInfo, projectName, duration, teamSize, requirements, additionalContext } = scenarioData;

    let scenarioSpecificContext = '';
    
    if (scenario === 'custom-software') {
      scenarioSpecificContext = `
This is a **Custom Software Development Project** with:
- Well-defined requirements
- Short duration (${duration})
- Small team (${teamSize})
- Need for speed and flexibility
- Emphasis on agile/iterative approaches
- Focus on rapid delivery and adaptation

Key Considerations:
- Lightweight governance
- Frequent iterations and feedback loops
- Minimal documentation overhead
- Direct communication channels
- Risk management focused on technical and delivery risks
`;
    } else if (scenario === 'innovative-product') {
      scenarioSpecificContext = `
This is an **Innovative Product Development Project** with:
- R&D-heavy nature
- Uncertain outcomes and exploratory work
- Medium to long duration (${duration})
- Variable team composition
- Need for innovation and iteration
- Balance between structure and flexibility

Key Considerations:
- Adaptive/hybrid methodologies
- Stage-gate reviews for go/no-go decisions
- Prototyping and validation cycles
- Strong stakeholder engagement and expectation management
- Risk management for technical uncertainty and market viability
- Intellectual property considerations
`;
    } else if (scenario === 'government-project') {
      scenarioSpecificContext = `
This is a **Large Government Project** with:
- Multiple components (civil, electrical, IT)
- Long duration (${duration})
- Large, distributed teams
- Strict compliance and regulatory requirements
- Complex stakeholder landscape
- Formal governance structures

Key Considerations:
- Comprehensive governance and control frameworks
- Detailed documentation and audit trails
- Formal procurement and contracting processes
- Change control boards and formal approvals
- Extensive risk management and compliance
- Multi-phase delivery with formal gates
- Integration management across disciplines
`;
    }

    return `
You are an expert project management consultant tasked with designing a comprehensive, tailored end-to-end project process.

**PROJECT INFORMATION:**
- **Project Name:** ${projectName}
- **Duration:** ${duration}
- **Team Size:** ${teamSize}

**PROJECT REQUIREMENTS & OBJECTIVES:**
${requirements}

${additionalContext ? `**ADDITIONAL CONTEXT:**\n${additionalContext}\n` : ''}

**SCENARIO CONTEXT:**
${scenarioSpecificContext}

**YOUR TASK:**
Design a complete, tailored project management process by selectively drawing from the following project management standards. You MUST use these standards as your primary reference sources:

**REFERENCE STANDARDS:**

1. **PMBOK 7 (Project Management Body of Knowledge, 7th Edition):**
   - Use the 12 Project Management Principles
   - Reference the 8 Performance Domains (Stakeholders, Team, Development Approach & Life Cycle, Planning, Project Work, Delivery, Measurement, Uncertainty)
   - Apply relevant project life cycle concepts
   - Cite specific sections, principles, or domains when referencing

2. **PRINCE2 (PRojects IN Controlled Environments):**
   - Use the 7 Principles (Continued Business Justification, Learn from Experience, Defined Roles & Responsibilities, Manage by Stages, Manage by Exception, Focus on Products, Tailor to Suit)
   - Reference the 7 Themes (Business Case, Organization, Quality, Plans, Risk, Change, Progress)
   - Apply relevant processes from the PRINCE2 framework
   - Cite specific principles, themes, or processes when referencing

3. **ISO 21502:2020 (Project, Programme and Portfolio Management - Guidance on Project Management):**
   - Use the project management framework concepts
   - Reference relevant clauses (e.g., Clause 5: Governance, Clause 6: Project processes)
   - Apply ISO process groups and knowledge areas
   - Cite specific clause numbers and section names when referencing

**CRITICAL CITATION REQUIREMENT:**
Throughout your response, when you reference any standard, you MUST include:
- The standard name (PMBOK 7, PRINCE2, or ISO 21502)
- The specific section, domain, principle, theme, process, or clause number
- Example: "Following PMBOK 7's Stakeholder Performance Domain..." or "As per PRINCE2's Manage by Stages principle..." or "According to ISO 21502 Clause 5.2 (Governance structure)..."

The process must be optimized for this specific scenario while maintaining traceability to the source standards.

**DELIVERABLES - Structure your response with EXACTLY these 8 numbered sections:**

**1. EXECUTIVE SUMMARY**
Provide a brief overview of the proposed process, its key characteristics, and why it's suitable for this scenario (3-4 sentences).

**2. PROCESS PHASES & LIFECYCLE**
Define the project phases/stages with clear names, objectives, and duration estimates. Include:
- Phase name and purpose
- Key objectives for each phase
- Expected duration or % of total project time
- Entry and exit criteria

**3. KEY ACTIVITIES & WORKFLOWS**
For each phase, list the critical activities, workflows, and sequences. Include:
- Main activities and their purpose
- Dependencies and sequencing
- Iterative vs. sequential approaches
- Key milestones

**4. ROLES & RESPONSIBILITIES**
Define the project organization structure:
- Key roles needed (e.g., Project Manager, Sponsor, Team roles)
- Primary responsibilities for each role
- Decision-making authorities
- Governance structure (e.g., steering committee, change control board)

**5. ARTIFACTS & DELIVERABLES**
List all key documents, plans, and deliverables:
- Essential documents for each phase
- Templates and formats needed
- Approval requirements
- Document management approach

**6. DECISION GATES & CHECKPOINTS**
Define formal review points and decision gates:
- Gate locations (between phases or within)
- Gate criteria and decision points
- Who makes go/no-go decisions
- What happens if criteria aren't met

**7. TAILORING JUSTIFICATION**
Explain your tailoring decisions with SPECIFIC CITATIONS:
- **What was included and why:** For each major element included, cite the specific standard, section, and name (e.g., "Included PMBOK 7's Team Performance Domain (Section 2.3) because...")
- **What was simplified or omitted and why:** Cite what was left out (e.g., "Omitted PRINCE2's detailed Product Descriptions (Product Theme) because...")
- **How the process balances:** Explain trade-offs with references to standards (e.g., "Balanced using ISO 21502 Clause 6.3 (Planning processes) with PMBOK 7's Agile principles...")
- **Adaptations made:** Describe modifications with citations (e.g., "Adapted PRINCE2's Managing Product Delivery process by...")

**8. STANDARDS REFERENCES & CITATIONS**
Provide a comprehensive reference list with SPECIFIC SECTION NAMES AND NUMBERS:
- **PMBOK 7:** 
  * List each Performance Domain used with its number and name (e.g., "Stakeholder Performance Domain (Section 2.1)")
  * List each Principle applied with its number (e.g., "Principle 4: Build Quality into Processes")
  * Include any specific concepts or practices with their section references
  
- **PRINCE2:** 
  * List each Principle used (e.g., "Principle 1: Continued Business Justification")
  * List each Theme applied (e.g., "Risk Theme - Risk Management Approach")
  * List each Process referenced (e.g., "Starting Up a Project (SU)")
  
- **ISO 21502:2020:** 
  * List each Clause/Section used with number and name (e.g., "Clause 5.2: Governance structure")
  * Include sub-sections where applicable (e.g., "Clause 6.4.3: Resource management processes")
  
For each citation, briefly explain how it was applied or adapted for this scenario.

**FORMATTING REQUIREMENTS:**
- Use the EXACT section headers with numbers: **1. EXECUTIVE SUMMARY**, **2. PROCESS PHASES & LIFECYCLE**, etc.
- Use bullet points (- or *) for lists
- Use sub-bullets for nested items
- Be specific and practical - this should be implementable
- Maintain professional, concise language
- DO NOT add any introductory text before section 1
- START DIRECTLY with **1. EXECUTIVE SUMMARY**

**CITATION REQUIREMENTS (CRITICAL):**
- Throughout ALL sections, include inline citations when referencing standards
- Format citations as: [Standard Name - Section/Principle/Theme/Clause]
- Example: "The project will use iterative development (PMBOK 7 - Development Approach Performance Domain, Section 2.4)"
- Example: "Stage gates will be implemented (PRINCE2 - Manage by Stages Principle)"
- Example: "Governance structure follows (ISO 21502 - Clause 5.2: Governance structure)"
- In Section 8, provide a comprehensive consolidated list of all references used

Generate a comprehensive, practical, and well-justified process proposal with clear traceability to the reference standards.
`;
  }

  parseProcessProposal(responseText) {
    try {
      // Extract citations if present at the end
      let citations = '';
      const citationsMatch = responseText.match(/\*\*8\.\s*STANDARDS REFERENCES & CITATIONS\*\*(.*?)$/is);
      if (citationsMatch) {
        citations = citationsMatch[1].trim();
      }

      return {
        success: true,
        analysis: responseText,
        citations: citations,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error parsing process proposal:', error);
      return {
        success: true,
        analysis: responseText,
        citations: '',
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = GeminiService;