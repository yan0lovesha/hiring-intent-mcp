# B2B Hiring Intent & 9-ATS Tech-Stack Signals MCP (`b2b-hiring-intent-mcp`)

[![CI](https://github.com/yan0lovesha/hiring-intent-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/yan0lovesha/hiring-intent-mcp/actions/workflows/ci.yml)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.yan0lovesha%2Fhiring--intent--mcp-purple.svg)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.yan0lovesha%2Fhiring-intent-mcp)
[![Glama MCP](https://glama.ai/mcp/servers/yan0lovesha/hiring-intent-mcp/badges/score.svg)](https://glama.ai/mcp/servers/yan0lovesha/hiring-intent-mcp)
[![TensorBlock Awesome MCP](https://img.shields.io/badge/TensorBlock-Awesome_MCP_Indexed-orange.svg)](https://github.com/TensorBlock/awesome-mcp-servers/blob/main/docs/marketing-sales--crm.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](./package.json)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)](./package.json)

> **Zero-dependency Model Context Protocol (MCP) Server & CLI (`v1.3.0`)** for real-time **9-ATS career board probing** (**Greenhouse**, **Lever**, **Ashby**, **Personio**, **Teamtailor**, **SmartRecruiters**, **Workable**, **Recruitee**, **Pinpoint**), **multi-account buying dossiers**, **B2B tech-stack footprints**, **disclosed USD/EUR salary & equity bands**, and **signal-driven outbound sequences** — backed by **16 production Cloud Pay-Per-Event APIs** (`https://mcp.apify.com/?tools=yan0lovesha/multi-ats-jobs-hiring-intent`) and **Agensi AI Agent Outbound Skills** for Clay, n8n, Make, and autonomous AI Agents.

---

## Supported 9-ATS Real-Time Probing (Paste Any Career URL!)

| ATS Platform | Auto-Detected Career URLs | Native Compensation & Intelligence |
| :--- | :--- | :--- |
| **Greenhouse** *(New in v1.1)* | `boards.greenhouse.io/*`, `job-boards.greenhouse.io/*` | Native `?pay_transparency=true` (`pay_input_ranges`), offices, departments & tech stack |
| **Lever** *(New in v1.1)* | `jobs.lever.co/*`, `jobs.eu.lever.co/*` | Structured `salaryRange` (`USD`/interval), `categories` & full requirements `lists` |
| **Ashby** | `jobs.ashbyhq.com/*` | Structured USD Salary + Equity tiers (`?includeCompensation=true`) |
| **Personio** | `*.jobs.personio.de`, `*.jobs.personio.com` | EU/DACH multi-language XML position feed + office & department signals |
| **Teamtailor** | `*.teamtailor.com` | Nordics/UK `xmlns:tt` RSS feed with multi-city locations & department tags |
| **SmartRecruiters** | `careers.smartrecruiters.com/*`, `jobs.smartrecruiters.com/*` | Global enterprise postings API |
| **Workable** | `apply.workable.com/*`, `*.workable.com` | Single-request widget details feed |
| **Recruitee (Tellent)** | `*.recruitee.com` | `/api/offers` structured salary & remote/hybrid flags |
| **Pinpoint** | `*.pinpointhq.com` | `/postings.json` with direct Hiring Manager `reportingTo` line |

---

## Quick Start (Local MCP Server — Zero Dependencies, Node 20+ or Docker)

### 1. Instant 1-Click Career URL Scan (`--url`)
```bash
# Auto-detects Greenhouse, Lever, Ashby, Personio, Teamtailor, Workable, Recruitee, Pinpoint, or SmartRecruiters!
node bin/b2b-hiring-intent-mcp.mjs --cli --url https://boards.greenhouse.io/figma --max 4
node bin/b2b-hiring-intent-mcp.mjs --cli --url https://jobs.lever.co/zoox --max 4
node bin/b2b-hiring-intent-mcp.mjs --cli --url https://jobs.ashbyhq.com/ramp --max 4

# Or pass explicit --platform & --target slug
node bin/b2b-hiring-intent-mcp.mjs --cli --platform personio --target adsquare --max 4
node bin/b2b-hiring-intent-mcp.mjs --cli --platform teamtailor --target puzzel --max 4
```

### 2. Add to Claude Desktop / Cursor / VS Code Copilot (`mcp.json`)

**Option A — Hosted Remote Streamable HTTP (Zero Local Install via Apify MCP Gateway):**
```json
{
  "mcpServers": {
    "b2b-hiring-intent-cloud": {
      "type": "streamable-http",
      "url": "https://mcp.apify.com/?tools=yan0lovesha/multi-ats-jobs-hiring-intent",
      "headers": {
        "Authorization": "Bearer <YOUR_APIFY_TOKEN>"
      }
    }
  }
}
```

**Option B — Local Zero-Dependency Stdio Server (Free Interactive Probing):**
```json
{
  "mcpServers": {
    "b2b-hiring-intent": {
      "command": "node",
      "args": ["/path/to/hiring-intent-mcp/bin/b2b-hiring-intent-mcp.mjs"]
    }
  }
}
```

Or run via **Docker** (`node:22-alpine`, non-root `node` user):
```bash
docker build -t b2b-hiring-intent-mcp .
docker run -i --rm b2b-hiring-intent-mcp
```

### 3. Live Interactive Signal Radar Demo
Open [`demo/index.html`](./demo/index.html) in any browser to filter 50+ real scraped hiring signals by tech stack (`AWS`, `Kubernetes`, `Snowflake`, `dbt`, `Salesforce`, `HubSpot`, `Terraform`, `OpenAI`), inspect 25 executive account dossiers, and generate 1-click Cold Email icebreakers.

---

## Need Scheduled Batch Scale (100–10,000+ Targets), XML-404 Fallbacks, or US Permit/FDA/Clinic Leads?

The local open-core MCP server is ideal for inspecting 1–5 companies interactively. For **Clay.com waterfalls**, **scheduled n8n / Make outbound pipelines**, **custom career page ATS fingerprinting**, **Account-Level Company Dossiers**, and **US Federal/Municipal High-Ticket Lead Registries**, use our **16 Cloud Pay-Per-Event + Hosted MCP APIs on Apify Store** (`LIMITED_PERMISSIONS` native, pennies per run, zero monthly subscription):

👉 **Full Publisher Catalog**: **[https://apify.com/yan0lovesha](https://apify.com/yan0lovesha)**

| # | Production Cloud API (Apify Store + Hosted MCP) | Target Market & Coverage | Key Intelligence Extracted |
| :-: | :--- | :--- | :--- |
| ⭐ | [**Greenhouse, Lever & Ashby Multi-ATS Hiring Intent API**](https://apify.com/yan0lovesha/multi-ats-jobs-hiring-intent) | **All 9 ATS Platforms Unified** (`Figma`, `Datadog`, `Zoox`, `Spotify`, `Ramp`, `Linear`+) | **Flagship 1-Click Mixed URL Feed**: unified schema, `pay_transparency` salary/equity, 125+ tech-stack tools & Company Dossiers |
| 1 | [**Greenhouse Jobs, Salary & B2B Hiring Intent API**](https://apify.com/yan0lovesha/greenhouse-jobs-hiring-intent) | Global Unicorns & Public SaaS (`Cloudflare`, `Stripe`, `Datadog`, `Figma`) | Native `?pay_transparency=true` salary bands, departments, 125+ tech-stack tags & Company Dossiers |
| 2 | [**Lever Jobs, Salary & B2B Hiring Intent API**](https://apify.com/yan0lovesha/lever-jobs-hiring-intent) | Growth Tech, FinTech & Mobility (`Zoox`, `Outreach`, `Spotify`, `Veeva`) | Structured `salaryRange`, full requirement `lists`, 0–100 intent scores & SDR hooks |
| 3 | [**Ashby Jobs, Salary & B2B Hiring Intent API**](https://apify.com/yan0lovesha/ashby-jobs-hiring-intent) | North America YC & AI Unicorns (`OpenAI`, `Ramp`, `Linear`, `Vanta`, `Cohere`) | Structured USD Salary + Equity tiers, 125+ tech-stack tools, 0–100 score & Company Dossiers |
| 4 | [**Personio Jobs & B2B Hiring Intent API**](https://apify.com/yan0lovesha/personio-jobs-hiring-intent) | DACH & Europe #1 HR/ATS (14,000+ companies) | Dual-channel XML + `/search.json` + JSON-LD fallback (solves XML 404s) + EU 2026 salary bands |
| 5 | [**Teamtailor Jobs & B2B Hiring Signal API**](https://apify.com/yan0lovesha/teamtailor-jobs-hiring-signal) | UK & Nordics #1 ATS (10,000+ companies) | Multi-office `xmlns:tt` RSS + custom-domain JSON-LD fallback + SDR cold outreach hooks |
| 6 | [**SmartRecruiters Enterprise Hiring Intent API**](https://apify.com/yan0lovesha/smartrecruiters-jobs-hiring-intent) | Global Enterprises (`Bosch`, `ServiceNow`, `Canva`, `Delivery Hero`) | Two-stage Listing + Full `jobAd` sections, compensation & enterprise tech-stack signals |
| 7 | [**Workable Jobs & B2B Hiring Intent API**](https://apify.com/yan0lovesha/workable-jobs-hiring-intent) | Global Mid-Market & SaaS (27,000+ companies) | Sub-second single-request full JD extraction + v3/v2 fallback + Account Dossiers |
| 8 | [**Recruitee (Tellent) Hiring Intent API**](https://apify.com/yan0lovesha/recruitee-jobs-hiring-intent) | Benelux, DACH & EU Scaleups (5,000+ companies) | Full `/api/offers` structured salary, hybrid/remote flags & 125+ tech-stack extractor |
| 9 | [**Pinpoint ATS Hiring Manager & Intent API**](https://apify.com/yan0lovesha/pinpoint-jobs-hiring-intent) | Enterprise & Digital Health (`SmartThings`, `Digital Science`, `Article`) | Direct Hiring Manager reporting line (`reportingTo`) + placeholder-board protection |
| 10 | [**US Building, Solar & Roofing Permits Leads API**](https://apify.com/yan0lovesha/us-building-solar-permits-leads) | US Municipal Socrata Open Data (`Seattle`, `Austin`, `Chicago`) | Commercial construction, Solar PV/Battery & Roofing permits with **Contractor Phones & Project Valuations ($)** |
| 11 | [**US FMCSA Trucking Fleets & DOT Owners API**](https://apify.com/yan0lovesha/us-fmcsa-trucking-fleet-leads) | US DOT FMCSA Motor Carrier Census | Commercial fleet power units, safety status, **Named DOT Principals & Insurance Leads** |
| 12 | [**US Federal Contract Awards & GovCon Leads API**](https://apify.com/yan0lovesha/us-federal-contracts-awards-leads) | Official US Federal USAspending Awards Feed | Newly awarded federal prime contractors, **Award Amounts ($), NAICS & Agency Buyers** |
| 13 | [**US Medical & Dental Clinic Owners Leads API**](https://apify.com/yan0lovesha/us-npi-medical-dental-clinics-leads) | US Federal HHS CMS NPPES NPI-2 Registry (All 50 States) | Private Dental, MedSpa/Derm, Chiropractic & Mental Health **Clinic Owners + Direct Phone Numbers** |
| 14 | [**FDA 510(k) Cleared Medical Device Leads API**](https://apify.com/yan0lovesha/fda-510k-medical-device-leads) | Official US FDA openFDA 510(k) `SESE` Clearances | Newly cleared MedTech manufacturers, **Named Regulatory Contacts**, addresses & SaMD/AI flags |
| 15 | [**US Licensed HVAC, Electrical & General Contractor Leads API**](https://apify.com/yan0lovesha/us-contractor-licenses-leads) | US State Contractor Licensing Boards | Active licensed commercial HVAC, electrical, plumbing & general contractors with direct contacts |

---

## Turn Signals into Outbound Sequences, Clay Formulas & `n8n` Workflows (Agent Skills)

Using **Claude Code, Cursor, GitHub Copilot, Codex CLI, Windsurf, or OpenClaw**?
1. **Free 9-ATS Hiring Intent Radar Skill (Bundled in [`skills/b2b-hiring-intent-radar`](./skills/b2b-hiring-intent-radar) & [Agensi Store](https://www.agensi.io/skills/b2b-hiring-intent-125-tech-stack-radar-9-global-ats)):**
   ```bash
   npx skills add yan0lovesha/hiring-intent-mcp
   ```
2. **Pro Outbound Execution Engine on [Agensi](https://www.agensi.io/creators/yan0lovesha):**
   - **[B2B Signal-to-Cold-Email Autopilot Pro (Clay + n8n)](https://www.agensi.io/skills/b2b-signal-to-cold-email-autopilot-pro-clay-n8n)** — Converts raw ATS, permit, NPI clinic, and FDA 510(k) signals into **CFO / VP Eng / RevOps 3-touch plain-text sequences** (verified by a 16-rule `<=75w` anti-AI-slop linter), **Clay `intentScore >= 60` 70% credit-saver formulas**, and **import-ready `n8n` workflow JSON**.

---

## MCP Tools Exposed (5 Zero-Dependency Operational Tools)

1. **`scan_company_hiring_intent`**:
   - Parameters: `url` *(career URL — auto-detects any of the 9 ATS platforms)*, or `platform` (`greenhouse` | `lever` | `ashby` | `personio` | `teamtailor` | `smartrecruiters` | `workable` | `recruitee` | `pinpoint` | `auto`) + `target` *(board slug)*, `maxJobs` *(1–10, default 5)*.
   - Returns: Open roles enriched with `intentScore` (`0–100`), `intentTier` (`HOT` | `WARM` | `MONITOR`), `techStackAll`, `signalCodes`, `disclosedSalary`, and ready-to-send `outreachHook`.
2. **`compare_companies_hiring_intent`**:
   - Parameters: `targets` *(array of 1–5 career URLs, `platform:slug` entries, or company slugs)*, `maxJobsPerCompany` *(1–8, default 4)*.
   - Returns: Ranked Account Buying Dossiers sorted by `maxIntentScore` and `hotRoleCount`, with `accountTier`, `executiveRoles`, `aggregatedTechStack`, `topDisclosedSalary`, and `recommendedOutreachHook`.
3. **`detect_company_ats_board`**:
   - Parameters: `input` *(career URL or company slug)*, `probeLive` *(boolean, default `true`)*.
   - Returns: Detected ATS platform(s), live board reachability, sampled open role titles, and compensation disclosure status across the 9 supported ATS endpoints.
4. **`generate_signal_outreach_sequence`**:
   - Parameters: `companyName`, `roleTitle`, `techStack` *(optional array)*, `disclosedSalary` *(optional)*, `buyerPersona` (`vp_engineering` | `cfo_finance` | `revops_gtm`), `valueProposition` *(optional)*.
   - Returns: Concise 3-touch plain-text B2B outbound email sequence (`<= 75` words per email) plus a ready-to-paste Clay credit-saver filter formula.
5. **`list_cloud_b2b_lead_apis`**:
   - Parameters: `category` (`all` | `ats_hiring_intent` | `us_permits_contractors` | `us_fleet_govcon` | `us_healthcare_fda`).
   - Returns: All 16 hosted Pay-Per-Event Apify Store Actors with `https://mcp.apify.com` `streamable-http` URLs, synchronous REST endpoints, Official MCP Registry & Glama links, and Agensi AI Agent Skill links.

---

## Feedback, Custom ATS Connectors & Enterprise Integration

Have a question, want a new ATS/data source supported, or need a custom Clay / `n8n` outbound pipeline?
- Open a thread in **[GitHub Discussions](https://github.com/yan0lovesha/hiring-intent-mcp/discussions)** or file an **[Issue](https://github.com/yan0lovesha/hiring-intent-mcp/issues)**.

---

## License

MIT © Ling Yan (`@yan0lovesha`)
