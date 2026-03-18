"use strict";

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  petitionType: null,
  currentStep: 1,
  selectedCriteria: new Set(),
  outputText: "",
};

// ── Criteria definitions ───────────────────────────────────────────────────
const EB1A_CRITERIA = [
  {
    id: "awards",
    label: "Prize or Award for Excellence",
    desc: "Receipt of a lesser nationally or internationally recognized prize or award for excellence in the field",
    hint: "List prizes/awards, issuing body, competition scope, selectivity, prestige. Include years.",
  },
  {
    id: "membership",
    label: "Membership in Associations Requiring Outstanding Achievement",
    desc: "Membership in associations that require outstanding achievements of their members",
    hint: "Name the association(s), their membership criteria, who judges applications, and your membership status.",
  },
  {
    id: "press",
    label: "Published Material About You in Major Media",
    desc: "Published material about the alien in professional or major trade publications, major media, or other major publications",
    hint: "List articles, publications, outlets (circulation/readership), dates, and what they covered about you.",
  },
  {
    id: "judging",
    label: "Judging the Work of Others",
    desc: "Participation as a judge of the work of others in the field",
    hint: "List conference/journal review roles, panels, competitions. Include volume (e.g., # papers reviewed per year).",
  },
  {
    id: "contributions",
    label: "Original Scientific, Scholarly, or Business Contributions of Major Significance",
    desc: "Evidence of original scientific, scholarly, artistic, athletic, or business-related contributions of major significance",
    hint: "Describe key innovations, patents, methods, products. Explain their impact on the field with citations/adoption metrics.",
  },
  {
    id: "articles",
    label: "Authorship of Scholarly Articles",
    desc: "Authorship of scholarly articles in the field in professional or major trade publications or other major media",
    hint: "Total publications, venues (journal/conference names, impact factors/rankings), total citations, h-index.",
  },
  {
    id: "exhibitions",
    label: "Display of Work at Artistic Exhibitions or Showcases",
    desc: "Display of the alien's work in the field at artistic exhibitions or showcases",
    hint: "List exhibitions, venues, dates, audiences, and any notable curators or institutions involved.",
  },
  {
    id: "critical_role",
    label: "Leading or Critical Role for Distinguished Organizations",
    desc: "Performance in a leading or critical role for distinguished organizations or establishments",
    hint: "Describe your role, the organization's reputation/ranking, scope of responsibility, and specific impact.",
  },
  {
    id: "high_salary",
    label: "High Salary or Remuneration Relative to Others in the Field",
    desc: "Evidence of a high salary or other significantly high remuneration for services in relation to others in the field",
    hint: "State your compensation, compare to field median (BLS or published surveys), explain what percentile you are in.",
  },
  {
    id: "commercial_success",
    label: "Commercial Success in the Performing Arts",
    desc: "Evidence of commercial successes in the performing arts",
    hint: "Box office figures, album sales, streaming numbers, ticket revenue — compared to field averages.",
  },
];

const NIW_CRITERIA = [
  {
    id: "prong1",
    label: "Prong 1 — Substantial Merit and National Importance",
    desc: "The proposed endeavor has both substantial merit and national importance",
    hint: "Describe your proposed work/research. Why is it important nationally? What problem does it solve? Include field significance and US-specific impact (health, economy, security, STEM, etc.).",
  },
  {
    id: "prong2",
    label: "Prong 2 — Well Positioned to Advance the Endeavor",
    desc: "The petitioner is well positioned to advance the proposed endeavor",
    hint: "Evidence of your qualifications: education, publications, citations, patents, prior results, letters from experts, recognition, grants, institutional affiliations.",
  },
  {
    id: "prong3",
    label: "Prong 3 — Balance of National Interest Favors Waiving Job Offer",
    desc: "On balance, it would be beneficial to the United States to waive the job offer and labor certification requirements",
    hint: "Why should USCIS waive the normal requirements? E.g., critical shortage, unique expertise unavailable in the US workforce, urgency of the work, existing US employer/collaborators.",
  },
];

// ── Step navigation ────────────────────────────────────────────────────────
function goTo(step) {
  if (step === 3) populateCriteria();
  if (step === 4) populateEvidenceFields();
  if (step === 5) populateSummary();

  document.getElementById(`section-${state.currentStep}`).classList.add("hidden");
  document.getElementById(`section-${step}`).classList.remove("hidden");

  document.querySelectorAll(".step").forEach((el) => {
    const s = parseInt(el.dataset.step);
    el.classList.remove("active", "done");
    if (s === step) el.classList.add("active");
    else if (s < step) el.classList.add("done");
  });

  state.currentStep = step;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Step 1: Type selection ─────────────────────────────────────────────────
function selectType(type) {
  state.petitionType = type;
  state.selectedCriteria.clear();

  document.querySelectorAll(".type-card").forEach((c) => c.classList.remove("selected"));
  document.getElementById(`type-${type}`).classList.add("selected");
  document.getElementById("btn-step1").disabled = false;
}

// ── Step 3: Criteria ───────────────────────────────────────────────────────
function populateCriteria() {
  const criteria = state.petitionType === "EB1A" ? EB1A_CRITERIA : NIW_CRITERIA;
  const heading = document.getElementById("criteria-heading");
  const subtext = document.getElementById("criteria-subtext");
  const list = document.getElementById("criteria-list");

  if (state.petitionType === "EB1A") {
    heading.textContent = "Select the EB-1A criteria you meet";
    subtext.textContent = "You must meet at least 3 of the 10 criteria below. Select all that apply to you.";
  } else {
    heading.textContent = "Provide evidence for the NIW Dhanasar framework";
    subtext.textContent = "You must address all 3 prongs. All are required and pre-selected.";
    // For NIW, pre-select all 3
    criteria.forEach((c) => state.selectedCriteria.add(c.id));
  }

  list.innerHTML = criteria
    .map((c) => {
      const checked = state.selectedCriteria.has(c.id);
      const disabled = state.petitionType === "NIW" ? "disabled" : "";
      return `
      <div class="criterion-item ${checked ? "selected" : ""}" onclick="${state.petitionType === "EB1A" ? `toggleCriterion('${c.id}', this)` : ""}">
        <input type="checkbox" id="chk-${c.id}" ${checked ? "checked" : ""} ${disabled} />
        <div class="criterion-text">
          <strong>${c.label}</strong>
          <span>${c.desc}</span>
        </div>
      </div>`;
    })
    .join("");

  updateStep3Button();
}

function toggleCriterion(id, el) {
  const chk = document.getElementById(`chk-${id}`);
  if (state.selectedCriteria.has(id)) {
    state.selectedCriteria.delete(id);
    chk.checked = false;
    el.classList.remove("selected");
  } else {
    state.selectedCriteria.add(id);
    chk.checked = true;
    el.classList.add("selected");
  }
  updateStep3Button();
}

function updateStep3Button() {
  const min = state.petitionType === "EB1A" ? 3 : 3;
  document.getElementById("btn-step3").disabled = state.selectedCriteria.size < min;
}

// ── Step 4: Evidence fields ────────────────────────────────────────────────
function populateEvidenceFields() {
  const criteria = state.petitionType === "EB1A" ? EB1A_CRITERIA : NIW_CRITERIA;
  const selected = criteria.filter((c) => state.selectedCriteria.has(c.id));
  const container = document.getElementById("evidence-fields");

  container.innerHTML = selected
    .map(
      (c) => `
    <div class="evidence-field">
      <label>${c.label}</label>
      <p class="hint">${c.hint}</p>
      <textarea id="ev-${c.id}" rows="5" placeholder="Describe your specific evidence here..."></textarea>
    </div>`
    )
    .join("");
}

// ── Step 5: Summary + generation ──────────────────────────────────────────
function populateSummary() {
  const name = document.getElementById("full_name").value.trim() || "you";
  document.getElementById("summary-type").textContent =
    state.petitionType === "EB1A" ? "EB-1A Extraordinary Ability" : "NIW National Interest Waiver";
  document.getElementById("summary-name").textContent = name;

  // Reset output area
  document.getElementById("generate-prompt").classList.remove("hidden");
  document.getElementById("generating-indicator").classList.add("hidden");
  document.getElementById("output-area").classList.add("hidden");
  document.getElementById("petition-output").textContent = "";
  state.outputText = "";
}

// ── Generate petition ──────────────────────────────────────────────────────
async function generatePetition() {
  const criteria = state.petitionType === "EB1A" ? EB1A_CRITERIA : NIW_CRITERIA;
  const selectedCriteria = criteria
    .filter((c) => state.selectedCriteria.has(c.id))
    .map((c) => ({
      criterion_id: c.id,
      criterion_label: c.label,
      evidence: (document.getElementById(`ev-${c.id}`) || {}).value || "",
    }));

  const payload = {
    petition_type: state.petitionType,
    full_name: document.getElementById("full_name").value.trim(),
    field: document.getElementById("field").value.trim(),
    country: document.getElementById("country").value.trim(),
    current_role: document.getElementById("current_role").value.trim(),
    institution: document.getElementById("institution").value.trim(),
    additional_context: document.getElementById("additional_context").value.trim(),
    criteria: selectedCriteria,
  };

  document.getElementById("generate-prompt").classList.add("hidden");
  document.getElementById("generating-indicator").classList.remove("hidden");
  document.getElementById("output-area").classList.add("hidden");

  const outputEl = document.getElementById("petition-output");
  outputEl.textContent = "";
  state.outputText = "";

  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    document.getElementById("generating-indicator").classList.add("hidden");
    document.getElementById("output-area").classList.remove("hidden");

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
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              state.outputText += parsed.text;
              outputEl.textContent = state.outputText;
            }
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    document.getElementById("generating-indicator").classList.add("hidden");
    document.getElementById("generate-prompt").classList.remove("hidden");
    alert(`Error generating petition: ${err.message}\n\nMake sure ANTHROPIC_API_KEY is set.`);
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
  const name = (document.getElementById("full_name").value.trim() || "petition").replace(/\s+/g, "_");
  const blob = new Blob([state.outputText], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}_${state.petitionType}_petition.txt`;
  a.click();
}

function regenerate() {
  document.getElementById("output-area").classList.add("hidden");
  document.getElementById("generate-prompt").classList.remove("hidden");
}
