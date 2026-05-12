# ats_system/resume_parser.py — Resume text extraction (PDF, DOCX, TXT)

import pdfplumber
import docx
import os


def extract_resume_text(file):
    """Extract text from resume files (PDF/DOCX/TXT).
    Returns: (text, metadata_dict)
    """
    filename = file.filename.lower()
    metadata = {
        "filename":           file.filename,
        "file_type":          "",
        "page_count":         0,
        "extraction_success": True,
        "error":              None,
    }

    try:
        if filename.endswith(".pdf"):
            metadata["file_type"] = "pdf"
            text, pages = _extract_pdf(file)
            metadata["page_count"] = pages
            return text, metadata

        elif filename.endswith(".docx"):
            metadata["file_type"] = "docx"
            text = _extract_docx(file)
            metadata["page_count"] = 1
            return text, metadata

        elif filename.endswith(".txt"):
            metadata["file_type"] = "txt"
            text = file.read().decode("utf-8", errors="ignore")
            metadata["page_count"] = 1
            return text, metadata

        else:
            metadata["extraction_success"] = False
            metadata["error"] = f"Unsupported file type: {os.path.splitext(filename)[1]}"
            return "", metadata

    except Exception as e:
        metadata["extraction_success"] = False
        metadata["error"] = str(e)
        return "", metadata


def _extract_pdf(file):
    """Extract text from PDF using pdfplumber."""
    text = ""
    with pdfplumber.open(file) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip(), page_count


def _extract_docx(file):
    """Extract text from DOCX using python-docx."""
    doc = docx.Document(file)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())