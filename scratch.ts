import { analyzeResume } from "./src/lib/analyzer";

const resumeText = `
h
Navi Mumbai, India sachinsingh.engineer@gmail.com +91 9082195616
LinkedIn GitHub LeetCode
Summary
Full stack engineering undergraduate with hands-on experience building end-to-end web applications across
frontend and backend. Comfortable working in fast-paced, early-stage environments, taking ownership of fea-
tures, and learning through iteration. Strong interest in building meaningful, user-focused products with clean
and maintainable code.
Education
Indian Institute of Information Technology, Kottayam B.Tech in Computer Science and Engineering Consistent academic growth: 7.61 → 8.57 → 9.33 → 9.17 → 9.09
Technical Skills
2023 – 2027
CGPA: 8.76
Programming: JavaScript, TypeScript, Python, C++
Frontend: HTML, CSS, ReactJS, component-based UI development
Backend: REST APIs, server-side logic, authentication basics
Databases: MySQL, relational schema design, CRUD operations
Core Concepts: Data Structures & Algorithms, DBMS, Operating Systems
Tools & Workflow: Git, GitHub, VS Code, debugging, iterative development
Projects
Global Chat System— HTML, JavaScript, PHP, MySQL
• Built a full-stack chat application with real-time message flow and persistent storage.
• Implemented backend APIs for user authentication, message handling, and data retrieval.
• Designed relational database schemas to support scalability and consistent user experience.
Interactive Product & Token Platform— JavaScript, PHP, MySQL
• Developed dynamic frontend features for browsing, selecting, and purchasing digital items.
• Integrated backend logic for user state management, ownership validation, and database updates.
• Focused on clean UI transitions, smooth interactions, and maintainable feature logic.
Leadership & Experience
Finance Club, IIIT Kottayam — Sub Lead • Led hands-on sessions explaining technical and data-driven concepts to non-technical audiences.
• Collaborated with team members to design structured learning material and activities.
Astronomy Club, IIIT Kottayam — Sub Lead • Organized interactive discussions and activities to encourage curiosity and analytical thinking.
Achievements
2024 – Present
2024 – Present
• Solved 950+ DSA problems on LeetCode, strengthening problem-solving and logical thinking.
• CodeChef 3-Star Coder (Max Rating: 1658).
• Finalist — IIIT Gwalior Infotsav 2025.
`;

async function run() {
  const result = await analyzeResume({
    resumeText,
    jobDescription: "",
  });
  console.log("Overall Score:", result.overallScore);
  console.log("Scores:", result.scores);
  console.log("Missing Metrics:", result.missingMetrics);
  console.log("Formatting Issues:", result.formattingIssues);
  console.log("Section Feedback:", result.sectionFeedback.filter(s => s.status === 'missing'));
}

run();
