import { clamp, slugId } from "@/lib/utils";
import { distance } from "fastest-levenshtein";
import nlp from "compromise";

export type ScoreKey =
  | "keywordMatch"
  | "semanticFit"
  | "parseability"
  | "experience"
  | "sectionCompleteness";

export type AnalysisInput = {
  resumeText: string;
  jobDescription: string;
  fileName?: string;
  extractedLinks?: string[];
};

export type AnalysisResult = {
  id: string;
  createdAt: string;
  fileName?: string;
  jdProvided: boolean;
  overallScore: number;
  disclaimer: string;
  weights: Record<ScoreKey, number>;
  scores: Record<ScoreKey, number>;
  labels: Record<ScoreKey, string>;
  matchedKeywords: string[];
  missingKeywords: string[];
  exactJdPhrasesMissing: string[];
  weakPhrases: string[];
  missingMetrics: string[];
  formattingIssues: Issue[];
  sectionFeedback: SectionFeedback[];
  checklist: ChecklistItem[];
  suggestedEdits: Suggestion[];
  atsWillLikelyMiss: string[];
  seniority: {
    resumeLevel: "student" | "junior" | "mid" | "senior";
    roleLevel: "student" | "junior" | "mid" | "senior";
    warning?: string;
  };
  keywordCoverage: {
    total: number;
    matched: number;
    missing: number;
    percent: number;
  };
  contactSignals: ContactSignals;
  bulletImprovements: BulletImprovement[];
  marketFeedback?: string;
};

type Issue = {
  label: string;
  severity: "low" | "medium" | "high";
  evidence: string;
};

type SectionFeedback = {
  section: string;
  status: "strong" | "present" | "missing" | "weak";
  feedback: string;
};

type ChecklistItem = {
  label: string;
  passed: boolean;
  detail: string;
};

type Suggestion = {
  impact: "High" | "Medium" | "Low";
  title: string;
  detail: string;
};

type BulletImprovement = {
  original: string;
  improved: string;
  reason: string;
};

type ContactSignals = {
  emails: string[];
  phones: string[];
  urls: string[];
  linkedin: string[];
  github: string[];
  portfolio: string[];
  warnings: string[];
};

const weights: Record<ScoreKey, number> = {
  keywordMatch: 0.3,
  semanticFit: 0.25,
  parseability: 0.2,
  experience: 0.15,
  sectionCompleteness: 0.1,
};

const labels: Record<ScoreKey, string> = {
  keywordMatch: "Keyword alignment",
  semanticFit: "Semantic role fit",
  parseability: "ATS readability",
  experience: "Experience relevance",
  sectionCompleteness: "Section completeness",
};

const sectionAliases: Record<string, RegExp> = {
  Summary: /\b(summary|profile|objective|about)\b/i,
  Experience: /\b(experience|work history|employment|internship)\b/i,
  Education: /\b(education|academic)\b/i,
  Skills: /\b(skills|technical skills|core skills|tools)\b/i,
  Projects: /\b(projects|portfolio)\b/i,
  Certifications: /\b(certifications|certificates|licenses)\b/i,
};

const stopWords = new Set([
  "and",
  "the",
  "for",
  "with",
  "you",
  "our",
  "are",
  "will",
  "from",
  "that",
  "this",
  "have",
  "has",
  "into",
  "using",
  "such",
  "across",
  "their",
  "your",
  "role",
  "team",
  "teams",
  "work",
  "skills",
  "experience",
  "requirements",
  "responsibilities",
]);

const actionVerbs = [
  "built",
  "created",
  "designed",
  "led",
  "launched",
  "owned",
  "improved",
  "reduced",
  "increased",
  "analyzed",
  "automated",
  "implemented",
  "optimized",
  "partnered",
  "delivered",
  "developed",
  "managed",
  "presented",
  "defined",
];

const weakPhrasePatterns = [
  /\bresponsible for\b/gi,
  /\bworked on\b/gi,
  /\bhelped with\b/gi,
  /\bfamiliar with\b/gi,
  /\bteam player\b/gi,
  /\bhard worker\b/gi,
  /\bvarious tasks\b/gi,
];

const skillDictionary = [
  "sql", "python", "r", "tableau", "power bi", "looker", "excel", "react", "next.js", "node.js",
  "typescript", "javascript", "aws", "azure", "docker", "kubernetes", "machine learning",
  "a/b testing", "experimentation", "funnel analysis", "cohort analysis", "retention",
  "activation", "analytics", "dashboards", "stakeholder communication", "b2b saas",
  "churn analysis", "product metrics", "event data", "api", "crm", "salesforce", "figma", "agile",
  "flask", "fastapi", "django", "spring boot", "express", "ruby on rails", "rest", "graphql", "grpc",
  "git", "github", "gitlab", "bitbucket", "ci/cd", "jenkins", "github actions", "circleci",
  "k8s", "terraform", "ansible", "gcp", "google cloud", "linux", "unix", "bash", "shell",
  "llm", "langchain", "openai", "rag", "retrieval augmented generation", "fine-tuning", "nlp", "computer vision", 
  "generative ai", "agentic", "data structures", "algorithms", "caching", "redis", "memcached", "kafka", "rabbitmq", 
  "system design", "microservices", "serverless", "debugging", "troubleshooting",
  "postgresql", "mysql", "mongodb", "nosql", "dynamodb", "elasticsearch", "cassandra", "redis",
  "java", "c++", "c#", "go", "golang", "rust", "ruby", "php", "swift", "kotlin", "scala",
  "vue", "angular", "svelte", "html", "css", "tailwind", "sass", "bootstrap", "material ui",
  "scrum", "kanban", "jira", "confluence", "product management", "project management",
  "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "hadoop", "spark", "snowflake", "databricks", "airflow",
  "concurrency", "multithreading", "oop", "object oriented programming", "functional programming",
  "testing", "jest", "cypress", "selenium", "pytest", "mocha", "junit", "tdd", "bdd"
];

const synonymMap: Record<string, string[]> = {
  "ab testing": ["a/b testing", "a b testing", "split testing", "experiment design"],
  "power bi": ["powerbi"],
  "next.js": ["nextjs"],
  "node.js": ["nodejs"],
  "b2b saas": ["b2b", "saas"],
  "stakeholder communication": ["stakeholder management", "executive communication", "cross functional"],
};

let pipelineInstance: any = null;

async function getPipeline() {
  if (!pipelineInstance) {
    const { pipeline, env } = await import("@xenova/transformers");
    env.allowLocalModels = false; // Fetch from huggingface
    pipelineInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return pipelineInstance;
}

export async function analyzeResume(input: AnalysisInput): Promise<AnalysisResult> {
  const resumeText = normalize(input.resumeText);
  const jdText = normalize(input.jobDescription);
  const resumeLower = resumeText.toLowerCase();
  const jdLower = jdText.toLowerCase();
  const jdProvided = jdText.trim().length >= 250;
  const jdKeywords = jdProvided ? extractKeywords(jdText) : [];
  const keywordMatch = jdProvided ? matchKeywords(resumeText, jdKeywords) : { matched: [], missing: [] };
  const matchedKeywords = keywordMatch.matched;
  const missingKeywords = keywordMatch.missing;
  const formattingIssues = detectFormattingIssues(input.resumeText);
  const sections = detectSections(input.resumeText);
  const bullets = extractBullets(input.resumeText);
  const weakPhrases = detectWeakPhrases(input.resumeText);
  const metricsBullets = bullets.filter((bullet) => /(\d+%|\$\d+|\b\d+x\b|\b\d+\+|\b\d{2,}\b)/i.test(bullet));
  const actionVerbBullets = bullets.filter((bullet) =>
    actionVerbs.some((verb) => bullet.trim().toLowerCase().startsWith(verb)),
  );
  const missingMetrics = bullets
    .filter((bullet) => bullet.length > 38 && !/(\d+%|\$\d+|\b\d+x\b|\b\d+\+|\b\d{2,}\b)/i.test(bullet))
    .slice(0, 6);
  const exactJdPhrasesMissing = jdProvided
    ? extractRequirementPhrases(input.jobDescription).filter((phrase) => !includesNormalized(resumeText, phrase))
    : [];
  const contactSignals = extractContactSignals(input.resumeText, input.extractedLinks);

  const keywordScore = jdKeywords.length ? Math.round((matchedKeywords.length / jdKeywords.length) * 100) : 0;
  const semanticScore = jdProvided ? await calculateSemanticScore(jdLower, resumeLower) : 0;
  const parseabilityScore = formattingIssues.length > 0
    ? clamp(96 - formattingIssues.reduce((total, issue) => total + (issue.severity === "high" ? 25 : issue.severity === "medium" ? 15 : 5), 0))
    : 96;

  const hasExperience = sections.some(s => s.section === "Experience" && s.status !== "missing");
  const experienceScore = calculateExperienceScore(input.resumeText, input.jobDescription, bullets, metricsBullets, hasExperience);
  const sectionCompletenessScore = Math.round((sections.filter((section) => section.status !== "missing").length / sections.length) * 100);

  const rawScores: Record<ScoreKey, number> = {
    keywordMatch: keywordScore,
    semanticFit: semanticScore,
    parseability: parseabilityScore,
    experience: experienceScore,
    sectionCompleteness: sectionCompletenessScore,
  };

  const activeWeights = normalizeWeights(jdProvided);
  const scores = rawScores;
  const overallScore = Math.round(
    (Object.keys(activeWeights) as ScoreKey[]).reduce((total, key) => total + scores[key] * activeWeights[key], 0),
  );
  const seniority = detectSeniority(input.resumeText, input.jobDescription);

  return {
    id: slugId(),
    createdAt: new Date().toISOString(),
    fileName: input.fileName,
    jdProvided,
    overallScore,
    disclaimer:
      "This is an estimated ATS compatibility analysis based on transparent rules. It is not a universal or company-specific ATS score.",
    weights: activeWeights,
    scores,
    labels,
    matchedKeywords: matchedKeywords.slice(0, 30),
    missingKeywords: missingKeywords.slice(0, 30),
    exactJdPhrasesMissing: exactJdPhrasesMissing.slice(0, 8),
    weakPhrases,
    missingMetrics,
    formattingIssues,
    sectionFeedback: sections,
    checklist: buildChecklist(sections, bullets, metricsBullets, actionVerbBullets, formattingIssues, matchedKeywords, missingKeywords),
    suggestedEdits: buildSuggestions(missingKeywords, missingMetrics, weakPhrases, formattingIssues, sections, seniority.warning),
    atsWillLikelyMiss: buildMissWarnings(input.resumeText, sections, formattingIssues, missingKeywords, contactSignals),
    seniority,
    keywordCoverage: {
      total: jdKeywords.length,
      matched: matchedKeywords.length,
      missing: missingKeywords.length,
      percent: keywordScore,
    },
    contactSignals,
    bulletImprovements: buildBulletImprovements(missingMetrics, matchedKeywords),
  };
}

function normalize(text: string) {
  return text.replace(/\r/g, "\n").replace(/\s+/g, " ").trim();
}

function extractKeywords(text: string) {
  const lower = text.toLowerCase();
  
  // Enterprise ATS systems extract entities via a strict domain dictionary, 
  // not broad n-gram regex parsing.
  const skills = skillDictionary.filter((skill) => {
    const escaped = escapeRegex(skill);
    let pattern = escaped;
    if (/^[a-z0-9_]/i.test(skill)) {
      pattern = '\\b' + pattern;
    }
    if (/[a-z0-9_]$/i.test(skill)) {
      pattern = pattern + '\\b';
    }
    return new RegExp(pattern, 'i').test(text);
  });

  // Dynamically extract acronyms using NLP (often missed in static dictionaries)
  const doc = nlp(text);
  const acronyms = (doc.match('#Acronym').out('array') as string[])
    .map(a => a.toLowerCase().replace(/[^a-z0-9+#.]+/g, ''))
    .filter(a => a.length >= 2 && !stopWords.has(a));

  return Array.from(new Set([...skills, ...acronyms])).slice(0, 40);
}

function detectSections(text: string): SectionFeedback[] {
  // Since file-extraction.ts now accurately renders newlines from PDFs,
  // we can safely prevent conversational false-positives by ensuring 
  // section headings appear on short lines (under 60 chars).
  const lines = text.split("\n").map(l => l.trim().toLowerCase()).filter(Boolean);
  return Object.entries(sectionAliases).map(([section, pattern]) => {
    const present = lines.some((line) => line.length < 60 && pattern.test(line));
    if (!present) {
      return {
        section,
        status: section === "Certifications" || section === "Projects" ? "weak" : "missing",
        feedback:
          section === "Certifications" || section === "Projects"
            ? `${section} is optional, but adding it can provide extra matching signals when relevant.`
            : `${section} is missing or not clearly labeled. ATS parsers and recruiters expect this section.`,
      } satisfies SectionFeedback;
    }

    return {
      section,
      status: section === "Experience" || section === "Skills" ? "strong" : "present",
      feedback: `${section} is clearly labeled and should be easy for a parser to locate.`,
    };
  });
}

function extractBullets(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*•]|^\d+\./.test(line))
    .map((line) => line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, ""))
    .filter(Boolean);
}

function detectWeakPhrases(text: string) {
  return Array.from(
    new Set(weakPhrasePatterns.flatMap((pattern) => text.match(pattern) ?? []).map((phrase) => phrase.toLowerCase())),
  );
}

function detectFormattingIssues(text: string): Issue[] {
  const issues: Issue[] = [];
  const unusualSymbols = text.match(/[▣◆◇■□●○★☆✓✔→⇒]/g);

  if (/\|.+\|.+\|/.test(text)) {
    issues.push({ label: "Table-like layout", severity: "high", evidence: "Multiple pipe-separated columns detected." });
  }
  if (/\t{2,}/.test(text) || /\s{8,}\S+\s{8,}/.test(text)) {
    issues.push({ label: "Possible multi-column spacing", severity: "medium", evidence: "Large spacing blocks can scramble parser reading order." });
  }
  if (/\b(text box|textbox)\b/i.test(text)) {
    issues.push({ label: "Non-text elements mentioned", severity: "medium", evidence: "Images, icons, and text boxes are often ignored by ATS parsers." });
  }
  if (unusualSymbols && unusualSymbols.length > 4) {
    issues.push({ label: "Decorative symbols", severity: "medium", evidence: `${unusualSymbols.length} unusual symbols detected.` });
  }
  if ((text.match(/[^\x00-\x7F]/g) ?? []).length > 30) {
    issues.push({ label: "Heavy non-standard characters", severity: "low", evidence: "Many non-ASCII characters can reduce parser reliability." });
  }
  if (text.length < 900) {
    issues.push({ label: "Thin resume content", severity: "medium", evidence: "The resume is short enough that key context may be missing." });
  }

  return issues;
}

function extractRequirementPhrases(text: string) {
  return Array.from(
    new Set(
      text
        .split(/\n|\.|;/)
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter((line) => /(experience|strong|required|familiar|ability|skills|sql|python|years|responsible|own|build|design|analyze)/i.test(line))
        .filter((line) => line.split(" ").length >= 4 && line.length < 140),
    ),
  );
}

async function calculateSemanticScore(jdLower: string, resumeLower: string) {
  try {
    const extractor = await getPipeline();
    // Use first 2000 chars to avoid exceeding model token limits while keeping it fast
    const jdOutput = await extractor(jdLower.slice(0, 2000), { pooling: 'mean', normalize: true });
    const resumeOutput = await extractor(resumeLower.slice(0, 2000), { pooling: 'mean', normalize: true });
    
    // Cosine similarity of normalized vectors is the dot product
    let dot = 0;
    for (let i = 0; i < jdOutput.data.length; i++) {
      dot += jdOutput.data[i] * resumeOutput.data[i];
    }
    
    // Convert to percentage score
    return clamp(Math.round(dot * 100));
  } catch (error) {
    // Fallback to basic bag-of-words if model fails to load or environment lacks support
    const jdTokens = bagOfWords(jdLower);
    const resumeTokens = bagOfWords(resumeLower);
    const similarity = cosineSimilarity(jdTokens, resumeTokens);
    return clamp(Math.round(similarity * 100));
  }
}

function calculateExperienceScore(resume: string, jd: string, bullets: string[], metricsBullets: string[], hasExperience: boolean) {
  if (!hasExperience) return 0; // True penalty: if the Experience section is completely missing, the score zeroes out.

  const resumeYears = calculateResumeYears(resume);
  const jdYears = calculateJDYears(jd);
  
  let yearsScore = 0;
  if (jdYears === 0) {
    yearsScore = clamp(resumeYears * 20); // 0 years yields 0, 5+ yields 100.
  } else if (resumeYears >= jdYears) {
    yearsScore = 100;
  } else {
    yearsScore = clamp(Math.round((resumeYears / jdYears) * 100)); // True linear decay.
  }

  // A competitive resume needs robust impact statements (bullets) + quantifiable results (metrics)
  const bulletScore = clamp((bullets.length * 4) + (metricsBullets.length * 10)); 
  return Math.round(yearsScore * 0.40 + bulletScore * 0.60);
}

function normalizeWeights(jdProvided: boolean): Record<ScoreKey, number> {
  if (jdProvided) return weights;
  // Without a JD, keywordMatch + semanticFit aren't meaningful. Redistribute weight transparently.
  const withoutJd: Record<ScoreKey, number> = {
    keywordMatch: 0,
    semanticFit: 0,
    parseability: weights.parseability,
    experience: weights.experience,
    sectionCompleteness: weights.sectionCompleteness,
  };
  const sum = (Object.keys(withoutJd) as ScoreKey[]).reduce((t, k) => t + withoutJd[k], 0) || 1;
  (Object.keys(withoutJd) as ScoreKey[]).forEach((k) => {
    withoutJd[k] = Number((withoutJd[k] / sum).toFixed(4));
  });
  return withoutJd;
}

function matchKeywords(resumeText: string, jdKeywords: string[]) {
  const matched: string[] = [];
  const missing: string[] = [];
  for (const keyword of jdKeywords) {
    if (includesWithSynonyms(resumeText, keyword)) matched.push(keyword);
    else missing.push(keyword);
  }
  return { matched, missing };
}

function includesWithSynonyms(haystack: string, keyword: string) {
  if (includesNormalized(haystack, keyword)) return true;
  const normalizedKey = normalizeForMatch(keyword);
  const variants = synonymMap[normalizedKey];
  if (!variants) return false;
  return variants.some((variant) => includesNormalized(haystack, variant));
}

function includesNormalized(haystack: string, needle: string) {
  const a = normalizeForMatch(haystack);
  const b = normalizeForMatch(needle);
  if (!b) return false;
  
  // Exact match logic
  if (!b.includes(" ")) {
    let pattern = escapeRegex(b);
    if (/^[a-z0-9_]/i.test(b)) {
      pattern = '\\b' + pattern;
    }
    if (/[a-z0-9_]$/i.test(b)) {
      pattern = pattern + '\\b';
    }
    if (new RegExp(pattern, "i").test(a)) return true;
  } else {
    if (a.includes(b)) return true;
  }

  // Fuzzy match logic (catch typos and formatting differences)
  const haystackTokens = a.split(" ");
  const needleTokens = b.split(" ");
  
  if (needleTokens.length === 1) {
    for (const token of haystackTokens) {
      if (token === b + "s") return true; // handle simple pluralization like 'llms'
      
      if (Math.abs(token.length - b.length) <= 2) {
        // Allow distance of 1 for shorter words (>= 4 chars), distance of 2 for longer words
        const maxDist = b.length > 5 ? 2 : (b.length >= 4 ? 1 : 0);
        if (maxDist > 0 && distance(token, b) <= maxDist) {
          return true;
        }
      }
    }
  }

  return false;
}

function normalizeForMatch(text: string) {
  const lower = text.toLowerCase();
  return lower
    .replace(/[’']/g, "")
    .replace(/a\s*\/\s*b/g, "ab")
    .replace(/[^a-z0-9+#. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bagOfWords(text: string) {
  const tokens = normalizeForMatch(text)
    .split(" ")
    .filter((token) => token.length >= 3)
    .filter((token) => !stopWords.has(token));
  const map = new Map<string, number>();
  for (const token of tokens) map.set(token, (map.get(token) ?? 0) + 1);
  return map;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const value of a.values()) magA += value * value;
  for (const value of b.values()) magB += value * value;
  for (const [key, valueA] of a.entries()) {
    const valueB = b.get(key);
    if (valueB) dot += valueA * valueB;
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function calculateResumeYears(text: string) {
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const regex = /(?:(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|0?[1-9]|1[0-2])[/\s,-]+)?((?:19|20)\d{2})\s*(?:-|–|to)\s*(?:(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|0?[1-9]|1[0-2])[/\s,-]+)?((?:19|20)\d{2}|present|current|now)/gi;
  
  const ranges = Array.from(text.matchAll(regex));
  const intervals: [number, number][] = [];
  
  for (const match of ranges) {
    const startMonthStr = match[1] ? match[1].toLowerCase() : "jan";
    const startYear = parseInt(match[2]);
    const endMonthStr = match[3] ? match[3].toLowerCase() : "dec";
    const endYearStr = match[4].toLowerCase();
    
    let startMonth = 0;
    if (!isNaN(parseInt(startMonthStr))) startMonth = parseInt(startMonthStr) - 1;
    else startMonth = monthNames.findIndex(m => startMonthStr.startsWith(m));
    if (startMonth === -1) startMonth = 0;

    const startAbsolute = startYear * 12 + startMonth;

    let endAbsolute = 0;
    if (endYearStr.includes("present") || endYearStr.includes("now") || endYearStr.includes("current")) {
      const now = new Date();
      endAbsolute = now.getFullYear() * 12 + now.getMonth();
    } else {
      const endYear = parseInt(endYearStr);
      let endMonth = 11;
      if (match[3]) {
        if (!isNaN(parseInt(endMonthStr))) endMonth = parseInt(endMonthStr) - 1;
        else endMonth = monthNames.findIndex(m => endMonthStr.startsWith(m));
        if (endMonth === -1) endMonth = 11;
      }
      endAbsolute = endYear * 12 + endMonth;
    }

    if (endAbsolute >= startAbsolute && startYear > 1950 && startYear <= new Date().getFullYear()) {
      intervals.push([startAbsolute, endAbsolute]);
    }
  }

  // Merge overlapping employment intervals to get true chronological tenure
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    if (merged.length === 0) {
      merged.push(interval);
    } else {
      const last = merged[merged.length - 1];
      if (interval[0] <= last[1] + 1) {
        last[1] = Math.max(last[1], interval[1]);
      } else {
        merged.push(interval);
      }
    }
  }

  const calculatedMonths = merged.reduce((acc, val) => acc + (val[1] - val[0]), 0);
  const calculatedYears = calculatedMonths / 12;

  const explicitYears = Array.from(text.matchAll(/(\d+)\+?\s*(?:years|yrs)\s*(?:of\s+)?(?:experience|work)/gi)).map((match) => Number(match[1]));
  const explicitMax = explicitYears.length ? Math.max(...explicitYears) : 0;

  return Math.max(calculatedYears, explicitMax);
}

function calculateJDYears(text: string) {
  const years = Array.from(text.matchAll(/(\d+)\+?\s*(?:years|yrs)/gi)).map((match) => Number(match[1]));
  return years.length ? Math.max(...years) : 0;
}

function detectSeniority(resume: string, jd: string): AnalysisResult["seniority"] {
  const classify = (text: string) => {
    const lower = text.toLowerCase();
    if (/\b(senior|principal|staff|director|vp|head of|7\+|8\+|10\+)\b/.test(lower)) return "senior";
    if (/\b(mid|3\+|4\+|5\+|6\+)\b/.test(lower)) return "mid";

    if (/\b(intern|internship|student|entry level|graduate)\b/.test(lower)) return "student";
    return "junior";
  };
  const resumeLevel = classify(resume);
  const roleLevel = classify(jd);
  const order = { student: 0, junior: 1, mid: 2, senior: 3 };
  const warning =
    order[resumeLevel] + 1 < order[roleLevel]
      ? `Seniority mismatch: the role reads ${roleLevel}, while the resume reads closer to ${resumeLevel}.`
      : undefined;

  return { resumeLevel, roleLevel, warning };
}

function buildChecklist(
  sections: SectionFeedback[],
  bullets: string[],
  metricsBullets: string[],
  actionVerbBullets: string[],
  formattingIssues: Issue[],
  matched: string[],
  missing: string[],
): ChecklistItem[] {
  return [
    {
      label: "Core sections are labeled",
      passed: sections.filter((section) => section.status === "missing").length === 0,
      detail: "Summary, Experience, Education, and Skills should be explicit headings.",
    },
    {
      label: "Bullets show measurable impact",
      passed: metricsBullets.length >= Math.max(2, Math.ceil(bullets.length * 0.35)),
      detail: `${metricsBullets.length} of ${bullets.length} detected bullets include numbers or measurable outcomes.`,
    },
    {
      label: "Bullets start with action verbs",
      passed: actionVerbBullets.length >= Math.max(2, Math.ceil(bullets.length * 0.45)),
      detail: "Strong resumes open bullets with direct ownership and action.",
    },
    {
      label: "Formatting is parser-safe",
      passed: !formattingIssues.some((issue) => issue.severity === "high"),
      detail: "Tables, text boxes, icons, and multi-column designs can break reading order.",
    },
    {
      label: "JD keywords are represented",
      passed: matched.length >= missing.length,
      detail: `${matched.length} matched signals and ${missing.length} missing signals were found.`,
    },
  ];
}

function buildSuggestions(
  missingKeywords: string[],
  missingMetrics: string[],
  weakPhrases: string[],
  formattingIssues: Issue[],
  sections: SectionFeedback[],
  seniorityWarning?: string,
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  if (missingKeywords.length) {
    suggestions.push({
      impact: "High",
      title: "Add exact JD language where it is truthful",
      detail: `Work in missing signals such as ${missingKeywords.slice(0, 6).join(", ")}. Do not keyword-stuff; attach each term to evidence.`,
    });
  }
  if (missingMetrics.length) {
    suggestions.push({
      impact: "High",
      title: "Quantify vague bullets",
      detail: "Several bullets describe activity without scale, frequency, business impact, or outcome. Add numbers wherever you can defend them.",
    });
  }
  if (formattingIssues.length) {
    suggestions.push({
      impact: "High",
      title: "Remove parser-hostile formatting",
      detail: "Use one column, standard headings, plain bullets, and selectable text. Avoid tables, images, icons, and text boxes.",
    });
  }
  if (sections.some((section) => section.status === "missing")) {
    suggestions.push({
      impact: "Medium",
      title: "Restore missing resume sections",
      detail: "ATS systems rely on predictable section labels. Missing labels reduce confidence even when the content exists elsewhere.",
    });
  }
  if (weakPhrases.length) {
    suggestions.push({
      impact: "Medium",
      title: "Replace weak phrases with ownership",
      detail: `Rewrite phrases like ${weakPhrases.slice(0, 4).join(", ")} into action, scope, and result statements.`,
    });
  }
  if (seniorityWarning) {
    suggestions.push({ impact: "Medium", title: "Address the seniority gap directly", detail: seniorityWarning });
  }
  suggestions.push({
    impact: "Low",
    title: "Mirror the role title in your summary",
    detail: "If accurate, use the target role language in the first 2 lines so recruiters and parsers see fit quickly.",
  });
  return suggestions.slice(0, 7);
}

function buildMissWarnings(
  text: string,
  sections: SectionFeedback[],
  formattingIssues: Issue[],
  missingKeywords: string[],
  contactSignals: ContactSignals,
) {
  const warnings = [];
  if (formattingIssues.length) warnings.push("Content placed in tables, icons, images, or text boxes may be skipped or read out of order.");
  if (sections.some((section) => section.status === "missing")) warnings.push("Missing standard headings can make relevant content harder to classify.");
  if (missingKeywords.length) warnings.push(`The JD explicitly asks for signals not found in the resume, including ${missingKeywords.slice(0, 5).join(", ")}.`);
  if (contactSignals.warnings.length) warnings.push(...contactSignals.warnings);
  if (!/@|linkedin|github|portfolio/i.test(text)) warnings.push("Contact or portfolio signals may be incomplete or hard to verify.");
  return warnings.length ? warnings : ["No severe parser blind spots were detected from the provided text."];
}

function extractContactSignals(text: string, extraLinks: string[] | undefined): ContactSignals {
  const urls = unique(text.match(/\bhttps?:\/\/[^\s)]+|\b(?:www\.)[^\s)]+/gi) ?? []);
  const emails = unique(text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) ?? []);
  const phones = unique(
    text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}\b/g) ?? [],
  );
  const bareProfileLinks = unique(
    text.match(/\b(?:linkedin\.com\/in\/[^\s)]+|github\.com\/[^\s)]+|behance\.net\/[^\s)]+|dribbble\.com\/[^\s)]+)\b/gi) ?? [],
  );
  const allUrls = uniqueLinks([...(extraLinks ?? []), ...urls, ...bareProfileLinks]);
  const linkedin = allUrls.filter((url) => /linkedin\.com/i.test(url));
  const github = allUrls.filter((url) => /github\.com/i.test(url));
  const portfolio = allUrls.filter((url) => !/linkedin\.com|github\.com/i.test(url));
  const warnings = [];

  if (!emails.length) warnings.push("No email address was detected in the extracted resume text.");
  if (!phones.length) warnings.push("No phone number was detected in the extracted resume text.");
  if (!allUrls.length) warnings.push("No resume links were detected. If links are embedded behind icons or images, parsers may miss them.");
  if (allUrls.some((url) => !/^https?:\/\//i.test(url))) {
    warnings.push("Some links are missing an explicit http/https prefix. Plain profile text may be less reliable after parsing.");
  }

  return {
    emails,
    phones,
    urls: allUrls,
    linkedin,
    github,
    portfolio,
    warnings,
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.replace(/[.,;:]+$/, "").trim()).filter(Boolean)));
}

function uniqueLinks(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.replace(/[.,;:]+$/, "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildBulletImprovements(missingMetrics: string[], matchedKeywords: string[]): BulletImprovement[] {
  return missingMetrics.slice(0, 3).map((bullet) => {
    const keyword = matchedKeywords[0] ?? "target role";
    return {
      original: bullet,
      improved: `${capitalizeLead(bullet)} by adding scale, method, and outcome tied to ${keyword}; for example: "Improved ${keyword} workflow by X% through Y, reducing Z."`,
      reason: "ATS and recruiters reward concrete evidence. A stronger bullet names the action, scope, metric, and result.",
    };
  });
}

function capitalizeLead(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
