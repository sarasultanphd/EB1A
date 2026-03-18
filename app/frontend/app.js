"use strict";

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  petitionType: null,
  outputText: "",
};

// ── Criteria per pathway ──────────────────────────────────────────────────
const EB1A_CRITERIA = [
  {
    id: "awards",
    label: "Prize or Award for Excellence",
    desc: "Nationally/internationally recognized prize for excellence in the field",
    hint: "List every award: name, issuing organization, year, competition scope, selectivity (e.g. '1 in 500 applicants'). More detail = stronger case.",
  },
  {
    id: "membership",
    label: "Membership Requiring Outstanding Achievement",
    desc: "Association membership judged by recognized experts requiring outstanding achievement",
    hint: "Name the association(s), describe their admission criteria and who judges applications. Explain why being elected is an honor.",
  },
  {
    id: "press",
    label: "Published Material About You in Major Media",
    desc: "Articles/features about you in professional, major trade, or major media",
    hint: "List each article: title, publication, date, circulation/audience size, what it said about you. MUST be about you, not just mentioning you.",
  },
  {
    id: "judging",
    label: "Judging the Work of Others",
    desc: "Invited to judge others' work — conferences, journals, competitions, grant panels",
    hint: "List conferences/journals, years, volume (e.g. '40 papers/year for NeurIPS'). Invitations to judge at highly selective venues are strongest.",
  },
  {
    id: "contributions",
    label: "Original Contributions of Major Significance",
    desc: "Original scientific, scholarly, artistic, or business contributions of major significance",
    hint: "Describe your key innovations. Show impact: adoption rate, citations, products built on your work, field paradigm shifts. Quantify everything.",
  },
  {
    id: "articles",
    label: "Authorship of Scholarly Articles",
    desc: "Authored scholarly articles in professional or major trade publications",
    hint: "Total papers, top venues (journal impact factor or conference acceptance rate), total citations, h-index. Mention highly-cited individual papers.",
  },
  {
    id: "exhibitions",
    label: "Display of Work at Artistic Exhibitions",
    desc: "Work displayed at artistic exhibitions or showcases",
    hint: "List exhibitions: venue, city, dates, audience reach, curators. Distinguish solo vs. group shows.",
  },
  {
    id: "critical_role",
    label: "Leading or Critical Role for Distinguished Organizations",
    desc: "Leading or critical role for a distinguished organization or establishment",
    hint: "Describe your exact role, the org's prominence (rankings, revenue, reputation), scope of your responsibilities, and measurable impact.",
  },
  {
    id: "high_salary",
    label: "High Salary Relative to Others in the Field",
    desc: "High salary or remuneration significantly above others in the field",
    hint: "State your compensation (base + bonus + equity). Compare to BLS national median or industry surveys. What percentile are you in?",
  },
  {
    id: "commercial_success",
    label: "Commercial Success in the Performing Arts",
    desc: "Commercial successes in performing arts via box office receipts, album sales, etc.",
    hint: "Provide concrete numbers: tickets sold, streaming plays, box office totals. Compare to field averages.",
  },
];

const NIW_CRITERIA = [
  {
    id: "prong1",
    label: "Prong 1 — Substantial Merit & National Importance",
    desc: "The proposed endeavor has both substantial merit and national importance to the United States",
    hint: "Describe the problem you are solving and why it matters to the US. Be specific about the national benefit (healthcare, economy, national security, scientific competitiveness, etc.). Cite data where possible.",
  },
  {
    id: "prong2",
    label: "Prong 2 — Well Positioned to Advance the Endeavor",
    desc: "You are well positioned to advance the proposed endeavor based on education, skills, and track record",
    hint: "List your qualifications: degrees, publications, citations, patents, grants, prior results, collaborators, institutional support. Show you are the right person to do this work.",
  },
  {
    id: "prong3",
    label: "Prong 3 — National Interest Supports Waiving Job Offer",
    desc: "On balance, the national interest benefits from waiving the job offer and labor certification requirements",
    hint: "Argue why the usual process (PERM labor certification) would be impractical or counterproductive here. E.g. the work is in the national interest but hard to define a single employer for; you have US collaborators/funding; the field has a shortage; unique expertise unavailable domestically.",
  },
];

// ── Read profile from form ────────────────────────────────────────────────
function getProfile() {
  return {
    full_name: val("full_name"),
    field: val("field"),
    subfield: val("subfield"),
    education: val("education"),
    country: val("country"),
    current_role: val("current_role"),
    institution: val("institution"),
    years_in_field: parseInt(val("years_in_field")) || 0,
    num_publications: parseInt(val("num_publications")) || 0,
    top_venues: val("top_venues"),
    total_citations: parseInt(val("total_citations")) || 0,
    h_index: parseInt(val("h_index")) || 0,
    awards: val("awards"),
    memberships: val("memberships"),
    reviewing: val("reviewing"),
    leadership: val("leadership"),
    contributions: val("contributions"),
    salary_context: val("salary_context"),
    media_coverage: val("media_coverage"),
    proposed_endeavor: val("proposed_endeavor"),
    other: val("other"),
  };
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

// ── Phase navigation ──────────────────────────────────────────────────────
function showPhase(n) {
  document.querySelectorAll(".phase").forEach((el) => el.classList.add("hidden"));
  document.getElementById(`phase-${n}`).classList.remove("hidden");

  const labels = ["", "Profile", "Assessment", "Strategy", "Evidence", "Draft"];
  const badge = document.getElementById("phase-badge");
  badge.textContent = `Phase ${n} of 5 — ${labels[n]}`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backTo(n) {
  showPhase(n);
}

// ── Phase 2: Qualification assessment ─────────────────────────────────────
async function runAssessment() {
  const profile = getProfile();
  if (!profile.full_name || !profile.field) {
    alert("Please fill in at least your name and field before continuing.");
    return;
  }

  showPhase(2);

  const loadingEl = document.getElementById("assessment-loading");
  const textEl = document.getElementById("assessment-text");
  const actionsEl = document.getElementById("assessment-actions");

  loadingEl.style.display = "flex";
  textEl.textContent = "";
  actionsEl.classList.add("hidden");

  await streamToElement("/assess", profile, textEl, loadingEl, () => {
    renderMarkdown(textEl);
    actionsEl.classList.remove("hidden");
  });
}

// ── Phase 3: Strategy ──────────────────────────────────────────────────────
function choosePath(type) {
  state.petitionType = type;

  document.getElementById("choice-EB1A").classList.toggle("selected", type === "EB1A");
  document.getElementById("choice-NIW").classList.toggle("selected", type === "NIW");

  const label = type === "EB1A" ? "EB-1A Extraordinary Ability" : "NIW National Interest Waiver";
  document.getElementById("strategy-heading").textContent = `${label} Strategy`;

  showPhase(3);
  runStrategy();
}

async function runStrategy() {
  const loadingEl = document.getElementById("strategy-loading");
  const textEl = document.getElementById("strategy-text");
  const actionsEl = document.getElementById("strategy-actions");

  loadingEl.style.display = "flex";
  textEl.textContent = "";
  actionsEl.classList.add("hidden");

  const payload = { profile: getProfile(), petition_type: state.petitionType };

  await streamToElement("/strategy", payload, textEl, loadingEl, () => {
    renderMarkdown(textEl);
    actionsEl.classList.remove("hidden");
  });
}

// ── Phase 4: Evidence + gap analysis ─────────────────────────────────────
function goToEvidence() {
  buildEvidenceFields();
  showPhase(4);
  // Hide gap output
  document.getElementById("gaps-output-card").classList.add("hidden");
  document.getElementById("gaps-actions").classList.add("hidden");
}

function goTo(n) {
  if (n === 5) prepareDraftPhase();
  showPhase(n);
}

function buildEvidenceFields() {
  const criteria = state.petitionType === "EB1A" ? EB1A_CRITERIA : NIW_CRITERIA;
  const container = document.getElementById("evidence-fields-container");
  container.innerHTML = criteria
    .map(
      (c) => `
    <div class="evidence-block">
      <span class="ev-label">${c.label}</span>
      <div class="ev-desc">${c.desc}</div>
      <div class="ev-hint">💡 ${c.hint}</div>
      <textarea id="ev-${c.id}" rows="5" placeholder="Describe your specific evidence here..."></textarea>
    </div>`
    )
    .join("");
}

function getEvidenceItems() {
  const criteria = state.petitionType === "EB1A" ? EB1A_CRITERIA : NIW_CRITERIA;
  return criteria.map((c) => ({
    criterion_id: c.id,
    criterion_label: c.label,
    evidence: val(`ev-${c.id}`),
  }));
}

async function runGapAnalysis() {
  const gapsCard = document.getElementById("gaps-output-card");
  const loadingEl = document.getElementById("gaps-loading");
  const textEl = document.getElementById("gaps-text");
  const actionsEl = document.getElementById("gaps-actions");

  gapsCard.classList.remove("hidden");
  loadingEl.style.display = "flex";
  textEl.textContent = "";
  actionsEl.classList.add("hidden");

  gapsCard.scrollIntoView({ behavior: "smooth", block: "start" });

  const payload = {
    profile: getProfile(),
    petition_type: state.petitionType,
    items: getEvidenceItems(),
  };

  await streamToElement("/evidence-gaps", payload, textEl, loadingEl, () => {
    renderMarkdown(textEl);
    actionsEl.classList.remove("hidden");
  });
}

// ── Phase 5: Generate ──────────────────────────────────────────────────────
function prepareDraftPhase() {
  const name = val("full_name") || "you";
  const typeLabel =
    state.petitionType === "EB1A" ? "EB-1A Extraordinary Ability" : "NIW National Interest Waiver";
  document.getElementById("summary-type").textContent = typeLabel;
  document.getElementById("summary-name").textContent = name;

  document.getElementById("generate-prompt-card").classList.remove("hidden");
  document.getElementById("generating-card").classList.add("hidden");
  document.getElementById("output-card").classList.add("hidden");
  document.getElementById("petition-output").textContent = "";
  state.outputText = "";
}

async function generatePetition() {
  document.getElementById("generate-prompt-card").classList.add("hidden");
  document.getElementById("generating-card").classList.remove("hidden");
  document.getElementById("output-card").classList.add("hidden");

  const outputEl = document.getElementById("petition-output");
  outputEl.textContent = "";
  state.outputText = "";

  const payload = {
    profile: getProfile(),
    petition_type: state.petitionType,
    items: getEvidenceItems(),
  };

  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    document.getElementById("generating-card").classList.add("hidden");
    document.getElementById("output-card").classList.remove("hidden");

    await readStream(res, (text) => {
      state.outputText += text;
      outputEl.textContent = state.outputText;
    });
  } catch (err) {
    document.getElementById("generating-card").classList.add("hidden");
    document.getElementById("generate-prompt-card").classList.remove("hidden");
    alert(`Error: ${err.message}\n\nMake sure ANTHROPIC_API_KEY is set.`);
  }
}

function copyOutput() {
  navigator.clipboard.writeText(state.outputText).then(() => {
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = "✓ Copied!";
    setTimeout(() => (btn.textContent = orig), 2000);
  });
}

function downloadOutput() {
  const name = (val("full_name") || "petition").replace(/\s+/g, "_");
  const blob = new Blob([state.outputText], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}_${state.petitionType}_petition.txt`;
  a.click();
}

function regenerate() {
  prepareDraftPhase();
}

// ── Streaming utility ──────────────────────────────────────────────────────
async function streamToElement(url, payload, textEl, loadingEl, onDone) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    loadingEl.style.display = "none";
    let accumulated = "";

    await readStream(res, (text) => {
      accumulated += text;
      textEl.textContent = accumulated;
    });

    if (onDone) onDone();
  } catch (err) {
    loadingEl.style.display = "none";
    textEl.textContent = `Error: ${err.message}\n\nMake sure ANTHROPIC_API_KEY is set.`;
  }
}

async function readStream(res, onText) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) onText(parsed.text);
        } catch (_) {}
      }
    }
  }
}

// ── Simple markdown renderer (h2/h3/bold/bullets) ─────────────────────────
function renderMarkdown(el) {
  let html = el.textContent
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // h2 ## Heading
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // h3 ### Heading
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // bullet lines starting with - or *
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // wrap consecutive li in ul
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    // blank lines become paragraphs
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, (m) => m.startsWith('<') ? m : m);

  el.innerHTML = `<p>${html}</p>`;
}

// ── Init ──────────────────────────────────────────────────────────────────
showPhase(1);
