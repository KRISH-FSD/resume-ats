# ats_system/text_utils.py — Text cleaning & normalization

import re

try:
    import spacy
except Exception:
    spacy = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:
    TfidfVectorizer = None
    cosine_similarity = None

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm") if spacy else None
except Exception:
    nlp = None


# ══════════════════════════════════════════════════════════════════
#  TEXT CLEANING
# ══════════════════════════════════════════════════════════════════

def clean_text(text):
    """Basic cleaning — lowercase + remove non-tech special chars."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s\.+#\-/]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_text_nlp(text):
    """NLP cleaning with spaCy — lemmatization + stopword removal."""
    if not text:
        return ""
    text = text.lower()
    if nlp is None:
        return clean_text(text)

    doc = nlp(text)
    tokens = [
        token.lemma_.strip()
        for token in doc
        if not token.is_stop and not token.is_punct and not token.is_space
        and len(token.lemma_.strip()) > 1
    ]
    return " ".join(tokens)


# ══════════════════════════════════════════════════════════════════
#  KEY PHRASE EXTRACTION
# ══════════════════════════════════════════════════════════════════

def extract_key_phrases(text):
    """Extract noun phrases from text using spaCy."""
    if not text or nlp is None:
        return []

    doc = nlp(text.lower())
    phrases = [
        chunk.text.strip()
        for chunk in doc.noun_chunks
        if len(chunk.text.strip()) > 2 and not all(t.is_stop for t in chunk)
    ]
    return list(set(phrases))


# ══════════════════════════════════════════════════════════════════
#  SKILL NORMALIZATION
# ══════════════════════════════════════════════════════════════════

SKILL_ALIASES = {
    "reactjs":              "react",
    "react.js":             "react",
    "html5":                "html",
    "css3":                 "css",
    "tailwind":             "tailwind css",
    "vuejs":                "vue",
    "vue.js":               "vue",
    "expressjs":            "express",
    "express.js":           "express",
    "nextjs":               "next.js",
    "nodejs":               "node.js",
    "node":                 "node.js",
    "restful":              "rest api",
    "apis":                 "api",
    "full-stack":           "full stack",
    "mern stack":           "mern",
    "golang":               "go",
    "k8s":                  "kubernetes",
    "postgres":             "postgresql",
    "mongo":                "mongodb",
    "tf":                   "tensorflow",
    "sklearn":              "scikit-learn",
    "gcloud":               "gcp",
    "google cloud":         "gcp",
    "amazon web services":  "aws",
    "microsoft azure":      "azure",
    "ci cd":                "ci/cd",
    "cicd":                 "ci/cd",
    "dotnet":               ".net",
    "asp.net":              ".net",
    "js":                   "javascript",
    "ts":                   "typescript",
    "py":                   "python",
    "c plus plus":          "c++",
    "cpp":                  "c++",
    "c sharp":              "c#",
}


def get_semantic_similarity(text1, text2):
    """Calculate semantic similarity with TF-IDF, falling back to token overlap."""
    if not text1 or not text2:
        return 0.0
    
    try:
        if TfidfVectorizer is not None and cosine_similarity is not None:
            vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
            vectors = vectorizer.fit_transform([text1, text2])
            similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
        else:
            similarity = _token_overlap_similarity(text1, text2)
        return round(similarity * 100, 2)
    except Exception as e:
        print(f"TF-IDF similarity unavailable, falling back to token overlap: {e}")
        return round(_token_overlap_similarity(text1, text2) * 100, 2)


def _token_overlap_similarity(text1, text2):
    """Pure-Python fallback used when sklearn/numpy are unavailable."""
    tokens1 = set(re.findall(r"[a-z0-9.+#/-]+", clean_text(text1)))
    tokens2 = set(re.findall(r"[a-z0-9.+#/-]+", clean_text(text2)))
    if not tokens1 or not tokens2:
        return 0.0
    return len(tokens1 & tokens2) / len(tokens1 | tokens2)



def normalize_skill(skill):
    """Normalize skill names for consistent matching."""
    return SKILL_ALIASES.get(skill.lower().strip(), skill.lower().strip())
