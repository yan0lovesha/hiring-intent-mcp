# B2B Hiring Intent & Tech-Stack Radar (`b2b-hiring-intent-radar`)

Zero-dependency AI Agent Skill for **Claude Code, Cursor, GitHub Copilot, Codex CLI, Windsurf, OpenCode, OpenClaw, and 20+ SKILL.md-compatible agents**.

Ask your agent *"Analyze Ramp, Cloudflare, and adsquare's tech stack and hiring buying signals"* and it pulls live public career feeds across **9 global ATS platforms**, tags **125+ enterprise software tools**, extracts **disclosed salary bands**, computes a **`0–100` buying-intent score**, and drafts **evidence-backed sales icebreakers** in seconds.

---

## Key Capabilities

- **9 Global ATS Platforms Out of the Box (`--platform auto`):**
  Greenhouse, Lever, Ashby, Personio (DACH/EU), Teamtailor (UK/Nordics), SmartRecruiters, Workable, Recruitee, and Pinpoint.
- **125+ Enterprise Tech-Stack Tags Across 8 Categories:**
  Cloud & Infra, Data & Analytics, AI & LLM, Engineering & DevTools, Security & Compliance, CRM/GTM/RevOps, ERP & FinTech, and Collaboration/HRIS.
- **Disclosed Salary & Equity Extraction:**
  Parses structured compensation JSON (`Ashby`, `Greenhouse`, `Lever`, `Pinpoint`) plus inline USD/EUR/GBP pay-transparency bands.
- **Deterministic `0–100` Intent Score & Economic Buyer Routing:**
  Flags `NEW_LEADERSHIP_DECISION_MAKER`, `TECH_MIGRATION_MODERNIZATION`, `AI_TRANSFORMATION_INITIATIVE`, `SECURITY_COMPLIANCE_MANDATE`, `BUDGET_HYPERGROWTH`, and `REVOPS_GTM_SCALE`.
- **Seamless Cloud Scale (`10+` Accounts, Workday Fortune 500 & 19 Cloud PPE APIs):**
  Built-in offline catalog (`--cloud-catalog`) and Hosted MCP recipes for **[Apify Store (@yan0lovesha)](https://apify.com/yan0lovesha)** covering 100–10,000+ account scheduled scans (including flagship 10-ATS unified `multi-ats-jobs-hiring-intent` and `workday-jobs-scraper`), Website Contact & Work Email Finder, LinkedIn & Google Ads Spy, Apple App Store Reviews, plus US FMCSA Trucking Fleets, Federal Contract Awards, NPI Medical/Dental Clinics, and FDA 510(k) Medical Device leads.

---

## Package Contents

- `SKILL.md` — Trigger-tuned multi-agent instructions and output specification.
- `scripts/ats_intent_radar.py` — Pure Python 3.9+ standard-library live 9-ATS radar scanner (zero `pip install`, strict ATS host allowlist).
- `reference/ats-endpoints-and-cloud-apis.md` — 9-ATS endpoint guide, slug discovery tips, and Apify Cloud Pay-Per-Event + Hosted MCP integration guide.
- `reference/tech-stack-and-intent-rubric.md` — Complete 125+ tool taxonomy and 0–100 scoring rubric.
- `examples/sample-radar-output.json` — Verified live multi-ATS output sample.

---

## Example Agent Prompts

1. `"Analyze Ramp, Cloudflare, and adsquare's live tech stack, disclosed salaries, and B2B hiring buying signals."`
2. `"Scan Vanta and Linear on Ashby for security or infrastructure hiring intent and draft CTO icebreakers."`
3. `"We sell MedTech QMS and healthcare SaaS — show me how to pull FDA 510(k) cleared device manufacturers and NPI dental/MedSpa clinics at scale."`

---

## Requirements

- **Python 3.9+** (standard library only; zero external dependencies, zero API keys required for interactive scans).
- **Want Turnkey Multi-Touch Cold Email Sequences + Clay Formulas + n8n Workflows?** Pair this free radar with **[B2B Signal-to-Cold-Email Autopilot Pro](https://www.agensi.io/skills/b2b-signal-to-cold-email-autopilot-pro-clay-n8n)** on Agensi.
