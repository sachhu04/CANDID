import { analyzeResume } from "./src/lib/analyzer";

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

async function main() {
  const result = await analyzeResume({
    resumeText,
    jobDescription: jdText,
  });
  console.log("matched:", result.matchedKeywords);
  console.log("missing:", result.missingKeywords);
}

main();
