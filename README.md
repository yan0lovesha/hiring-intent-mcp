# B2B Hiring Intent & 10-ATS Tech-Stack Signals MCP (`b2b-hiring-intent-mcp`)

[![CI](https://github.com/yan0lovesha/hiring-intent-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/yan0lovesha/hiring-intent-mcp/actions/workflows/ci.yml)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.yan0lovesha%2Fhiring--intent--mcp-purple.svg)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.yan0lovesha%2Fhiring-intent-mcp)
[![Glama MCP](https://glama.ai/mcp/servers/yan0lovesha/hiring-intent-mcp/badges/score.svg)](https://glama.ai/mcp/servers/yan0lovesha/hiring-intent-mcp)
[![TensorBlock Awesome MCP](https://img.shields.io/badge/TensorBlock-Awesome_MCP_Indexed-orange.svg)](https://github.com/TensorBlock/awesome-mcp-servers/blob/main/docs/marketing-sales--crm.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](./package.json)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)](./package.json)

> **Zero-dependency Model Context Protocol (MCP) Server & CLI (`v1.4.0`)** for real-time **10-ATS career board probing** (**Workday**, **Greenhouse**, **Lever**, **Ashby**, **Personio**, **Teamtailor**, **SmartRecruiters**, **Workable**, **Recruitee**, **Pinpoint**), **multi-account buying dossiers**, **B2B tech-stack footprints**, **disclosed USD/EUR salary & equity bands**, and **signal-driven outbound sequences** — backed by **19 production Cloud Pay-Per-Event APIs** (`https://mcp.apify.com/?tools=yan0lovesha/multi-ats-jobs-hiring-intent`) and **Agensi AI Agent Outbound Skills** for Clay, n8n, Make, and autonomous AI Agents.

---

## Zero-Clone 10-Second Quick Start (`npx` or Hosted Remote MCP)

No `git clone`, zero npm dependencies, and zero API keys required for interactive 10-ATS scans!

### 1. Run Instantly from Terminal (`npx -y github:yan0lovesha/hiring-intent-mcp`)
```bash
# Inspect CLI options & MCP endpoints
npx -y github:yan0lovesha/hiring-intent-mcp --help

# Auto-detect & scan any Workday, Greenhouse, Lever, Ashby, Personio, Teamtailor, Workable, Recruitee, Pinpoint, or SmartRecruiters URL
npx -y github:yan0lovesha/hiring-intent-mcp --cli --url https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite --max 4
npx -y github:yan0lovesha/hiring-intent-mcp --cli --url https://boards.greenhouse.io/figma --max 4
npx -y github:yan0lovesha/hiring-intent-mcp --cli --url https://jobs.lever.co/zoox --max 4
npx -y github:yan0lovesha/hiring-intent-mcp --cli --url https://jobs.ashbyhq.com/ramp --max 4
```

### 2. Copy-Paste MCP Config (Claude Desktop, Cursor & VS Code Copilot)

**Option A — Zero-Install Local Stdio MCP (`claude_desktop_config.json` / `.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "b2b-hiring-intent": {
      "command": "npx",
      "args": ["-y", "github:yan0lovesha/hiring-intent-mcp"]
    }
  }
}
```

**VS Code GitHub Copilot (`.vscode/mcp.json`):**
```json
{
  "servers": {
    "b2b-hiring-intent": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:yan0lovesha/hiring-intent-mcp"]
    }
  }
}
```

**Option B — Apify Hosted Remote MCP (`streamable-http` for 100–10,000+ Batch Scale & Cloud APIs):**
```json
{
  "mcpServers": {
    "b2b-hiring-intent-cloud": {
      "type": "streamable-http",
      "url": "https://mcp.apify.com/?tools=yan0lovesha/multi-ats-jobs-hiring-intent,yan0lovesha/workday-jobs-scraper,yan0lovesha/google-ads-transparency-scraper,yan0lovesha/website-contact-email-finder",
      "headers": {
        "Authorization": "Bearer <YOUR_APIFY_TOKEN>"
      }
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

## Supported 10-ATS Real-Time Probing (Paste Any Career URL!)

| ATS Platform | Auto-Detected Career URLs | Native Compensation & Intelligence |
| :--- | :--- | :--- |
| **Workday** *(New in v1.4)* | `*.myworkdayjobs.com/*`, `*.myworkdaysite.com/*`, + 55+ Fortune 500 slugs (`nvidia`, `salesforce`, `capitalone`) | Pure-HTTP Chrome TLS 1.3 CXS listing + full JD detail API & US/global pay-transparency salary parser |
| **Greenhouse** | `boards.greenhouse.io/*`, `job-boards.greenhouse.io/*` | Native `?pay_transparency=true` (`pay_input_ranges`), offices, departments & tech stack |
| **Lever** | `jobs.lever.co/*`, `jobs.eu.lever.co/*` | Structured `salaryRange` (`USD`/interval), `categories` & full requirements `lists` |
| **Ashby** | `jobs.ashbyhq.com/*` | Structured USD Salary + Equity tiers (`?includeCompensation=true`) |
| **Personio** | `*.jobs.personio.de`, `*.jobs.personio.com` | EU/DACH multi-language XML position feed + office & department signals |
| **Teamtailor** | `*.teamtailor.com` | Nordics/UK `xmlns:tt` RSS feed with multi-city locations & department tags |
| **SmartRecruiters** | `careers.smartrecruiters.com/*`, `jobs.smartrecruiters.com/*` | Global enterprise postings API |
| **Workable** | `apply.workable.com/*`, `*.workable.com` | Single-request widget details feed |
| **Recruitee (Tellent)** | `*.recruitee.com` | `/api/offers` structured salary & remote/hybrid flags |
| **Pinpoint** | `*.pinpointhq.com` | `/postings.json` with direct Hiring Manager `reportingTo` line |

---

## Need Scheduled Batch Scale (100–10,000+ Targets), Ad Spy, Contact Enrichment, or US Permit/FDA/Clinic Leads?

The local open-core MCP server is ideal for inspecting 1–5 companies interactively. For **Clay.com waterfalls**, **scheduled n8n / Make outbound pipelines**, **Fortune 500 Workday batch jobs**, **Google Ads Transparency competitor ad spy**, **website verified work emails & DNS/tech enrichment**, and **US Federal/Municipal High-Ticket Lead Registries**, use our **19 Cloud Pay-Per-Event + Hosted MCP APIs on Apify Store** (`LIMITED_PERMISSIONS` native, `256 MB` RAM, pennies per run, x402 agentic payment ready):

👉 **Full Publisher Catalog**: **[https://apify.com/yan0lovesha](https://apify.com/yan0lovesha)**

### 🔥 Featured High-Demand Cloud APIs (New!)
- **[Fortune 500 Workday Jobs & Salary API (`yan0lovesha/workday-jobs-scraper`)](https://apify.com/yan0lovesha/workday-jobs-scraper)** — Pure-HTTP Workday CXS scraper across any `*.myworkdayjobs.com` URL + 55+ built-in Fortune 500 boards (`NVIDIA`, `Salesforce`, `Walmart`, `Capital One`), extracting full JDs, US multi-zone salary ranges & 125+ tech-stack signals in `< 4s`.
- **[Google Ads Transparency & Evergreen Ad Spy API (`yan0lovesha/google-ads-transparency-scraper`)](https://apify.com/yan0lovesha/google-ads-transparency-scraper)** — Sub-3s pure-HTTP RPC scraper for Google Ads Transparency Center creatives, verified advertiser IDs, text/image/video formats, active dates, evergreen ad flags & unpacked preview copy/YouTube links.
- **[Website Contact, Verified Work Email, DNS MX/SPF & 70+ Tech Stack Enrichment API (`yan0lovesha/website-contact-email-finder`)](https://apify.com/yan0lovesha/website-contact-email-finder)** — Extracts verified work emails, Cloudflare-obfuscated addresses, `/contact` & `/about` pages, socials, live DNS MX/SPF email providers & 70+ web/SaaS technologies from any domain in `< 3s`.

| # | Production Cloud API (Apify Store + Hosted MCP) | Target Market & Coverage | Key Intelligence Extracted |
| :-: | :--- | :--- | :--- |
| ⭐ | [**Career Site & Multi-ATS Jobs Scraper API (10 ATS + Salary)**](https://apify.com/yan0lovesha/multi-ats-jobs-hiring-intent) | **All 10 ATS Platforms Unified** (`Workday`, `Figma`, `Datadog`, `Zoox`, `Spotify`, `Ramp`, `Linear`+) | **Flagship 1-Click Mixed URL Feed**: unified schema across 10 ATS, `pay_transparency` salary/equity, 125+ tech-stack tools & Company Dossiers |
| 🆕 1 | [**Workday Jobs Scraper & Enterprise Career API (Salary)**](https://apify.com/yan0lovesha/workday-jobs-scraper) | Fortune 500 & Global 2000 (`NVIDIA`, `Salesforce`, `Capital One`, `Walmart`, `Adobe` + any `*.myworkdayjobs.com`) | Pure-HTTP CXS listing + detail API, 55+ built-in slugs, US multi-zone pay-transparency bands & 125+ tech-stack signals |
| 🆕 2 | [**Google Ads Transparency Scraper & Advertiser API**](https://apify.com/yan0lovesha/google-ads-transparency-scraper) | Paid Search, YouTube & Display Advertisers (`adstransparency.google.com`) | Verified Advertiser IDs, creative formats, evergreen active-day velocity, ad copy & unpacked asset/YouTube links |
| 🆕 3 | [**Website Contact, Email, Socials & Tech Stack Scraper**](https://apify.com/yan0lovesha/website-contact-email-finder) | Any B2B Company Domain, Agency List, or Clay Waterfall | Verified work emails (incl. Cloudflare decoding), social profiles, live DNS MX/SPF mail stack & 70+ web/SaaS technologies |
| 4 | [**Greenhouse Jobs Scraper & Salary API (Tech Stack Signals)**](https://apify.com/yan0lovesha/greenhouse-jobs-hiring-intent) | Global Unicorns & Public SaaS (`Cloudflare`, `Stripe`, `Datadog`, `Figma`) | Native `?pay_transparency=true` salary bands, departments, 125+ tech-stack tags & Company Dossiers |
| 5 | [**Lever Jobs Scraper & Salary API (US & EU Career Boards)**](https://apify.com/yan0lovesha/lever-jobs-hiring-intent) | Growth Tech, FinTech & Mobility (`Zoox`, `Outreach`, `Spotify`, `Veeva`) | Structured `salaryRange`, full requirement `lists`, 0–100 intent scores & SDR hooks |
| 6 | [**Ashby Jobs Scraper & Salary/Equity API (YC & AI Companies)**](https://apify.com/yan0lovesha/ashby-jobs-hiring-intent) | North America YC & AI Unicorns (`OpenAI`, `Ramp`, `Linear`, `Vanta`, `Cohere`) | Structured USD Salary + Equity tiers, 125+ tech-stack tools, 0–100 score & Company Dossiers |
| 7 | [**Personio Jobs Scraper & DACH/EU Career API (Hiring Signals)**](https://apify.com/yan0lovesha/personio-jobs-hiring-intent) | DACH & Europe #1 HR/ATS (14,000+ companies) | Dual-channel XML + `/search.json` + JSON-LD fallback (solves XML 404s) + EU 2026 salary bands |
| 8 | [**Teamtailor Jobs Scraper & EU Career API (Hiring Signals)**](https://apify.com/yan0lovesha/teamtailor-jobs-hiring-signal) | UK & Nordics #1 ATS (10,000+ companies) | Multi-office `xmlns:tt` RSS + custom-domain JSON-LD fallback + SDR cold outreach hooks |
| 9 | [**SmartRecruiters Jobs Scraper & Enterprise Career API**](https://apify.com/yan0lovesha/smartrecruiters-jobs-hiring-intent) | Global Enterprises (`Bosch`, `ServiceNow`, `Canva`, `Delivery Hero`) | Two-stage Listing + Full `jobAd` sections, compensation & enterprise tech-stack signals |
| 10 | [**Workable Jobs Scraper & Career API (B2B Hiring Signals)**](https://apify.com/yan0lovesha/workable-jobs-hiring-intent) | Global Mid-Market & SaaS (27,000+ companies) | Sub-second single-request full JD extraction + v3/v2 fallback + Account Dossiers |
| 11 | [**Recruitee Jobs Scraper & Career API (B2B Hiring Signals)**](https://apify.com/yan0lovesha/recruitee-jobs-hiring-intent) | Benelux, DACH & EU Scaleups (5,000+ companies) | Full `/api/offers` structured salary, hybrid/remote flags & 125+ tech-stack extractor |
| 12 | [**Pinpoint Jobs Scraper & Salary API (B2B Hiring Signals)**](https://apify.com/yan0lovesha/pinpoint-jobs-hiring-intent) | Enterprise & Digital Health (`SmartThings`, `Digital Science`, `Article`) | Direct Hiring Manager reporting line (`reportingTo`) + placeholder-board protection |
| 13 | [**US Building, Solar & Roofing Permits Scraper & Leads API**](https://apify.com/yan0lovesha/us-building-solar-permits-leads) | US Municipal Socrata Open Data (`Seattle`, `Austin`, `Chicago`) | Commercial construction, Solar PV/Battery & Roofing permits with **Contractor Phones & Project Valuations ($)** |
| 14 | [**US FMCSA Trucking Fleet & DOT Carrier Scraper & Leads API**](https://apify.com/yan0lovesha/us-fmcsa-trucking-fleet-leads) | US DOT FMCSA Motor Carrier Census | Commercial fleet power units, safety status, **Named DOT Principals & Insurance Leads** |
| 15 | [**US Federal Contracts & USAspending Scraper & Leads API**](https://apify.com/yan0lovesha/us-federal-contracts-awards-leads) | Official US Federal USAspending Awards Feed | Newly awarded federal prime contractors, **Award Amounts ($), NAICS & Agency Buyers** |
| 16 | [**US NPI Medical & Dental Clinics Scraper & Leads API**](https://apify.com/yan0lovesha/us-npi-medical-dental-clinics-leads) | US Federal HHS CMS NPPES NPI-2 Registry (All 50 States) | Private Dental, MedSpa/Derm, Chiropractic & Mental Health **Clinic Owners + Direct Phone Numbers** |
| 17 | [**FDA 510(k) Medical Device Clearance Scraper & Leads API**](https://apify.com/yan0lovesha/fda-510k-medical-device-leads) | Official US FDA openFDA 510(k) `SESE` Clearances | Newly cleared MedTech manufacturers, **Named Regulatory Contacts**, addresses & SaMD/AI flags |
| 18 | [**US HVAC, Electrical & Contractor License Scraper & Leads API**](https://apify.com/yan0lovesha/us-contractor-licenses-leads) | US State Contractor Licensing Boards | Active licensed commercial HVAC, electrical, plumbing & general contractors with direct contacts |

*(Table above lists Flagship `multi-ats-jobs-hiring-intent` ⭐ + all 18 specialized PPE APIs = **19 live Apify Store Actors**.)*

---

## Turn Signals into Outbound Sequences, Clay Formulas & `n8n` Workflows (Agent Skills)

Using **Claude Code, Cursor, GitHub Copilot, Codex CLI, Windsurf, or OpenClaw**?
1. **Free Hiring Intent Radar Skill (Bundled in [`skills/b2b-hiring-intent-radar`](./skills/b2b-hiring-intent-radar) & [Agensi Store](https://www.agensi.io/skills/b2b-hiring-intent-125-tech-stack-radar-9-global-ats)):**
   ```bash
   npx skills add yan0lovesha/hiring-intent-mcp
   ```
2. **Pro Outbound Execution Engine on [Agensi](https://www.agensi.io/creators/yan0lovesha):**
   - **[B2B Signal-to-Cold-Email Autopilot Pro (Clay + n8n)](https://www.agensi.io/skills/b2b-signal-to-cold-email-autopilot-pro-clay-n8n)** — Converts raw ATS, permit, NPI clinic, and FDA 510(k) signals into **CFO / VP Eng / RevOps 3-touch plain-text sequences** (verified by a 16-rule `<=75w` anti-AI-slop linter), **Clay `intentScore >= 60` 70% credit-saver formulas**, and **import-ready `n8n` workflow JSON**.

---

## MCP Tools Exposed (5 Zero-Dependency Operational Tools)

1. **`scan_company_hiring_intent`**:
   - Parameters: `url` *(career URL — auto-detects any of the 10 ATS platforms including `*.myworkdayjobs.com`)*, or `platform` (`workday` | `greenhouse` | `lever` | `ashby` | `personio` | `teamtailor` | `smartrecruiters` | `workable` | `recruitee` | `pinpoint` | `auto`) + `target` *(board slug)*, `maxJobs` *(1–10, default 5)*.
   - Returns: Open roles enriched with `intentScore` (`0–100`), `intentTier` (`HOT` | `WARM` | `MONITOR`), `techStackAll`, `signalCodes`, `disclosedSalary`, and ready-to-send `outreachHook`.
2. **`compare_companies_hiring_intent`**:
   - Parameters: `targets` *(array of 1–5 career URLs, `platform:slug` entries, or company slugs)*, `maxJobsPerCompany` *(1–8, default 4)*.
   - Returns: Ranked Account Buying Dossiers sorted by `maxIntentScore` and `hotRoleCount`, with `accountTier`, `executiveRoles`, `aggregatedTechStack`, `topDisclosedSalary`, and `recommendedOutreachHook`.
3. **`detect_company_ats_board`**:
   - Parameters: `input` *(career URL or company slug)*, `probeLive` *(boolean, default `true`)*.
   - Returns: Detected ATS platform(s), live board reachability, sampled open role titles, and compensation disclosure status across the 10 supported ATS endpoints.
4. **`generate_signal_outreach_sequence`**:
   - Parameters: `companyName`, `roleTitle`, `techStack` *(optional array)*, `disclosedSalary` *(optional)*, `buyerPersona` (`vp_engineering` | `cfo_finance` | `revops_gtm`), `valueProposition` *(optional)*.
   - Returns: Concise 3-touch plain-text B2B outbound email sequence (`<= 75` words per email) plus a ready-to-paste Clay credit-saver filter formula.
5. **`list_cloud_b2b_lead_apis`**:
   - Parameters: `category` (`all` | `ats_hiring_intent` | `ad_spy_contact_enrichment` | `us_permits_contractors` | `us_fleet_govcon` | `us_healthcare_fda`).
   - Returns: All 19 hosted Pay-Per-Event Apify Store Actors with `https://mcp.apify.com` `streamable-http` URLs, synchronous REST endpoints, Official MCP Registry & Glama links, and Agensi AI Agent Skill links.

---

## Feedback, Custom ATS Connectors & Enterprise Integration

Have a question, want a new ATS/data source supported, or need a custom Clay / `n8n` outbound pipeline?
- Open a thread in **[GitHub Discussions](https://github.com/yan0lovesha/hiring-intent-mcp/discussions)** or file an **[Issue](https://github.com/yan0lovesha/hiring-intent-mcp/issues)**.

---

## License

MIT © Ling Yan (`@yan0lovesha`)
