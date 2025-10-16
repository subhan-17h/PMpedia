# Phase 2: Citation and Reference Updates

## Summary
Updated the Process Proposal feature to include comprehensive citations and references to project management standards.

## Changes Made

### 1. Backend Updates - `backend/services/geminiService.js`

#### Enhanced Prompt with Standard References
Added detailed reference sections for:

**PMBOK 7 (Project Management Body of Knowledge, 7th Edition):**
- 12 Project Management Principles
- 8 Performance Domains (Stakeholders, Team, Development Approach & Life Cycle, Planning, Project Work, Delivery, Measurement, Uncertainty)
- Project life cycle concepts

**PRINCE2 (PRojects IN Controlled Environments):**
- 7 Principles (Continued Business Justification, Learn from Experience, Defined Roles & Responsibilities, Manage by Stages, Manage by Exception, Focus on Products, Tailor to Suit)
- 7 Themes (Business Case, Organization, Quality, Plans, Risk, Change, Progress)
- PRINCE2 Processes

**ISO 21502:2020:**
- Project management framework concepts
- Clause 5: Governance
- Clause 6: Project processes
- Process groups and knowledge areas

#### Citation Format Requirements
The AI will now include citations in this format:
- `(PMBOK 7 - Development Approach Performance Domain, Section 2.4)`
- `(PRINCE2 - Manage by Stages Principle)`
- `(ISO 21502 - Clause 5.2: Governance structure)`

#### Enhanced Section 7: Tailoring Justification
Now requires:
- What was included with specific citations
- What was simplified/omitted with references
- How process balances different approaches with standard citations
- Adaptations made with specific references

#### Enhanced Section 8: Standards References & Citations
Now includes:
- **PMBOK 7:** Performance Domains with section numbers, Principles with numbers, specific practices
- **PRINCE2:** Principles, Themes with descriptions, Processes
- **ISO 21502:** Clauses with numbers and names, sub-sections

### 2. Frontend Updates - `frontend/src/components/ProcessProposal.js`

#### Fixed Markdown Formatting
- Added `cleanMarkdown()` function to properly convert markdown syntax to HTML
- `**text**` → Bold (strong)
- `*text*` → Italic (em)
- `` `text` `` → Code formatting
- Uses `dangerouslySetInnerHTML` for proper HTML rendering

### 3. CSS Updates - `frontend/src/components/ProcessProposal.css`

#### Added Formatted Text Styles
```css
.section-content strong,
.content-list strong {
  color: var(--text-primary);
  font-weight: 600;
}

.section-content em,
.content-list em {
  font-style: italic;
  color: var(--accent-blue);
}

.section-content code,
.content-list code {
  background: var(--secondary-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: var(--accent-purple);
}
```

## Expected Output Format

When users submit a process proposal, the AI will now:

1. **Include inline citations** throughout all sections
   - Example: "The project will use iterative development (PMBOK 7 - Development Approach Performance Domain, Section 2.4)"

2. **Provide detailed justification** in Section 7
   - Each inclusion/omission will reference specific standard sections

3. **Generate comprehensive reference list** in Section 8
   - Organized by standard (PMBOK 7, PRINCE2, ISO 21502)
   - Includes section numbers, names, and explanations

4. **Display formatted text properly**
   - Bold text for emphasis
   - Italic text for citations
   - Code-formatted text for technical terms
   - No weird asterisk symbols

## Testing Instructions

1. Start the backend server:
   ```powershell
   cd backend
   npm start
   ```

2. Start the frontend:
   ```powershell
   cd frontend
   npm start
   ```

3. Navigate to "Process Proposal" in the sidebar

4. Fill out a form for any scenario

5. Submit and verify:
   - Citations appear throughout the response
   - Section 7 includes specific standard references
   - Section 8 lists all standards with section numbers
   - Formatting displays properly (no `**` or `*` symbols visible)
   - Bold, italic, and code formatting works correctly

## Benefits

- **Traceability:** Every recommendation is now traceable to specific standard sections
- **Academic Rigor:** Meets academic requirements for citations and references
- **Professional Quality:** Provides implementable guidance with authoritative sources
- **Clear Justification:** Explains why each element was included or adapted
- **Better Formatting:** Professional display without markdown artifacts
