# Resume Tailor AI

An AI-powered resume builder that tailors your resume for every job application — maximizing ATS keyword coverage while preserving the quality and authenticity of your original content.

---

## Why I Built This

Job hunting is brutal. I spent months applying to roles I was genuinely qualified for, only to hear nothing back. The problem wasn't my experience — it was that my resume never made it past the ATS (Applicant Tracking System) that most companies use to filter candidates before a human ever sees the application.

ATS systems scan resumes for specific keywords from the job description. If your resume doesn't use the exact phrasing the JD uses — even if you have the skills — you get filtered out automatically. "A/B testing" and "A/B test" are the same thing to a human, but not to an ATS.

I built Resume Tailor AI because I didn't want other people to get filtered out for the wrong reasons. Your experience is real. Your skills are real. You deserve a fair shot at being seen.

---

## What It Does

### Fact Bank
Upload one or more versions of your resume. The AI extracts all your experiences, education, and skills into a structured **Fact Bank** — your single source of truth. Each work experience supports multiple **frames** (different job titles / angles), so you can present the same role differently depending on the target job.

### Generate Resume
Paste a job description URL (Greenhouse, Lever, most company career pages) or the full JD text. The AI runs in parallel:

1. **Selects the best frame** for each experience based on title-function match with the JD
2. **Generates a JD keyword report** — categorizes keywords into Hard Skills, Business Context, Title/Function, Action Keywords, Domain, and Hard Filters
3. **Rewrites bullets with minimal edits** — fixes variant forms (e.g. "A/B testing" → "A/B test") and inserts missing keywords naturally, without fabricating facts
4. **Reorganizes your skills section** to front-load JD-relevant skills
5. **Enforces one-page constraint** — automatically trims the lowest-scoring bullets if the resume exceeds one page

### ATS Scoring
After generation, you see a **before → after ATS match score** based on weighted keyword coverage:
- Hard skills (tools, languages, platforms): **2x weight**
- Title/function keywords: **1.5x weight**
- Business context keywords: **1x weight**

The score tells you exactly how much the optimization helped, and which keywords are still missing.

### Boost ATS Mode
If you want to push the score further, click **⚡ Boost ATS Score**. This runs an aggressive optimization pass:
1. Proactively inserts missing business context keywords into bullets
2. Only adds hard skill keywords to the Skills section if they couldn't fit naturally into any bullet
3. Business context words that can't be placed naturally are left out — no fake stuffing

### Inline Editing
Every field in the generated resume is directly editable — click to edit, hover to delete rows. After editing, click **↻ Recalculate Score** to instantly see the updated ATS score without any AI call.

### Download PDF
Download a clean, ATS-friendly PDF — Times Roman font, one page, no tables or columns that could confuse parsers.

---

## Workflow

```
Upload resumes → Build Fact Bank → Paste JD → Generate Resume
                                                      ↓
                                          View ATS score (before → after)
                                          View keyword report
                                                      ↓
                                          Edit inline if needed
                                          ↻ Recalculate score
                                                      ↓
                                          ⚡ Boost ATS (optional)
                                                      ↓
                                          Download PDF
```

---

## Tech Stack

- **Next.js 16** (App Router)
- **OpenAI GPT-4o** — frame selection, JD keyword report, bullet rewrite, skills reorganization
- **@react-pdf/renderer** — PDF generation server-side
- **Tailwind CSS**
- TypeScript throughout

---

## Getting Started

### Prerequisites
- Node.js 18+
- OpenAI API key

### Setup

```bash
git clone https://github.com/JaimeYeung/Resume-Tailor-AI.git
cd Resume-Tailor-AI
npm install
```

Create a `.env.local` file in the project root:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Run (Production mode recommended)

```bash
npm run build
npm run start
```

> **Note:** Use production mode (`build` + `start`) instead of `npm run dev`. The PDF generation library (`@react-pdf/renderer`) is heavy and can cause memory issues with the dev server.

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  api/
    parse-resume/     # Upload & extract resume data (PDF/DOCX)
    generate-resume/  # Main AI pipeline: frame selection + bullet rewrite
    boost-ats/        # Aggressive ATS optimization pass
    download-pdf/     # Server-side PDF rendering
    scrape-jd/        # JD URL scraping
components/
  FactBankEditor.tsx  # Manage your experience library
  JDInput.tsx         # JD input + generate trigger
  ResumePreview.tsx   # Inline-editable resume view + ATS score card
  ResumePDF.tsx       # PDF layout (server-only)
lib/
  prompts.ts          # All GPT prompt builders
  types.ts            # TypeScript interfaces
  storage.ts          # LocalStorage persistence
```

---

## License

MIT
