# Candid

Candid is a professional SaaS-style resume and job-description analyzer. It does not claim to know a universal ATS score. Instead, it estimates ATS compatibility with transparent rules for keyword alignment, semantic role fit, parser safety, experience relevance, and section completeness.

## Features

- Landing page with premium SaaS positioning, FAQ, score preview, and clear disclaimer
- Analyzer page with paste inputs, PDF/DOCX/text upload, demo data, validation, loading states, and local history
- Results report with overall score, weighted breakdown, chart, badges, progress indicators, warnings, keyword coverage, section feedback, formatting risks, and ranked suggestions
- Link and contact extraction for email, phone, LinkedIn, GitHub, portfolio, and other readable URLs
- Downloadable PDF report
- Dark mode and light mode
- API route at `/api/analyze` for analysis logic
- Browser-local report history for v1

## Scoring Model

The overall score is an estimate using:

- Keyword match: 30%
- Semantic role fit: 25%
- ATS parseability / formatting safety: 20%
- Experience relevance: 15%
- Section completeness: 10%

The app surfaces matched keywords, missing keywords, exact JD phrases not found in the resume, weak phrases, missing metrics, seniority mismatch, and formatting risks such as table-like layouts, multi-column spacing, icons, images, text boxes, unusual symbols, and excessive decoration.

## Supported Resume Uploads

- PDF with selectable text
- DOCX
- TXT
- MD
- RTF
- CSV

Legacy binary `.doc` files are detected, but they are not parsed in-browser because that format needs a conversion layer. Export `.doc` resumes to `.docx` or PDF before uploading.

Scanned image-only PDFs need OCR first. If the PDF has no selectable text, paste OCR text or export a text-based PDF.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- Framer Motion
- lucide-react
- jsPDF
- next-themes

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Environment Variables

No environment variables are required for v1. The analyzer uses local deterministic rules and stores history in the browser.

## Deployment

This project is ready for Vercel:

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Use the default Next.js settings.
4. Deploy.

## Product Disclaimer

Candid estimates compatibility. No ATS is identical across companies, and this tool does not represent any employer's internal screening score.
