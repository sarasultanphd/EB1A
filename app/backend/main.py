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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
def root():
    with open(os.path.join(FRONTEND_DIR, "index.html")) as f:
        return f.read()


class CriterionEvidence(BaseModel):
    criterion_id: str
    criterion_label: str
    evidence: str


class PetitionRequest(BaseModel):
    petition_type: str  # "EB1A" or "NIW"
    full_name: str
    field: str
    country: str
    current_role: str
    institution: str
    criteria: List[CriterionEvidence]
    additional_context: Optional[str] = ""


EB1A_SYSTEM = """You are an expert immigration attorney specializing in EB-1A (Extraordinary Ability) self-petitions.
You help petitioners draft compelling, legally-sound petition letters for USCIS I-140 applications.

Your writing style:
- Professional, precise, and persuasive
- Third person ("Dr. Smith has...")
- Uses specific quantified evidence
- Mirrors USCIS adjudicator language from the Kazarian two-step analysis
- Each criterion section clearly establishes how the evidence meets the regulatory standard
- Connects evidence to national/international impact"""

NIW_SYSTEM = """You are an expert immigration attorney specializing in NIW (National Interest Waiver) self-petitions.
You help petitioners draft compelling, legally-sound petition letters for USCIS I-140 applications.

Your writing style:
- Professional, precise, and persuasive
- Third person ("Dr. Smith has...")
- Uses specific quantified evidence
- Addresses the Dhanasar three-prong framework: (1) substantial merit and national importance, (2) well-positioned to advance the endeavor, (3) balance of national interests
- Connects the petitioner's work to concrete national benefit"""


def build_prompt(req: PetitionRequest) -> str:
    criteria_text = ""
    for c in req.criteria:
        criteria_text += f"\n\n### {c.criterion_label}\n{c.evidence}"

    if req.petition_type == "EB1A":
        intro = f"""Draft a complete EB-1A petition letter for USCIS I-140 for the following petitioner.

Petitioner Information:
- Name: {req.full_name}
- Field: {req.field}
- Country of Birth: {req.country}
- Current Role: {req.current_role}
- Institution/Organization: {req.institution}

The petitioner is self-petitioning under the EB-1A Extraordinary Ability category. They meet the following USCIS criteria (at least 3 of 10 required):
{criteria_text}"""
        if req.additional_context:
            intro += f"\n\nAdditional context: {req.additional_context}"
        intro += """

Write a complete, formal petition letter addressed to "The Director, USCIS" that:
1. Opens with an introduction establishing extraordinary ability
2. Has a dedicated section for each criterion with detailed analysis
3. Includes a final merits determination section arguing the petitioner is among the small percentage at the top of their field
4. Closes with a request to approve the petition

Use specific details from the evidence provided. Format with clear section headers."""
    else:
        intro = f"""Draft a complete NIW (National Interest Waiver) petition letter for USCIS I-140 for the following petitioner.

Petitioner Information:
- Name: {req.full_name}
- Field: {req.field}
- Country of Birth: {req.country}
- Current Role: {req.current_role}
- Institution/Organization: {req.institution}

The petitioner is self-petitioning under the NIW (National Interest Waiver) category using the Dhanasar framework. Evidence supporting each prong:
{criteria_text}"""
        if req.additional_context:
            intro += f"\n\nAdditional context: {req.additional_context}"
        intro += """

Write a complete, formal petition letter addressed to "The Director, USCIS" that:
1. Opens with a strong introduction to the petitioner and their proposed endeavor
2. Prong 1: Argues the proposed endeavor has substantial merit and national importance
3. Prong 2: Shows the petitioner is well-positioned to advance the endeavor
4. Prong 3: Argues the balance of national interests supports waiving the job offer and labor certification
5. Closes with a request to approve the NIW

Use specific details from the evidence provided. Format with clear section headers."""

    return intro


@app.post("/generate")
async def generate_petition(req: PetitionRequest):
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    system = EB1A_SYSTEM if req.petition_type == "EB1A" else NIW_SYSTEM
    prompt = build_prompt(req)

    def stream():
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

    return StreamingResponse(stream(), media_type="text/event-stream")
