# ats_system/config.py — ATS scoring configuration & skill database


# ══════════════════════════════════════════════════════════════════
#  SKILLS DATABASE (100+ skills, categorized)
# ══════════════════════════════════════════════════════════════════

SKILLS_BY_CATEGORY = {
    "programming_languages": [
        "python", "java", "javascript", "typescript", "c", "c++", "c#",
        "go", "golang", "rust", "ruby", "php", "swift", "kotlin", "scala",
        "r", "matlab", "perl", "dart", "lua", "shell", "bash", "powershell",
        "objective-c", "assembly", "haskell", "elixir", "clojure",
    ],
    "web_frameworks": [
        "html", "css", "tailwind css", "bootstrap", "react", "reactjs", "angular", "vue", "vuejs", "svelte", "nextjs",
        "next.js", "nuxt", "gatsby", "django", "flask", "fastapi",
        "node", "node.js", "express", "expressjs", "spring", "spring boot", "rails",
        "ruby on rails", "laravel", "asp.net", ".net", "dotnet",
        "frontend", "backend", "full stack", "full-stack", "mern",
    ],
    "databases": [
        "sql", "mysql", "postgresql", "postgres", "mongodb", "redis",
        "elasticsearch", "dynamodb", "cassandra", "oracle", "sqlite",
        "mariadb", "firebase", "firestore", "couchdb", "neo4j",
        "graphql", "supabase", "prisma",
    ],
    "cloud_devops": [
        "aws", "azure", "gcp", "google cloud", "docker", "kubernetes",
        "k8s", "terraform", "ansible", "jenkins", "ci/cd", "cicd",
        "github actions", "gitlab ci", "circleci", "heroku", "vercel",
        "netlify", "nginx", "apache", "linux", "ubuntu", "serverless",
        "lambda", "cloudformation", "helm", "prometheus", "grafana",
    ],
    "data_ml": [
        "machine learning", "deep learning", "tensorflow", "pytorch",
        "keras", "scikit-learn", "sklearn", "pandas", "numpy", "scipy",
        "matplotlib", "seaborn", "nlp", "natural language processing",
        "computer vision", "opencv", "data science", "data analysis",
        "data engineering", "spark", "hadoop", "airflow", "tableau",
        "power bi", "etl", "data pipeline", "bigquery", "snowflake",
        "huggingface", "llm", "generative ai", "openai", "langchain",
    ],
    "tools_platforms": [
        "git", "github", "gitlab", "bitbucket", "jira", "confluence",
        "slack", "figma", "postman", "swagger", "api", "rest", "restful",
        "rest api", "apis", "graphql", "grpc", "websocket", "rabbitmq", "kafka", "celery",
        "redis", "memcached", "oauth", "jwt", "webpack", "vite",
        "npm", "yarn", "pip", "maven", "gradle",
    ],
    "mobile": [
        "react native", "flutter", "android", "ios", "swift",
        "kotlin", "xamarin", "ionic", "cordova", "expo",
    ],
    "soft_skills": [
        "leadership", "communication", "teamwork", "problem solving",
        "agile", "scrum", "kanban", "project management", "mentoring",
        "collaboration", "critical thinking", "time management",
        "presentation", "stakeholder management", "cross-functional",
    ],
}

# Flat list for backward compatibility
SKILLS_LIST = list({skill for cat in SKILLS_BY_CATEGORY.values() for skill in cat})


# ══════════════════════════════════════════════════════════════════
#  CATEGORY WEIGHTS (importance of each skill category)
# ══════════════════════════════════════════════════════════════════

CATEGORY_WEIGHTS = {
    "programming_languages": 20,
    "web_frameworks":        18,
    "databases":             12,
    "cloud_devops":          15,
    "data_ml":               12,
    "tools_platforms":       8,
    "mobile":                8,
    "soft_skills":           7,
}


# ══════════════════════════════════════════════════════════════════
#  ATS SCORE WEIGHTS (sum = 100)
# ══════════════════════════════════════════════════════════════════

SKILL_MATCH_WEIGHT   = 40   # Category-wise skill matching
SIMILARITY_WEIGHT    = 25   # Content similarity (fuzzy)
SECTION_BONUS_WEIGHT = 20   # Proper resume sections
FORMAT_QUALITY_WEIGHT = 15  # Formatting & structure
BASE_SCORE           = 0    # Weights already sum to 100


# ══════════════════════════════════════════════════════════════════
#  FIT SCORE WEIGHTS (sum = 100)
# ══════════════════════════════════════════════════════════════════

FIT_EXPERIENCE_WEIGHT    = 30
FIT_SKILLS_WEIGHT        = 55
FIT_EDUCATION_WEIGHT     = 10
FIT_CERTIFICATION_WEIGHT = 5


# ══════════════════════════════════════════════════════════════════
#  EXPERIENCE CONFIG
# ══════════════════════════════════════════════════════════════════

DEFAULT_JD_EXPERIENCE    = 2   # Default if JD doesn't specify
FRESHER_EXPERIENCE_BOOST = 1   # Assumed years for freshers


# ══════════════════════════════════════════════════════════════════
#  RECRUITER PENALTIES & BONUSES
# ══════════════════════════════════════════════════════════════════

STUDENT_PENALTY       = 15
NO_CLOUD_PENALTY      = 10
NO_LEADERSHIP_PENALTY = 8

LEADERSHIP_BONUS      = 10
OPEN_SOURCE_BONUS     = 8
CERTIFICATION_BONUS   = 12
DIVERSE_SKILLS_BONUS  = 5


# ══════════════════════════════════════════════════════════════════
#  ROLE LEVEL KEYWORDS
# ══════════════════════════════════════════════════════════════════

ROLE_KEYWORDS = {
    "intern":  ["intern", "internship", "trainee", "apprentice"],
    "fresher": ["fresher", "entry level", "entry-level", "graduate", "0 year"],
    "junior":  ["junior", "associate", "jr", "jr."],
    "mid":     ["mid-level", "mid level", "intermediate", "3+ years", "4+ years"],
    "senior":  ["senior", "sr", "sr.", "principal", "staff", "5+ years"],
    "lead":    ["lead", "architect", "director", "vp", "head of", "manager", "cto", "cio"],
}


# ══════════════════════════════════════════════════════════════════
#  SECTION HEADERS (for resume parsing)
# ══════════════════════════════════════════════════════════════════

SECTION_HEADERS = {
    "education": [
        "education", "academic", "academics", "qualification",
        "qualifications", "degree", "university", "college",
    ],
    "experience": [
        "experience", "work experience", "professional experience",
        "employment", "work history", "career history", "positions",
    ],
    "skills": [
        "skills", "technical skills", "technologies", "tech stack",
        "competencies", "core competencies", "proficiencies", "expertise",
    ],
    "projects": [
        "projects", "personal projects", "academic projects",
        "key projects", "notable projects", "portfolio",
    ],
    "certifications": [
        "certifications", "certificates", "professional certifications",
        "licenses", "credentials", "accreditations",
    ],
    "summary": [
        "summary", "profile", "about", "objective", "professional summary",
        "career objective", "about me", "introduction",
    ],
}


# ══════════════════════════════════════════════════════════════════
#  EDUCATION SCORING
# ══════════════════════════════════════════════════════════════════

EDUCATION_SCORES = {
    "phd":         100,
    "doctorate":   100,
    "master":      85,
    "mba":         85,
    "mtech":       85,
    "m.tech":      85,
    "ms":          85,
    "m.s":         85,
    "bachelor":    70,
    "btech":       70,
    "b.tech":      70,
    "be":          70,
    "b.e":         70,
    "bs":          70,
    "b.s":         70,
    "bca":         65,
    "bsc":         65,
    "diploma":     50,
    "associate":   45,
    "high school": 30,
    "hsc":         30,
}


# ══════════════════════════════════════════════════════════════════
#  FUZZY MATCH THRESHOLD
# ══════════════════════════════════════════════════════════════════

FUZZY_MATCH_THRESHOLD = 80
