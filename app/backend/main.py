import os
import json
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import anthropic

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


@app.get("/", response_class=HTMLResponse)
def root():
    with open(os.path.join(FRONTEND_DIR, "index.html")) as f:
        return f.read()


# ── Shared data models ────────────────────────────────────────────────────

class Profile(BaseModel):
    full_name: str
    field: str
    subfield: Optional[str] = ""
    education: str           # e.g. "PhD, MIT, Computer Science, 2018"
    country: str
    current_role: str
    institution: str
    years_in_field: int

    # Publications & Citations
    num_publications: Optional[int] = 0
    top_venues: Optional[str] = ""       # comma-separated
    total_citations: Optional[int] = 0
    h_index: Optional[int] = 0

    # Awards
    awards: Optional[str] = ""          # freeform

    # Reviewing / Judging
    reviewing: Optional[str] = ""       # journals/conferences reviewed for

    # Salary
    salary_context: Optional[str] = ""  # e.g. "Top 10% in field per BLS"

    # Media
    media_coverage: Optional[str] = ""  # articles about them

    # Memberships
    memberships: Optional[str] = ""     # associations with selective admission

    # Leadership roles
    leadership: Optional[str] = ""      # senior / critical roles at orgs

    # Contributions
    contributions: Optional[str] = ""   # patents, key innovations, impact

    # Proposed endeavor (for NIW)
    proposed_endeavor: Optional[str] = ""

    # Other
    other: Optional[str] = ""


class StrategyRequest(BaseModel):
    profile: Profile
    petition_type: str   # "EB1A" or "NIW"


class EvidenceItem(BaseModel):
    criterion_id: str
    criterion_label: str
    evidence: str


class EvidenceRequest(BaseModel):
    profile: Profile
    petition_type: str
    items: List[EvidenceItem]


class GenerateRequest(BaseModel):
    profile: Profile
    petition_type: str
    items: List[EvidenceItem]


# ── Streaming helper ──────────────────────────────────────────────────────

def stream_response(system: str, prompt: str):
    def generate():
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=4000,
            thinking={"type": "adaptive"},
            system=system,
            messages=[{"role": "user", "content": prompt}],
        ) as s:
            for text in s.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")


def profile_summary(p: Profile) -> str:
    return f"""
Name: {p.full_name}
Field: {p.field}{f' ({p.subfield})' if p.subfield else ''}
Education: {p.education}
Country of Birth: {p.country}
Current Role: {p.current_role} at {p.institution}
Years in Field: {p.years_in_field}
Publications: {p.num_publications or 'not specified'} | Venues: {p.top_venues or 'not specified'}
Citations: {p.total_citations or 'not specified'} | h-index: {p.h_index or 'not specified'}
Awards/Honors: {p.awards or 'none mentioned'}
Peer Reviewing: {p.reviewing or 'none mentioned'}
Salary Context: {p.salary_context or 'not specified'}
Media Coverage: {p.media_coverage or 'none mentioned'}
Memberships: {p.memberships or 'none mentioned'}
Leadership Roles: {p.leadership or 'none mentioned'}
Key Contributions/Patents: {p.contributions or 'none mentioned'}
Proposed Endeavor (NIW): {p.proposed_endeavor or 'not specified'}
Other: {p.other or 'none'}
""".strip()


# ── Phase 2: Qualification Assessment ────────────────────────────────────

@app.post("/assess")
async def assess(profile: Profile):
    system = """You are an experienced US immigration attorney specializing in EB-1A and NIW self-petitions.
You give honest, realistic, and actionable assessments.
You are direct about weaknesses while encouraging about genuine strengths.
Format your response with clear headers and bullet points.
Use plain language that a non-attorney can understand."""

    prompt = f"""Assess this person's qualification for EB-1A (Extraordinary Ability) and NIW (National Interest Waiver) immigration petitions.

PROFILE:
{profile_summary(profile)}

Provide a structured assessment with:

## EB-1A Assessment
Rate overall strength: **Strong / Moderate / Weak / Not recommended**

Briefly explain why (2-3 sentences).

Then list which of the 10 USCIS criteria they likely meet, might meet, or don't meet:
- ✅ Clearly meets: [criterion name] — [one-line reason]
- 🟡 Potentially meets with more evidence: [criterion name] — [what's needed]
- ❌ Likely doesn't apply: [criterion name] — [why]

## NIW Assessment
Rate overall strength: **Strong / Moderate / Weak / Not recommended**

Briefly explain why (2-3 sentences).

Then assess each Dhanasar prong:
- Prong 1 (Substantial Merit + National Importance): [strength + reason]
- Prong 2 (Well Positioned): [strength + reason]
- Prong 3 (National Interest Waiver Justified): [strength + reason]

## Recommendation
Which pathway(s) should they pursue, and why?
Are there any red flags or timing considerations?
What is their single biggest strength and single biggest gap?"""

    return stream_response(system, prompt)


# ── Phase 3: Strategy ─────────────────────────────────────────────────────

@app.post("/strategy")
async def strategy(req: StrategyRequest):
    system = """You are an experienced US immigration attorney specializing in EB-1A and NIW self-petitions.
You help petitioners build the strongest possible case strategy.
Be specific, tactical, and actionable.
Format with clear headers and use plain language."""

    if req.petition_type == "EB1A":
        prompt = f"""Build a winning EB-1A petition strategy for this petitioner.

PROFILE:
{profile_summary(req.profile)}

Provide:

## Recommended Criteria to Claim
List the 3-5 strongest criteria in order of strength. For each:
**[Criterion Name]**
- Why it's strong for this person
- What specific evidence to emphasize
- Any framing tips (how USCIS views this criterion)
- 🔴 Watch out for: [common pitfall or weakness to address]

## Criteria to Avoid
List any criteria that might seem applicable but are risky or weak for this person, and why.

## Overall Case Strategy
In 3-5 bullet points: the narrative arc of this petition. What story should run through every section? What is the single most compelling argument for why this person is "at the top of their field"?

## Evidence Priorities
What are the top 3 evidence items they should obtain or strengthen before filing?"""

    else:
        prompt = f"""Build a winning NIW petition strategy for this petitioner.

PROFILE:
{profile_summary(req.profile)}

Provide:

## Proposed Endeavor Statement
Draft a 2-3 sentence "proposed endeavor" statement that:
- Is specific (not vague like "I will continue my research")
- Has clear national importance
- Is something this person is uniquely positioned to advance
- Connects to concrete US national interests (health, economy, security, STEM competitiveness, etc.)

## Dhanasar Framework Strategy

**Prong 1 — Substantial Merit & National Importance**
- Key argument to make
- Best evidence from this profile to use
- 🔴 Weakness to address

**Prong 2 — Well Positioned to Advance**
- Key argument to make
- Best evidence from this profile to use
- 🔴 Weakness to address

**Prong 3 — National Interest Supports Waiving Job Offer**
- Key argument to make
- Why a labor market test would be impractical/unnecessary for this person
- 🔴 Weakness to address

## Evidence Priorities
What are the top 3 evidence items they should obtain or strengthen before filing?

## Overall Narrative
In 3-5 bullet points: the story this petition should tell. What makes their case uniquely compelling?"""

    return stream_response(system, prompt)


# ── Phase 4: Evidence Gap Analysis ───────────────────────────────────────

@app.post("/evidence-gaps")
async def evidence_gaps(req: EvidenceRequest):
    system = """You are an experienced US immigration attorney reviewing a petition's evidence.
You identify specific gaps, weaknesses, and ways to strengthen each piece of evidence.
Be specific and actionable. Format clearly with headers per criterion."""

    criteria_text = ""
    for item in req.items:
        criteria_text += f"\n\n### {item.criterion_label}\nEvidence provided:\n{item.evidence or '(nothing entered yet)'}"

    prompt = f"""Review the evidence provided for this {'EB-1A' if req.petition_type == 'EB1A' else 'NIW'} petition and identify gaps, weaknesses, and improvements.

PROFILE:
{profile_summary(req.profile)}

EVIDENCE SUBMITTED:
{criteria_text}

For EACH criterion, provide:

## [Criterion Name]
**Overall strength: Strong / Moderate / Weak / Needs work**

✅ What's working:
[specific strengths in the evidence]

🔴 Gaps & weaknesses:
[what's missing or unconvincing]

📋 Specific evidence to add or obtain:
[actionable list — e.g. "Get a letter from Prof. X at MIT confirming citation impact", "Obtain salary survey from Bureau of Labor Statistics showing your comp is top 10%"]

✍️ Framing tip:
[how to present this evidence most persuasively to a USCIS officer]

End with:
## Overall Assessment
- Evidence readiness: [X/10]
- Ready to file? [Yes / No — needs more work]
- Top 3 priorities before filing"""

    return stream_response(system, prompt)


# ── Phase 5: Generate Petition ────────────────────────────────────────────

EB1A_SYSTEM = """You are an expert immigration attorney drafting EB-1A (Extraordinary Ability) I-140 petition letters.
Write complete, formal, persuasive petition letters that:
- Are addressed to "The Director, USCIS"
- Use third person throughout ("Dr. Smith has demonstrated...")
- Apply the Kazarian two-step analysis structure
- Cite specific quantified evidence
- Connect each criterion to the regulatory standard at 8 C.F.R. § 204.5(h)(3)
- Build toward a compelling "final merits determination" showing the person is among the small percentage at the top of their field"""

NIW_SYSTEM = """You are an expert immigration attorney drafting NIW (National Interest Waiver) I-140 petition letters.
Write complete, formal, persuasive petition letters that:
- Are addressed to "The Director, USCIS"
- Use third person throughout
- Explicitly address the Dhanasar three-prong framework
- Cite specific quantified evidence
- Connect the petitioner's work to concrete US national benefit
- Make clear why the national interest warrants waiving the job offer requirement"""


@app.post("/generate")
async def generate(req: GenerateRequest):
    criteria_text = "\n\n".join(
        f"### {item.criterion_label}\n{item.evidence}" for item in req.items
    )

    if req.petition_type == "EB1A":
        system = EB1A_SYSTEM
        prompt = f"""Draft a complete EB-1A Extraordinary Ability petition letter for USCIS I-140.

PETITIONER PROFILE:
{profile_summary(req.profile)}

CRITERIA AND EVIDENCE:
{criteria_text}

Write the full petition letter with:
1. Introduction establishing extraordinary ability and the field
2. One detailed section per criterion (with regulatory citation and evidence analysis)
3. Final merits determination (why this person is among the top in their field)
4. Prayer for relief

Use specific numbers, names, and facts from the evidence. Be persuasive but factual."""

    else:
        system = NIW_SYSTEM
        prompt = f"""Draft a complete NIW National Interest Waiver petition letter for USCIS I-140.

PETITIONER PROFILE:
{profile_summary(req.profile)}

EVIDENCE BY PRONG:
{criteria_text}

Write the full petition letter with:
1. Introduction presenting the petitioner and proposed endeavor
2. Prong 1: Substantial Merit and National Importance
3. Prong 2: Well Positioned to Advance the Endeavor
4. Prong 3: Balance of National Interest Supports Waiving Requirements
5. Prayer for relief

Use specific numbers, names, and facts. Connect work explicitly to US national interests."""

    def generate_stream():
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=8000,
            thinking={"type": "adaptive"},
            system=system,
            messages=[{"role": "user", "content": prompt}],
        ) as s:
            for text in s.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate_stream(), media_type="text/event-stream")
