# PMpedia 📚

**PMpedia** is a comprehensive project management standards search and comparison platform that enables users to explore, search, and compare content across multiple project management frameworks including PMBOK 7, PRINCE2, ISO 21500, and ISO 21502.

## 🌟 Features

### Core Functionality
- **🔍 Intelligent Search**: Advanced semantic search across multiple project management standards
- **⚖️ Cross-Standard Comparison**: Side-by-side comparison of search results from different standards
- **📊 Document Statistics**: Comprehensive analytics of processed documents
- **📖 Markdown Viewer**: Live preview of formatted markdown documents with navigation
- **🎯 Advanced Filtering**: Filter results by document type, relevance, and content
- **💡 Interactive UI**: Modern, responsive interface with consistent dark theme

### Search Capabilities
- **Multi-Standard Search**: Simultaneous search across PMBOK 7, PRINCE2, ISO 21500, and ISO 21502
- **Semantic Matching**: Intelligent content matching using natural language processing
- **Context-Aware Results**: Results include section hierarchies and parent context
- **Expandable Content**: Toggle between summary and full content views
- **Matched Terms Highlighting**: Visual indication of search term matches

### Comparison Features
- **Visual Comparison Grid**: Side-by-side view of results from different standards
- **Standard Toggles**: Selectively enable/disable specific standards in comparison
- **Breadcrumb Navigation**: Clear hierarchical context for each result
- **Summary Statistics**: Quick overview of search results across all standards

### Document Viewing Features
- **Markdown Preview**: Rich markdown rendering with full document formatting
- **Interactive Navigation**: Browse through different standards and sections
- **Mathematical Notation**: Support for KaTeX mathematical expressions
- **Image Support**: Embedded images and diagrams from source documents
- **Responsive Layout**: Optimized viewing experience across all devices

## 🏗️ Architecture

### Frontend (React.js)
- **Modern React Application**: Built with React 19.2.0 and functional components
- **Component-Based Architecture**: Modular design with reusable components
- **Responsive Design**: Optimized for desktop and mobile devices
- **Glass Morphism UI**: Modern design with backdrop blur effects and rounded borders
- **Markdown Rendering**: Advanced markdown support with react-markdown, remark-gfm, and rehype-katex
- **Consistent Dark Theme**: Professional dark interface with accent color coding

### Backend (Node.js + Express)
- **RESTful API**: Clean API endpoints for search and comparison
- **Document Processing**: Python-based PDF processing and text extraction
- **Natural Language Processing**: Advanced text analysis and matching
- **JSON Data Storage**: Processed documents stored in structured JSON format

### Data Processing Pipeline
- **PDF Extraction**: Convert PDF documents to structured text
- **Section Parsing**: Intelligent section and hierarchy detection
- **Content Indexing**: Optimized search index creation
- **Metadata Enrichment**: Page numbers, levels, and contextual information

## 📁 Project Structure

```
PMpedia/
├── frontend/                 # React.js frontend application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── SearchInterface.js      # Main search interface
│   │   │   ├── ComparisonView.js       # Cross-standard comparison
│   │   │   ├── DocumentStats.js       # Analytics dashboard
│   │   │   ├── MarkdownViewer.js       # Document preview component
│   │   │   └── Settings.js             # Application settings
│   │   ├── App.js           # Main application component
│   │   └── index.js         # Application entry point
│   └── package.json         # Frontend dependencies
├── backend/                 # Node.js backend server
│   ├── data/
│   │   ├── raw/            # Original PDF documents
│   │   │   ├── pmbok7.pdf
│   │   │   ├── prince2.pdf
│   │   │   └── iso21500.pdf
│   │   └── processed/      # Processed JSON data
│   │       ├── pmbok.json
│   │       ├── prince2.json
│   │       └── iso21502.json
│   ├── markdowns/          # Markdown document files
│   │   ├── iso21500_output/
│   │   ├── iso21502_output/
│   │   ├── pmbok7_output/
│   │   └── prince2_output/
│   ├── server.js           # Express server and API endpoints
│   ├── process_pdf.py      # Python document processing script
│   ├── package.json        # Backend dependencies
│   └── requirements.txt    # Python dependencies
└── README.md               # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/subhan-17h/PMpedia.git
   cd PMpedia
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   
   # Install Python dependencies
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Key Dependencies

#### Frontend
- **react-markdown**: Advanced markdown rendering with custom components
- **remark-gfm**: GitHub Flavored Markdown support (tables, strikethrough, task lists)
- **rehype-katex & remark-math**: Mathematical expression rendering
- **React 19.2.0**: Latest React with improved performance and features

#### Backend  
- **Express.js**: Web application framework for API endpoints
- **Python**: Document processing and text extraction utilities

4. **Process Documents (Optional)**
   ```bash
   cd ../backend
   python process_pdf.py
   ```
   *Note: Pre-processed JSON files are included, so this step is optional unless you want to reprocess the documents.*

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm start
   # Server will run on http://localhost:5000
   ```

2. **Start the Frontend Application**
   ```bash
   cd frontend
   npm start
   # Application will open on http://localhost:3000
   ```

3. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

## � Usage Guide

### Navigation
- **Search Interface**: Main search functionality with cross-standard comparison
- **Document Stats**: Analytics and statistics dashboard
- **Markdown Viewer**: Browse and read formatted documents with live preview
- **Settings**: Application configuration and preferences

### Using the Markdown Viewer
1. **Select Documents**: Click "Markdown Viewer" in the sidebar
2. **Choose Standard**: Select from PMBOK 7, PRINCE2, ISO 21500, or ISO 21502
3. **Browse Content**: Navigate through formatted sections with proper styling
4. **View Images**: Embedded diagrams and figures display automatically
5. **Mathematical Expressions**: KaTeX renders formulas and equations seamlessly

### Search Features
- Use natural language queries for best results
- Enable/disable specific standards using toggles
- View results in summary or full content modes
- Compare findings across multiple standards simultaneously

## �🔧 API Endpoints

### Search API
- **GET** `/api/search?q={query}&standards={standards}&limit={limit}`
  - Search across specified standards
  - Query parameters:
    - `q`: Search query string
    - `standards`: Comma-separated list (pmbok,prince2,iso)
    - `limit`: Maximum results per standard (default: 10)

### Comparison API
- **GET** `/api/compare?q={query}&limit={limit}`
  - Compare results across all standards
  - Returns structured comparison data with summary statistics

### Statistics API
- **GET** `/api/stats`
  - Get document statistics and metadata
  - Returns section counts, processing information, and document details

### Markdown API
- **GET** `/api/markdown/documents`
  - Get list of available markdown documents
  - Returns document metadata and availability status

- **GET** `/api/markdown/{document}`
  - Retrieve specific markdown document content
  - Supports: `iso21500`, `iso21502`, `pmbok7`, `prince2`
  - Returns formatted markdown with embedded images and metadata

## 📋 Supported Standards

### PMBOK 7 (Project Management Body of Knowledge)
- **Publisher**: Project Management Institute (PMI)
- **Focus**: Principles-based approach to project management
- **Content**: Performance domains, project lifecycle, and tailoring guidance

### PRINCE2 (Projects in Controlled Environments)
- **Publisher**: AXELOS
- **Focus**: Process-driven project management methodology
- **Content**: Themes, processes, and management products

### ISO 21500 (Project Management Guidelines)
- **Publisher**: International Organization for Standardization
- **Focus**: International standard for project management
- **Content**: Process groups, knowledge areas, and best practices

### ISO 21502 (Project, Programme and Portfolio Management)
- **Publisher**: International Organization for Standardization
- **Focus**: Guidance on project, programme and portfolio management
- **Content**: Management principles, processes, and organizational governance

## 🛠️ Development

### Frontend Development
```bash
cd frontend
npm run start    # Development server with hot reload
npm run build    # Production build
npm run test     # Run test suite
```

### Backend Development
```bash
cd backend
npm run dev      # Development server with nodemon
npm run start    # Production server
```

### Adding New Standards

1. **Add PDF Document**
   - Place PDF in `backend/data/raw/`

2. **Process Document**
   ```bash
   cd backend
   python process_pdf.py --input "data/raw/new_standard.pdf" --output "data/processed/new_standard.json"
   ```

3. **Update Backend**
   - Modify `server.js` to include new standard in search endpoints
   - Update standard mappings and display names

4. **Update Frontend**
   - Add new standard to `standardDisplayNames` in components
   - Update CSS classes and color schemes

## 🧪 Testing

### Backend Testing
```bash
cd backend
# Test API endpoints
curl "http://localhost:5000/api/search?q=risk&standards=pmbok,prince2,iso&limit=5"
curl "http://localhost:5000/api/compare?q=stakeholder"
curl "http://localhost:5000/api/stats"
curl "http://localhost:5000/api/markdown/documents"
curl "http://localhost:5000/api/markdown/pmbok7"
```

### Frontend Testing
```bash
cd frontend
npm test                    # Run unit tests
npm test -- --coverage     # Run tests with coverage report
```

## 🚀 Deployment

### Production Build
1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Configure Backend for Production**
   ```bash
   cd backend
   # Set production environment variables
   export NODE_ENV=production
   export PORT=5000
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Deployment (Optional)
```dockerfile
# Example Dockerfile structure
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Code Style Guidelines
- **Frontend**: Follow React best practices and ESLint configuration
- **Backend**: Use Express.js conventions and proper error handling
- **Python**: Follow PEP 8 style guidelines for document processing scripts

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Project Management Institute (PMI)** - PMBOK Guide
- **AXELOS** - PRINCE2 Methodology
- **International Organization for Standardization** - ISO 21500 & ISO 21502 Standards
- **React Community** - Frontend framework and ecosystem
- **Node.js Community** - Backend runtime and packages
- **react-markdown Contributors** - Advanced markdown rendering capabilities
- **KaTeX Team** - Mathematical expression rendering

## 📧 Contact

- **Project Repository**: [PMpedia on GitHub](https://github.com/subhan-17h/PMpedia)
- **Developer**: Subhan
- **Version**: 1.1.0

---

**PMpedia** - Making project management standards accessible and comparable for everyone! 🚀