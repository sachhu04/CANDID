import { describe, it, expect } from "vitest";
import { analyzeResume } from "../analyzer";

describe("analyzeResume", () => {
  it("should detect basic formatting issues if short text", async () => {
    const result = await analyzeResume({
      resumeText: "Short resume with no sections.",
      jobDescription: "",
    });
    
    const hasThinResumeIssue = result.formattingIssues.some(
      (issue) => issue.label === "Thin resume content"
    );
    expect(hasThinResumeIssue).toBe(true);
  });

  it("should match keywords correctly, including fuzzy matching", async () => {
    const resumeText = `
      Experience
      Software Engineer
      Worked with Nextjs and nodejs. Built APIs.
    `;
    const jdText = `
      Required Skills:
      - Next.js
      - Node.js
      - React.js
      We are looking for a software engineer to join our rapidly growing team. You will be responsible for building scalable APIs, optimizing performance, and working closely with our designers. You should have strong experience in frontend and backend development. This role requires someone who is a team player and has a passion for writing clean, maintainable code. We value communication and problem-solving skills highly.
    `;
    
    const result = await analyzeResume({
      resumeText,
      jobDescription: jdText,
    });
    
    // Fuzzy matching should catch next.js and node.js, but fail on react.js
    expect(result.matchedKeywords).toContain("next.js");
    expect(result.matchedKeywords).toContain("node.js");
    expect(result.missingKeywords).toContain("react");
  });

  it("should dynamically extract acronyms via compromise", async () => {
    const resumeText = `
      Experience
      Software Engineer
      Deployed highly scalable applications on AWS and GCP using CI/CD pipelines.
      Used LLMs for AI features.
    `;
    const jdText = `
      Required Skills:
      - AWS
      - GCP
      - LLM
      - CI/CD
      We are looking for a cloud engineer to join our rapidly growing team. You will be responsible for building scalable cloud infrastructure, optimizing performance, and working closely with our data scientists. You should have strong experience in cloud computing and deployment pipelines. This role requires someone who is a team player and has a passion for automation. We value communication and problem-solving skills highly.
    `;

    const result = await analyzeResume({
      resumeText,
      jobDescription: jdText,
    });
    
    expect(result.matchedKeywords).toContain("aws");
    expect(result.matchedKeywords).toContain("gcp");
    expect(result.matchedKeywords).toContain("llm");
  });

  it("should match special characters and avoid false positives on substrings", async () => {
    const resumeText = `
      Experience
      Software Engineer
      Highly scalable systems in C++ and Java.
    `;
    const jdText = `
      Required Skills:
      - C++
      - Scala
      We are looking for a software engineer with deep expertise in system programming and backend systems. You will be responsible for designing and implementing high-throughput systems, optimizing memory usage, and debugging complex distributed systems. Strong communication and collaboration skills are required.
    `;
    const result = await analyzeResume({
      resumeText,
      jobDescription: jdText,
    });
    expect(result.matchedKeywords).toContain("c++");
    expect(result.missingKeywords).toContain("scala");
    expect(result.matchedKeywords).not.toContain("scala");
  });
});
