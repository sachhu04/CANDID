import { NextResponse } from "next/server";
import { analyzeResume } from "@/lib/analyzer";
import Groq from "groq-sdk";

// Cache to store previous AI evaluations to save quota during testing
const analysisCache = new Map<string, { feedback: string; penalty: number }>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

import { validateUrl, urlCache, URLStatus } from "@/lib/url-validation";

// Retry logic with exponential backoff for rate limits
async function generateContentWithRetry(ai: Groq, prompt: string, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const completion = await ai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });
      return { text: completion.choices[0]?.message?.content || "" };
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || "";
      const isRateLimit = error?.status === 429 || errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("too many requests");
      
      if (isRateLimit && attempt < retries - 1) {
        const delay = 2000 * Math.pow(2, attempt); // 2s, 4s...
        console.warn(`[Attempt ${attempt + 1}] Groq rate limited. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw error; // Throw if max retries exceeded or error is not a rate limit
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      resumeText?: string;
      jobDescription?: string;
      fileName?: string;
      extractedLinks?: string[];
    };

    if (!body.resumeText || body.resumeText.trim().length < 250) {
      return NextResponse.json({ message: "Resume text must include at least 250 characters." }, { status: 400 });
    }

    // JD is optional. If provided, require enough text to be meaningful.
    if (body.jobDescription && body.jobDescription.trim().length > 0 && body.jobDescription.trim().length < 250) {
      return NextResponse.json({ message: "If you include a job description, it must include at least 250 characters." }, { status: 400 });
    }

    const result = await analyzeResume({
      resumeText: body.resumeText,
      jobDescription: body.jobDescription ?? "",
      fileName: body.fileName,
      extractedLinks: body.extractedLinks,
    });

    // Validate extracted links using the cache/robust service
    const invalidLinks: string[] = [];
    if (body.extractedLinks && body.extractedLinks.length > 0) {
      // Run validation, which hits cache first
      const results = await Promise.all(body.extractedLinks.map(validateUrl));
      body.extractedLinks.forEach((link, index) => {
        // Only explicitly INVALID links are penalized. WAKING_UP, PENDING, UNKNOWN are given the benefit of the doubt.
        if (results[index] === 'INVALID') invalidLinks.push(link);
      });
    }

    if (process.env.GROQ_API_KEY) {
      try {
        const cacheKey = body.resumeText;
        let parsed;

        if (analysisCache.has(cacheKey)) {
          parsed = analysisCache.get(cacheKey);
          console.log("Using cached AI response to save quota.");
        } else {
          const ai = new Groq({ apiKey: process.env.GROQ_API_KEY });
          const prompt = `You are a balanced, pragmatic Technical Recruiter and Engineering Lead evaluating candidates for the current tech job market. 
Review the following candidate's resume text, focusing heavily on the "Projects" and "Experience" sections.
Your goal is to provide a realistic, fair assessment. Weigh the actual content of their resume against modern industry expectations. Do they demonstrate real problem-solving, scale, or business impact, or are they leaning on basic tutorials? We want a true human recruiter's perspective—neither overly harsh nor artificially lenient.

Return your evaluation strictly in JSON format.

You MUST return a JSON object with exactly two keys:
1. "feedback": A 2-3 sentence balanced evaluation. Acknowledge the concrete skills and efforts they show, but be completely honest about where they fall short of current competitive market standards (e.g., missing deployments, testing, or system architecture).
2. "penalty": An integer between 0 and 25. Apply 0-5 for strong, unique projects with clear impact. Apply 6-12 for standard or slightly generic projects that show decent effort but lack depth. Apply 13-20 for very basic tutorials or shallow experience. Apply 21-25 only if the sections are essentially missing or irrelevant.

Respond ONLY with the JSON object. Do not include any conversational text.

Resume text:
${body.resumeText}`;
          const aiResponse = await generateContentWithRetry(ai, prompt, 3);
          
          // Extract just the JSON object from the response string to avoid parsing errors
          let rawText = aiResponse?.text || "{}";
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            rawText = jsonMatch[0];
          }
          parsed = JSON.parse(rawText);
          
          // Save successful response to cache
          analysisCache.set(cacheKey, { feedback: parsed.feedback, penalty: parsed.penalty });
        }
        
        result.marketFeedback = parsed.feedback || "Projects appear competitive.";
        const penalty = Number(parsed.penalty) || 0;
        
        if (penalty > 0) {
          result.overallScore = Math.max(0, result.overallScore - penalty);
          result.marketFeedback += ` (Score penalized by -${penalty} points due to lack of project scale/impact).`;
        }
      } catch (error) {
        console.error("Groq AI API Error:", error);
        // Fallback Heuristic Penalty if Groq is down or Quota Exceeded
        const enterpriseKeywords = [
          "rps", "concurrent", "microservices", "latency", "optimization", "ci/cd", 
          "pipeline", "distributed", "aws", "gcp", "azure", "docker", "kubernetes", 
          "scale", "thousands", "millions", "kafka", "redis", "caching", "load balancing",
          "high availability", "sla", "throughput", "concurrency", "graphql", "serverless",
          "terraform", "ansible", "jenkins", "github actions", "datadog", "prometheus",
          "grafana", "observability", "fault tolerance", "event-driven", "grpc"
        ];
        const lowerResume = body.resumeText.toLowerCase();
        let matchedKeywords = 0;
        enterpriseKeywords.forEach(keyword => {
          if (lowerResume.includes(keyword)) matchedKeywords++;
        });
        
        if (matchedKeywords < 2) {
          result.overallScore = Math.max(0, result.overallScore - 15);
          result.marketFeedback = "AI Quota Exceeded. Local Heuristic Analyzer activated: We detected fewer than 2 enterprise-scale signals (e.g., microservices, CI/CD, caching, AWS/GCP). Your projects appear to be standard, unoriginal tutorials lacking real-world complexity. (Score penalized by -15 points).";
        } else {
          result.marketFeedback = "AI Quota Exceeded. Local Heuristic Analyzer activated: We detected solid enterprise-scale keywords in your projects. No penalty applied.";
        }
      }
    }

    // Append link validation feedback at the very end
    if (invalidLinks.length > 0) {
      result.overallScore = Math.max(0, result.overallScore - 5);
      const linkMsg = `\n\n⚠️ Invalid Links Detected: ${invalidLinks.join(", ")}. Please provide valid links. (-5 points)`;
      result.marketFeedback = (result.marketFeedback || "") + linkMsg;
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Unable to analyze this input. Check the text and try again." }, { status: 500 });
  }
}
