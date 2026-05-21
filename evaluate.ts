import { analyzeResume } from './src/lib/analyzer';
import { sampleResume, sampleJobDescription } from './src/lib/samples';

const result = analyzeResume({
  resumeText: sampleResume,
  jobDescription: sampleJobDescription,
});

console.log(JSON.stringify(result, null, 2));
