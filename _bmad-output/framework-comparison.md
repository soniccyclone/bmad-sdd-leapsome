# Framework Comparison: BMAD vs Alternative Methodologies

> An honest assessment of the BMAD spec-driven approach compared to other development methodologies, based on firsthand experience building the Todo app.

---

## Methodologies Compared

| Methodology | Core Idea |
|---|---|
| **BMAD (Spec-Driven)** | Agent-driven workflow: structured brainstorming → adversarial review → spec artifacts → implementation from spec |
| **Traditional Waterfall** | Sequential phases: requirements → design → implementation → testing → deployment |
| **Ad-hoc AI-Assisted** | "Just ask Claude to build it" — conversational development without structured methodology |
| **TDD-First** | Write tests before code, let tests drive design |
| **Agile/Scrum (no AI)** | Iterative sprints with human-driven ceremonies, stories, and retrospectives |

---

## Detailed Comparison

### BMAD vs Traditional Waterfall

**Similarities:**
- Both produce specification documents before code
- Both have a sequential phase structure (requirements → architecture → implementation)
- Both value documentation as a first-class artifact

**Where BMAD wins:**
- **Adversarial review catches spec rot.** Waterfall specs are written once and assumed correct. BMAD specs go through multiple review cycles (adversarial + edge case hunter) that surface gaps before implementation. Our PRD had 14 gaps found by adversarial review and 13 unhandled paths found by edge case hunter — these would have been discovered during implementation in waterfall.
- **Iteration within phases.** Waterfall moves forward linearly. BMAD iterates within each phase — the architecture doc was reviewed, fixed, reviewed again, fixed again — before implementation started.
- **AI agents catch what humans miss.** The party mode roundtable produced 4 independent perspectives simultaneously. Getting equivalent feedback in waterfall requires scheduling meetings with 4 busy humans.

**Where waterfall wins:**
- **Simpler process.** Waterfall doesn't require learning a framework of skills, personas, and review types. You just write docs and build.
- **Human judgment in reviews.** BMAD reviews are thorough but formulaic. A senior human reviewer brings domain knowledge and institutional context that AI agents lack.

### BMAD vs Ad-hoc AI-Assisted ("Just Build It")

**The ad-hoc approach:** Open Claude Code, describe what you want, let the AI build it. No spec documents, no review cycles, no structured brainstorming.

**Where BMAD wins decisively:**
- **Decision documentation.** After ad-hoc AI development, you have working code but no record of *why* any decision was made. BMAD produced 12 ADRs with rationale and rejected alternatives. When someone asks "why Fastify over Express?" in 6 months, the answer is in the architecture doc.
- **Error prevention.** The adversarial and edge case reviews found 71 issues across 4 documents. In ad-hoc development, these issues surface as bugs during implementation or production incidents. The pagination tiebreaker bug (non-deterministic ordering when timestamps collide) would have been an intermittent production issue.
- **Scope control.** The brainstorming session resolved scope explicitly — the exclusion list prevents scope creep. Ad-hoc AI development tends to accumulate features ("while you're at it, add search...").

**Where ad-hoc wins:**
- **Speed to first working version.** An experienced developer with Claude Code can have a working Todo app in 30 minutes. BMAD's Step 1 (spec phase) took longer than that.
- **Low ceremony for simple projects.** A Todo app arguably doesn't *need* 12 ADRs, 43 stories, and 4 review cycles. The methodology's overhead exceeds the project's complexity.
- **Exploration.** When you don't know what you're building yet, ad-hoc conversation is better than trying to spec something you don't understand.

### BMAD vs TDD-First

**Where BMAD wins:**
- **Architecture decisions before test design.** TDD writes tests for the first thing you think of, which may not be the right thing. BMAD's brainstorming + party mode ensures you're testing the right design, not just the first design.
- **Spec-level validation.** TDD validates code against tests. BMAD validates specs against adversarial review before any code or tests exist. The PRD's unmeasurable success criteria ("clarity of experience") would have produced vague TDD tests.

**Where TDD wins:**
- **Tests exist from the start.** BMAD's implementation phase produced code with thin test coverage in the middle of the pyramid (unit + E2E but few integration/component tests). TDD would have produced tests alongside every line of code.
- **Design feedback loop.** TDD's red-green-refactor cycle gives immediate design feedback. BMAD's spec phase produces design feedback before code, but the implementation phase loses that tight loop.
- **Simpler for small scope.** For a 5-endpoint CRUD API, TDD is arguably the right granularity. BMAD's review cycles are designed for more complex systems where spec-level bugs are expensive.

**Best combination:** BMAD for the spec phase (what to build and why), TDD for the implementation phase (how to build it and prove it works). The test strategy document bridges the two.

### BMAD vs Agile/Scrum (Without AI)

**Where BMAD wins:**
- **Instant multi-perspective review.** A party mode session with 4 agent personas takes minutes. An equivalent architecture review meeting requires scheduling 4 humans, preparing materials, facilitating the meeting, and documenting outcomes.
- **Automated quality gates.** Adversarial review, edge case hunter, and spec-lint run on demand. In Scrum, quality depends on the reviewer's attention and available time.
- **Story generation with dependency chains.** BMAD produced 43 stories with acceptance criteria and 50+ dependency links in one session. A human Scrum team would spend several sprint planning sessions to produce equivalent output.

**Where Scrum wins:**
- **Human creativity and domain expertise.** AI agents produce thorough but predictable analysis. Human team members bring unexpected insights from experience with similar products, customer conversations, and domain knowledge.
- **Stakeholder alignment.** Scrum ceremonies (sprint reviews, demos) align stakeholders through shared understanding. BMAD produces documents that stakeholders must read — reading is not alignment.
- **Adaptive planning.** Scrum's sprint retrospectives and velocity tracking enable adaptive planning based on real execution data. BMAD's spec phase assumes you can predict the work accurately before starting.

---

## Where BMAD Excels

1. **Spec quality.** The refined PRD and architecture doc are dramatically better than what most teams produce. Every decision is documented with rationale, every edge case is identified, every error state is specified.

2. **Review thoroughness.** 71 findings across 4 documents, all addressed before implementation. This is more thorough than most human review processes.

3. **Decision documentation.** 12 ADRs with "alternatives considered" sections. Future developers can understand not just what was chosen, but what was rejected and why.

4. **Parallelization.** Three subagents building backend, frontend, and CI simultaneously is genuinely faster than sequential human development.

## Where BMAD Adds Overhead

1. **Review cycles for simple artifacts.** The architecture doc went through adversarial review (12 findings) then edge case review (12 findings). Some findings were trivial (missing `.env` strategy). For a Todo app, this level of scrutiny exceeds the project's risk profile.

2. **Brainstorming depth.** 22+ decisions through 3 structured techniques is thorough but heavy for a CRUD app. A senior developer makes most of these decisions implicitly without needing Question Storming.

3. **Story granularity.** 43 issues for a Todo app is arguably over-decomposed. A pragmatic team would have 5-8 stories, not 43.

4. **Multiple review types.** Adversarial review and edge case hunter overlap — both found issues with the sanitization pipeline, both flagged Docker configuration gaps. The orthogonality is theoretical; in practice, they duplicate ~20% of findings.

## When to Choose BMAD

| Scenario | BMAD? | Why |
|---|---|---|
| Complex system with many stakeholders | Yes | Spec quality and decision documentation pay for themselves |
| Greenfield project with unclear requirements | Partially | Brainstorming and party mode for discovery, lighter review cycles |
| Simple CRUD app / prototype | No | Overhead exceeds value; ad-hoc AI + TDD is faster |
| Team onboarding onto existing system | Yes | BMAD artifacts (ADRs, architecture doc) are excellent onboarding material |
| Regulatory / compliance requirements | Yes | Documented decisions, review trails, and traceability |
| Solo developer, well-understood domain | No | The developer IS the architect, PM, and QA — personas add no new perspective |
| AI-assisted development at scale | Yes | Structured prompts produce better AI output than ad-hoc conversation |

---

## Verdict

BMAD is a methodology designed for systems where spec-level bugs are expensive and decision documentation matters. For this Todo app, the methodology's rigor exceeded the project's complexity — but the resulting artifacts (PRD, architecture doc, ADRs, test strategy) are genuinely high quality and would serve a team well if the project grew.

The most valuable BMAD skills were **adversarial review** (catches real issues, not just style nits) and **party mode** (produces genuine disagreement, not performative consensus). The least valuable for this project's scope was the full brainstorming session — a direct conversation would have reached the same decisions faster.

The ideal application of BMAD is a system complex enough to justify the review overhead, with multiple stakeholders who benefit from documented decisions, and an AI-assisted implementation team that can execute from detailed specs. For simpler projects, cherry-pick the skills that add value (adversarial review, party mode) without running the full workflow.
