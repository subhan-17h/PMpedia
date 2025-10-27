#type: ignore
"""
Document Processor for PMPedia Standards

This module implements the core document processing pipeline for project management standards.
It handles the extraction, parsing, and structuring of content from PMBOK 7, PRINCE2, and ISO 21502.

Based on analysis results:
- PRINCE2: 283 pages, process_theme_principle organization
- PMBOK: 370 pages, domain_based organization  
- ISO 21502: 62 pages, hierarchical_clauses organization

Author: PMPedia Team
"""

import logging
import re
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode
from rich.console import Console
from rich.progress import Progress, TaskID

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

console = Console()

class StandardType(Enum):
    """Types of project management standards"""
    PMBOK = "PMBOK"
    PRINCE2 = "PRINCE2" 
    ISO = "ISO"
    UNKNOWN = "UNKNOWN"

class SectionType(Enum):
    """Types of document sections"""
    CHAPTER = "chapter"
    SECTION = "section"
    SUBSECTION = "subsection"
    APPENDIX = "appendix"
    GLOSSARY = "glossary"
    TABLE_OF_CONTENTS = "table_of_contents"
    FIGURE = "figure"
    TABLE = "table"

@dataclass
class DocumentMetadata:
    """Metadata for processed documents"""
    standard_type: StandardType
    title: str
    version: str
    total_pages: int
    processing_date: datetime
    file_path: Path
    organizational_pattern: str
    extraction_challenges: List[str] = field(default_factory=list)

@dataclass
class SectionMetadata:
    """Metadata for individual sections"""
    section_id: str
    title: str
    level: int
    section_type: SectionType
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    parent_section_id: Optional[str] = None
    cross_references: List[str] = field(default_factory=list)

@dataclass
class ProcessedSection:
    """A processed document section"""
    metadata: SectionMetadata
    content: str
    raw_content: str
    tables: List[Dict[str, Any]] = field(default_factory=list)
    figures: List[Dict[str, Any]] = field(default_factory=list)
    quality_score: float = 0.0

@dataclass
class ProcessedDocument:
    """Complete processed document"""
    metadata: DocumentMetadata
    sections: List[ProcessedSection]
    table_of_contents: List[SectionMetadata]
    processing_stats: Dict[str, Any] = field(default_factory=dict)

class StandardsProcessor:
    """
    Core processor for project management standards documents.
    Handles extraction, parsing, and structuring with standard-specific logic.
    """
    
    def __init__(self, enable_ocr: bool = False, enable_tables: bool = True, use_gpu: bool = True):
        """
        Initialize the standards processor
        
        Args:
            enable_ocr: Enable OCR for image-heavy documents
            enable_tables: Enable table structure recognition
            use_gpu: Enable GPU acceleration if available
        """
        self.console = Console()
        self.logger = logging.getLogger(__name__)
        
        # Detect GPU availability
        self.gpu_available = self._detect_gpu_availability()
        self.use_gpu = use_gpu and self.gpu_available
        
        if self.use_gpu:
            self.console.print("[bold green]🚀 GPU acceleration enabled[/bold green]")
        else:
            reason = "not requested" if not use_gpu else "not available"
            self.console.print(f"[yellow]💻 Using CPU processing (GPU {reason})[/yellow]")
        
        # Configure Docling pipeline
        pipeline_options = PdfPipelineOptions(
            do_table_structure=enable_tables,
            do_ocr=enable_ocr
        )
        
        if enable_tables:
            # Use accurate TableFormer for complex tables
            pipeline_options.table_structure_options.mode = TableFormerMode.ACCURATE
        
        # Configure accelerator device for GPU processing
        if self.use_gpu:
            # Set device for GPU acceleration
            pipeline_options.accelerator_options.device = "cuda"
            self.logger.info("Configured pipeline for CUDA acceleration")
        else:
            pipeline_options.accelerator_options.device = "cpu"
            self.logger.info("Configured pipeline for CPU processing")
        
        self.converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        
        # Standard-specific patterns
        self.standard_patterns = {
            StandardType.PMBOK: {
                "organizational_type": "domain_based",
                "key_identifiers": ["performance domain", "principle", "project delivery"],
                "section_patterns": {
                    r"^(\d+\.?\d*)\s+(.+)$": "numbered_section",
                    r"^(Chapter\s+\d+)[\s:]?(.*)$": "chapter",
                    r"^(Appendix\s+[A-Z])[\s:]?(.*)$": "appendix"
                },
                "cross_ref_patterns": [
                    r"Section\s+(\d+\.?\d*)",
                    r"Chapter\s+(\d+)",
                    r"Appendix\s+([A-Z])",
                    r"Figure\s+(\d+[\.-]\d*)",
                    r"Table\s+(\d+[\.-]\d*)"
                ]
            },
            StandardType.PRINCE2: {
                "organizational_type": "process_theme_principle",
                "key_identifiers": ["process", "theme", "principle", "technique"],
                "section_patterns": {
                    r"^(\d+\.?\d*)\s+(.+)$": "numbered_section",
                    r"^([A-Z]\d+)[\s:]?(.*)$": "process_code",
                    r"^(Appendix\s+[A-Z])[\s:]?(.*)$": "appendix"
                },
                "cross_ref_patterns": [
                    r"Section\s+(\d+\.?\d*)",
                    r"Process\s+([A-Z]\d+)",
                    r"Theme\s+([A-Z]\d+)",
                    r"Figure\s+(\d+[\.-]\d*)",
                    r"Table\s+(\d+[\.-]\d*)"
                ]
            },
            StandardType.ISO: {
                "organizational_type": "hierarchical_clauses",
                "key_identifiers": ["clause", "normative", "informative"],
                "section_patterns": {
                    r"^(\d+\.?\d*)\s+(.+)$": "clause",
                    r"^(Annex\s+[A-Z])[\s:]?(.*)$": "annex",
                    r"^(Bibliography)$": "bibliography"
                },
                "cross_ref_patterns": [
                    r"Clause\s+(\d+\.?\d*)",
                    r"Annex\s+([A-Z])",
                    r"Figure\s+(\d+)",
                    r"Table\s+(\d+)"
                ]
            }
        }
    
    def _detect_gpu_availability(self) -> bool:
        """
        Detect if GPU is available for processing
        
        Returns:
            bool: True if GPU is available and functional
        """
        if not TORCH_AVAILABLE:
            self.logger.info("PyTorch not available - GPU acceleration disabled")
            return False
        
        try:
            if torch.cuda.is_available():
                device_count = torch.cuda.device_count()
                current_device = torch.cuda.current_device()
                device_name = torch.cuda.get_device_name(current_device)
                
                self.logger.info(f"GPU detected: {device_name} (Device {current_device}/{device_count})")
                self.console.print(f"[bold cyan]🎯 GPU Available:[/bold cyan] {device_name}")
                return True
            else:
                self.logger.info("CUDA not available - using CPU")
                return False
        except Exception as e:
            self.logger.warning(f"Error detecting GPU: {e}")
            return False
    
    def process_document(self, file_path: Path) -> ProcessedDocument:
        """
        Process a complete document
        
        Args:
            file_path: Path to the PDF document
            
        Returns:
            ProcessedDocument with all sections and metadata
        """
        self.console.print(f"[bold blue]Processing: {file_path.name}[/bold blue]")
        
        with Progress() as progress:
            task = progress.add_task("Converting PDF...", total=100)
            
            try:
                # Step 1: Convert PDF (60% of progress)
                result = self.converter.convert(file_path)
                document = result.document
                progress.update(task, advance=60)
                
                # Step 2: Extract metadata (10% of progress)
                metadata = self._extract_document_metadata(file_path, document)
                progress.update(task, advance=10)
                
                # Step 3: Process sections (25% of progress)
                sections = self._extract_and_process_sections(document, metadata.standard_type)
                progress.update(task, advance=25)
                
                # Step 4: Generate table of contents (5% of progress)
                toc = self._generate_table_of_contents(sections)
                progress.update(task, advance=5)
                
                # Calculate processing statistics
                stats = self._calculate_processing_stats(sections, document)
                
                processed_doc = ProcessedDocument(
                    metadata=metadata,
                    sections=sections,
                    table_of_contents=toc,
                    processing_stats=stats
                )
                
                self._display_processing_results(processed_doc)
                return processed_doc
                
            except Exception as e:
                self.console.print(f"[bold red]Error processing {file_path.name}: {str(e)}[/bold red]")
                raise
    
    def _extract_document_metadata(self, file_path: Path, document) -> DocumentMetadata:
        """Extract document-level metadata"""
        standard_type = self._identify_standard_type(file_path.name)
        
        # Extract basic information
        total_pages = len(document.pages) if hasattr(document, 'pages') else 0
        
        # Try to extract title and version from document
        markdown_content = document.export_to_markdown()
        title = self._extract_title(markdown_content, standard_type)
        version = self._extract_version(markdown_content, standard_type)
        
        # Get organizational pattern and challenges from our analysis
        pattern_info = self.standard_patterns.get(standard_type, {})
        organizational_pattern = pattern_info.get("organizational_type", "unknown")
        
        return DocumentMetadata(
            standard_type=standard_type,
            title=title,
            version=version,
            total_pages=total_pages,
            processing_date=datetime.now(),
            file_path=file_path,
            organizational_pattern=organizational_pattern,
            extraction_challenges=self._identify_extraction_challenges(document, standard_type)
        )
    
    def _identify_standard_type(self, filename: str) -> StandardType:
        """Identify the type of standard from filename"""
        filename_lower = filename.lower()
        if "pmbok" in filename_lower:
            return StandardType.PMBOK
        elif "prince2" in filename_lower:
            return StandardType.PRINCE2
        elif "iso" in filename_lower or "21502" in filename_lower or "21500" in filename_lower:
            return StandardType.ISO
        else:
            return StandardType.UNKNOWN
    
    def _extract_title(self, content: str, standard_type: StandardType) -> str:
        """Extract document title"""
        lines = content.split('\n')[:20]  # Check first 20 lines
        
        for line in lines:
            line = line.strip()
            if standard_type == StandardType.PMBOK and "pmbok" in line.lower():
                return line
            elif standard_type == StandardType.PRINCE2 and "prince2" in line.lower():
                return line
            elif standard_type == StandardType.ISO and ("iso" in line.lower() or "21502" in line):
                return line
        
        return f"{standard_type.value} Standard"
    
    def _extract_version(self, content: str, standard_type: StandardType) -> str:
        """Extract document version"""
        version_patterns = [
            r"version\s+(\d+\.?\d*)",
            r"edition\s+(\d+\.?\d*)",
            r"v(\d+\.?\d*)",
            r"(\d{4}[-]\d{2})"  # ISO date format
        ]
        
        content_lower = content.lower()
        for pattern in version_patterns:
            match = re.search(pattern, content_lower)
            if match:
                return match.group(1)
        
        return "Unknown"
    
    def _extract_and_process_sections(self, document, standard_type: StandardType) -> List[ProcessedSection]:
        """Extract and process all document sections"""
        sections = []
        markdown_content = document.export_to_markdown()
        
        # Split into sections based on headers
        section_blocks = self._split_into_sections(markdown_content)
        
        for i, (header, content) in enumerate(section_blocks):
            try:
                section_metadata = self._create_section_metadata(
                    header, content, i, standard_type
                )
                
                processed_content = self._process_section_content(content)
                tables = self._extract_tables(content)
                figures = self._extract_figures(content)
                quality_score = self._calculate_section_quality(processed_content, tables, figures)
                
                section = ProcessedSection(
                    metadata=section_metadata,
                    content=processed_content,
                    raw_content=content,
                    tables=tables,
                    figures=figures,
                    quality_score=quality_score
                )
                
                sections.append(section)
                
            except Exception as e:
                self.logger.warning(f"Failed to process section {i}: {str(e)}")
                continue
        
        return sections
    
    def _split_into_sections(self, content: str) -> List[Tuple[str, str]]:
        """Split document content into sections based on headers"""
        sections = []
        lines = content.split('\n')
        
        current_header = ""
        current_content = []
        
        for line in lines:
            # Detect headers (# ## ### etc.)
            if line.strip().startswith('#') and len(line.strip()) > 3:
                # Save previous section
                if current_header and current_content:
                    sections.append((current_header, '\n'.join(current_content)))
                
                # Start new section
                current_header = line.strip()
                current_content = []
            else:
                current_content.append(line)
        
        # Add last section
        if current_header and current_content:
            sections.append((current_header, '\n'.join(current_content)))
        
        return sections
    
    def _create_section_metadata(self, header: str, content: str, index: int, 
                                 standard_type: StandardType) -> SectionMetadata:
        """Create metadata for a section"""
        # Extract section level (number of #'s)
        level = len(header.split(' ')[0]) if header.startswith('#') else 1
        
        # Clean title
        title = header.strip('#').strip()
        
        # Generate section ID
        section_id = self._generate_section_id(title, index, standard_type)
        
        # Determine section type
        section_type = self._determine_section_type(title, content)
        
        # Extract cross-references
        cross_refs = self._extract_cross_references(content, standard_type)
        
        return SectionMetadata(
            section_id=section_id,
            title=title,
            level=level,
            section_type=section_type,
            cross_references=cross_refs
        )
    
    def _generate_section_id(self, title: str, index: int, standard_type: StandardType) -> str:
        """Generate a stable section ID"""
        # Clean title for ID
        clean_title = re.sub(r'[^\w\s-]', '', title).strip()
        clean_title = re.sub(r'\s+', '_', clean_title)
        
        return f"{standard_type.value.lower()}{index:03d}{clean_title[:30].lower()}"
    
    def _determine_section_type(self, title: str, content: str) -> SectionType:
        """Determine the type of section"""
        title_lower = title.lower()
        content_lower = content.lower()
        
        if "appendix" in title_lower:
            return SectionType.APPENDIX
        elif "glossary" in title_lower or "definition" in title_lower:
            return SectionType.GLOSSARY
        elif "contents" in title_lower or "table of contents" in title_lower:
            return SectionType.TABLE_OF_CONTENTS
        elif "chapter" in title_lower:
            return SectionType.CHAPTER
        elif "figure" in content_lower and len(content.split('\n')) < 5:
            return SectionType.FIGURE
        elif "table" in content_lower and "|" in content:
            return SectionType.TABLE
        elif title.count('.') >= 2:  # e.g., "1.2.3 Subsection"
            return SectionType.SUBSECTION
        else:
            return SectionType.SECTION
    
    def _extract_cross_references(self, content: str, standard_type: StandardType) -> List[str]:
        """Extract cross-references from content"""
        cross_refs = []
        patterns = self.standard_patterns.get(standard_type, {}).get("cross_ref_patterns", [])
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            cross_refs.extend([match if isinstance(match, str) else match[0] for match in matches])
        
        return list(set(cross_refs))  # Remove duplicates
    
    def _process_section_content(self, content: str) -> str:
        """Clean and process section content"""
        # Remove excessive whitespace
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        # Clean up common PDF extraction artifacts
        content = re.sub(r'<!--\s*image\s*-->', '[IMAGE]', content)
        content = re.sub(r'<!--[^>]*-->', '', content)  # Remove HTML comments
        
        # Normalize bullet points
        content = re.sub(r'^[\s][•▪▫◦‣⁃]\s', '• ', content, flags=re.MULTILINE)
        
        return content.strip()
    
    def _extract_tables(self, content: str) -> List[Dict[str, Any]]:
        """Extract table information from content"""
        tables = []
        
        # Look for markdown tables
        table_pattern = r'(\|[^|\n]\|[\s\S]?(?=\n\s*\n|\n\s*[^|]|\Z))'
        matches = re.findall(table_pattern, content)
        
        for i, match in enumerate(matches):
            tables.append({
                "index": i,
                "content": match.strip(),
                "type": "markdown_table"
            })
        
        return tables
    
    def _extract_figures(self, content: str) -> List[Dict[str, Any]]:
        """Extract figure information from content"""
        figures = []
        
        # Look for figure references
        figure_patterns = [
            r'Figure\s+(\d+[\.-]?\d*):?\s*([^\n]*)',
            r'\[IMAGE\]([^\n]*)',
            r'<!---?\s*image\s*--->([^\n]*)'
        ]
        
        for pattern in figure_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for i, match in enumerate(matches):
                if isinstance(match, tuple):
                    fig_num, description = match
                else:
                    fig_num, description = str(i), match
                
                figures.append({
                    "number": fig_num,
                    "description": description.strip(),
                    "type": "referenced_figure"
                })
        
        return figures
    
    def _calculate_section_quality(self, content: str, tables: List, figures: List) -> float:
        """Calculate quality score for a section"""
        score = 0.0
        
        # Content length score (0-0.4)
        content_length = len(content.strip())
        if content_length > 500:
            score += 0.4
        elif content_length > 100:
            score += 0.2
        
        # Structure score (0-0.3)
        if tables:
            score += 0.1
        if figures:
            score += 0.1
        if '\n' in content:  # Has paragraphs
            score += 0.1
        
        # Content quality score (0-0.3)
        if not content.strip():
            return 0.0
        
        # Check for meaningful content
        words = content.split()
        if len(words) > 10:
            score += 0.1
        if len(set(words)) > len(words) * 0.3:  # Word diversity
            score += 0.1
        if not re.search(r'(image|figure|table|todo|placeholder)', content.lower()):
            score += 0.1
        
        return min(1.0, score)
    
    def _generate_table_of_contents(self, sections: List[ProcessedSection]) -> List[SectionMetadata]:
        """Generate table of contents from processed sections"""
        toc = []
        
        for section in sections:
            if (section.metadata.section_type in [SectionType.CHAPTER, SectionType.SECTION, SectionType.SUBSECTION] 
                and section.quality_score > 0.3):
                toc.append(section.metadata)
        
        return toc
    
    def _calculate_processing_stats(self, sections: List[ProcessedSection], document) -> Dict[str, Any]:
        """Calculate processing statistics"""
        total_sections = len(sections)
        valid_sections = sum(1 for s in sections if s.quality_score > 0.3)
        total_tables = sum(len(s.tables) for s in sections)
        total_figures = sum(len(s.figures) for s in sections)
        avg_quality = sum(s.quality_score for s in sections) / total_sections if total_sections > 0 else 0.0
        
        return {
            "total_sections": total_sections,
            "valid_sections": valid_sections,
            "total_tables": total_tables,
            "total_figures": total_figures,
            "average_quality_score": round(avg_quality, 2),
            "processing_success_rate": round((valid_sections / total_sections) * 100, 1) if total_sections > 0 else 0.0
        }
    
    def _identify_extraction_challenges(self, document, standard_type: StandardType) -> List[str]:
        """Identify extraction challenges for this document"""
        challenges = []
        markdown_content = document.export_to_markdown()
        
        # Common challenges
        if "table" in markdown_content.lower() or "|" in markdown_content:
            challenges.append("Complex tables requiring structure preservation")
        
        if "figure" in markdown_content.lower() or "image" in markdown_content.lower():
            challenges.append("Figures and diagrams requiring description extraction")
        
        if len(markdown_content.split('\n')) > 10000:
            challenges.append("Large document requiring efficient chunking strategy")
        
        # Standard-specific challenges
        if standard_type == StandardType.PMBOK:
            challenges.append("Performance domain cross-references need mapping")
        elif standard_type == StandardType.PRINCE2:
            challenges.append("Process-theme relationships need preservation")
        elif standard_type == StandardType.ISO:
            challenges.append("Hierarchical clause structure must be maintained")
        
        return challenges
    
    def _display_processing_results(self, processed_doc: ProcessedDocument):
        """Display processing results"""
        stats = processed_doc.processing_stats
        
        self.console.print(f"\n[bold green]✅ Processing Complete: {processed_doc.metadata.standard_type.value}[/bold green]")
        self.console.print(f"[cyan]Total Sections:[/cyan] {stats['total_sections']}")
        self.console.print(f"[cyan]Valid Sections:[/cyan] {stats['valid_sections']}")
        self.console.print(f"[cyan]Tables Found:[/cyan] {stats['total_tables']}")
        self.console.print(f"[cyan]Figures Found:[/cyan] {stats['total_figures']}")
        self.console.print(f"[cyan]Average Quality Score:[/cyan] {stats['average_quality_score']}")
        self.console.print(f"[cyan]Success Rate:[/cyan] {stats['processing_success_rate']}%")

    def save_processed_document(self, processed_doc: ProcessedDocument, output_dir: Path = None) -> Path:
        """
        Save processed document to JSON format
        
        Args:
            processed_doc: The processed document to save
            output_dir: Directory to save the output (defaults to 'data/processed')
            
        Returns:
            Path to the saved JSON file
        """
        if output_dir is None:
            output_dir = Path("data/processed")
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename based on document metadata
        timestamp = processed_doc.metadata.processing_date.strftime("%Y%m%d_%H%M%S")
        standard_type = processed_doc.metadata.standard_type.value.lower()
        output_filename = f"{standard_type}_{timestamp}.json"
        output_path = output_dir / output_filename
        
        # Convert to dictionary for JSON serialization
        doc_dict = self._convert_to_json_serializable(processed_doc)
        
        # Save to JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(doc_dict, f, indent=2, ensure_ascii=False)
        
        self.console.print(f"[bold green]💾 Saved processed document to:[/bold green] {output_path}")
        return output_path
    
    def _convert_to_json_serializable(self, processed_doc: ProcessedDocument) -> Dict[str, Any]:
        """
        Convert ProcessedDocument to JSON-serializable dictionary
        
        Args:
            processed_doc: The processed document
            
        Returns:
            Dictionary that can be serialized to JSON
        """
        def convert_dataclass(obj):
            """Convert dataclass to dict, handling nested objects"""
            if hasattr(obj, '__dataclass_fields__'):
                result = {}
                for field_name, field_value in asdict(obj).items():
                    if isinstance(field_value, datetime):
                        result[field_name] = field_value.isoformat()
                    elif isinstance(field_value, Path):
                        result[field_name] = str(field_value)
                    elif isinstance(field_value, Enum):
                        result[field_name] = field_value.value
                    else:
                        result[field_name] = field_value
                return result
            return obj
        
        # Convert the entire document
        doc_dict = {
            "metadata": {
                "standard_type": processed_doc.metadata.standard_type.value,
                "title": processed_doc.metadata.title,
                "version": processed_doc.metadata.version,
                "total_pages": processed_doc.metadata.total_pages,
                "processing_date": processed_doc.metadata.processing_date.isoformat(),
                "file_path": str(processed_doc.metadata.file_path),
                "organizational_pattern": processed_doc.metadata.organizational_pattern,
                "extraction_challenges": processed_doc.metadata.extraction_challenges
            },
            "sections": [],
            "table_of_contents": [],
            "processing_stats": processed_doc.processing_stats
        }
        
        # Convert sections
        for section in processed_doc.sections:
            section_dict = {
                "metadata": {
                    "section_id": section.metadata.section_id,
                    "title": section.metadata.title,
                    "level": section.metadata.level,
                    "section_type": section.metadata.section_type.value,
                    "page_start": section.metadata.page_start,
                    "page_end": section.metadata.page_end,
                    "parent_section_id": section.metadata.parent_section_id,
                    "cross_references": section.metadata.cross_references
                },
                "content": section.content,
                "raw_content": section.raw_content,
                "tables": section.tables,
                "figures": section.figures,
                "quality_score": section.quality_score
            }
            doc_dict["sections"].append(section_dict)
        
        # Convert table of contents
        for toc_item in processed_doc.table_of_contents:
            toc_dict = {
                "section_id": toc_item.section_id,
                "title": toc_item.title,
                "level": toc_item.level,
                "section_type": toc_item.section_type.value,
                "page_start": toc_item.page_start,
                "page_end": toc_item.page_end,
                "parent_section_id": toc_item.parent_section_id,
                "cross_references": toc_item.cross_references
            }
            doc_dict["table_of_contents"].append(toc_dict)
        
        return doc_dict
    
    def save_sections_separately(self, processed_doc: ProcessedDocument, output_dir: Path = None) -> List[Path]:
        """
        Save each section as a separate JSON file for easier processing
        
        Args:
            processed_doc: The processed document
            output_dir: Directory to save sections (defaults to 'data/sections')
            
        Returns:
            List of paths to saved section files
        """
        if output_dir is None:
            output_dir = Path("data/sections")
        
        # Create subdirectory for this document
        doc_dir = output_dir / processed_doc.metadata.standard_type.value.lower()
        doc_dir.mkdir(parents=True, exist_ok=True)
        
        saved_files = []
        
        for section in processed_doc.sections:
            # Skip low-quality sections
            if section.quality_score < 0.3:
                continue
            
            # Generate filename
            clean_title = re.sub(r'[^\w\s-]', '', section.metadata.title)[:50]
            clean_title = re.sub(r'\s+', '_', clean_title)
            filename = f"{section.metadata.section_id}_{clean_title}.json"
            filepath = doc_dir / filename
            
            # Create section data
            section_data = {
                "document_metadata": {
                    "standard_type": processed_doc.metadata.standard_type.value,
                    "title": processed_doc.metadata.title,
                    "version": processed_doc.metadata.version,
                    "file_path": str(processed_doc.metadata.file_path)
                },
                "section": {
                    "metadata": {
                        "section_id": section.metadata.section_id,
                        "title": section.metadata.title,
                        "level": section.metadata.level,
                        "section_type": section.metadata.section_type.value,
                        "cross_references": section.metadata.cross_references
                    },
                    "content": section.content,
                    "tables": section.tables,
                    "figures": section.figures,
                    "quality_score": section.quality_score
                }
            }
            
            # Save section
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(section_data, f, indent=2, ensure_ascii=False)
            
            saved_files.append(filepath)
        
        self.console.print(f"[bold green]📁 Saved {len(saved_files)} high-quality sections to:[/bold green] {doc_dir}")
        return saved_files


def process_all_documents():
    """Process all PDF documents in the raw data directory"""
    processor = StandardsProcessor(enable_tables=True, enable_ocr=False, use_gpu=True)
    
    raw_data_dir = Path("data/raw")
    if not raw_data_dir.exists():
        print(f"Raw data directory not found: {raw_data_dir}")
        return
    
    pdf_files = list(raw_data_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in {raw_data_dir}")
        return
    
    processor.console.print(f"[bold blue]🔍 Found {len(pdf_files)} PDF files to process[/bold blue]")
    
    results = {}
    
    for pdf_file in pdf_files:
        try:
            processor.console.print(f"\n[bold cyan]Processing: {pdf_file.name}[/bold cyan]")
            result = processor.process_document(pdf_file)
            
            # Save results
            json_path = processor.save_processed_document(result)
            section_files = processor.save_sections_separately(result)
            
            results[pdf_file.name] = {
                "status": "success",
                "json_path": json_path,
                "section_count": len(section_files),
                "total_sections": result.processing_stats['total_sections'],
                "valid_sections": result.processing_stats['valid_sections'],
                "success_rate": result.processing_stats['processing_success_rate']
            }
            
        except Exception as e:
            processor.console.print(f"[bold red]❌ Error processing {pdf_file.name}: {str(e)}[/bold red]")
            results[pdf_file.name] = {
                "status": "failed",
                "error": str(e)
            }
    
    # Print final summary
    processor.console.print(f"\n[bold green]🎉 Processing Complete![/bold green]")
    successful = sum(1 for r in results.values() if r["status"] == "success")
    failed = len(results) - successful
    
    processor.console.print(f"[cyan]Successful:[/cyan] {successful}/{len(results)} documents")
    processor.console.print(f"[cyan]Failed:[/cyan] {failed}/{len(results)} documents")
    
    if successful > 0:
        total_sections = sum(r.get("total_sections", 0) for r in results.values() if r["status"] == "success")
        valid_sections = sum(r.get("valid_sections", 0) for r in results.values() if r["status"] == "success")
        processor.console.print(f"[cyan]Total sections extracted:[/cyan] {valid_sections}/{total_sections}")
    
    return results


def main():
    """Main function with options for processing"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        # Process all documents
        process_all_documents()
    else:
        # Process single test document
        print("🔧 Processing single test document (use --all to process all documents)")
        
        # Try GPU first, fallback to CPU if issues
        try:
            processor = StandardsProcessor(enable_tables=True, enable_ocr=False, use_gpu=True)
        except Exception as e:
            print(f"GPU initialization failed: {e}")
            print("Falling back to CPU processing...")
            processor = StandardsProcessor(enable_tables=True, enable_ocr=False, use_gpu=False)
        
        # Test with one document
        test_file = Path("data/raw/iso21500.pdf")  # Smallest document for testing
        if test_file.exists():
            result = processor.process_document(test_file)
            print(f"\nProcessed {len(result.sections)} sections from {test_file.name}")
            
            # Save complete document as JSON
            json_path = processor.save_processed_document(result)
            
            # Save individual sections for easier access
            section_files = processor.save_sections_separately(result)
            
            # Display summary
            print(f"\n📊 Processing Summary:")
            print(f"   • Complete document saved: {json_path}")
            print(f"   • Individual sections saved: {len(section_files)} files")
            print(f"   • High-quality sections: {result.processing_stats['valid_sections']}/{result.processing_stats['total_sections']}")
            
        else:
            print(f"Test file {test_file} not found")

if __name__ == "__main__":
    main()