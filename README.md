# B2B Hiring Intent & High-Ticket Regulatory Signals MCP (`b2b-hiring-intent-mcp`)

> **Zero-dependency Model Context Protocol (MCP) Server & CLI** for extracting real-time **B2B tech-stack footprints**, **disclosed USD/EUR salary & equity bands**, and **executive buying signals** from public career boards — backed by **10 production Cloud Pay-Per-Event APIs** for Clay, n8n, Make, and autonomous AI Agents.

---

## Quick Start (Local MCP Server — Zero Dependencies, Node 20+)

### 1. Run Instant CLI Check
```bash
# Scan a YC / AI unicorn on Ashby (with structured USD salary + equity!)
node bin/b2b-hiring-intent-mcp.mjs --cli --platform ashby --target ramp --max 4

# Scan a European scaleup on Personio or Teamtailor
node bin/b2b-hiring-intent-mcp.mjs --cli --platform personio --target adsquare --max 4
node bin/b2b-hiring-intent-mcp.mjs --cli --platform teamtailor --target puzzel --max 4
```

### 2. Add to Claude Desktop / Cursor / VS Code Copilot (`mcp.json`)
```json
{
  "mcpServers": {
    "b2b-hiring-intent": {
      "command": "node",
      "args": ["/path/to/b2b-hiring-intent-mcp/bin/b2b-hiring-intent-mcp.mjs"]
    }
  }
}
```

### 3. Live Interactive Signal Radar Demo
Open [`demo/index.html`](./demo/index.html) in any browser to filter 50+ real scraped hiring signals by tech stack (`AWS`, `Kubernetes`, `Snowflake`, `dbt`, `Salesforce`, `HubSpot`, `Terraform`, `OpenAI`), inspect 25 executive account dossiers, and generate 1-click Cold Email icebreakers.

---

## Need Scheduled Batch Scale (100–10,000+ Targets), XML-404 Fallbacks, or US Permit/FDA/Clinic Leads?

The local open-core CLI is ideal for inspecting 1–5 companies interactively. For **Clay.com waterfalls**, **scheduled n8n / Make outbound pipelines**, **automatic JSON-LD fallbacks on XML-disabled boards**, **Account-Level Company Dossiers**, and **US Federal/Municipal High-Ticket Lead Registries**, use our **10 Cloud Pay-Per-Event + MCP APIs on Apify Store** (`LIMITED_PERMISSIONS` native, pennies per run, zero monthly subscription):

👉 **Full Publisher Catalog**: **[https://apify.com/yan0lovesha](https://apify.com/yan0lovesha)**

| # | Production Cloud API (Apify Store + Hosted MCP) | Target Market & Coverage | Key Intelligence Extracted |
| :-: | :--- | :--- | :--- |
| 1 | [**Ashby Jobs, Salary & B2B Hiring Intent API**](https://apify.com/yan0lovesha/ashby-jobs-hiring-intent) | North America YC & AI Unicorns (`OpenAI`, `Ramp`, `Linear`, `Vanta`, `Cohere`) | Structured USD Salary + Equity tiers, 125+ tech-stack tools, 0–100 score & Company Dossiers |
| 2 | [**Personio Jobs & B2B Hiring Intent API**](https://apify.com/yan0lovesha/personio-jobs-hiring-intent) | DACH & Europe #1 HR/ATS (14,000+ companies) | Dual-channel XML + `/search.json` + JSON-LD fallback (solves XML 404s) + EU 2026 salary bands |
| 3 | [**Teamtailor Jobs & B2B Hiring Signal API**](https://apify.com/yan0lovesha/teamtailor-jobs-hiring-signal) | UK & Nordics #1 ATS (10,000+ companies) | Multi-office `xmlns:tt` RSS + custom-domain JSON-LD fallback + SDR cold outreach hooks |
| 4 | [**SmartRecruiters Enterprise Hiring Intent API**](https://apify.com/yan0lovesha/smartrecruiters-jobs-hiring-intent) | Global Enterprises (`Bosch`, `ServiceNow`, `Canva`, `Delivery Hero`) | Two-stage Listing + Full `jobAd` sections, compensation & enterprise tech-stack signals |
| 5 | [**Workable Jobs & B2B Hiring Intent API**](https://apify.com/yan0lovesha/workable-jobs-hiring-intent) | Global Mid-Market & SaaS (27,000+ companies) | Sub-second single-request full JD extraction + v3/v2 fallback + Account Dossiers |
| 6 | [**Recruitee (Tellent) Hiring Intent API**](https://apify.com/yan0lovesha/recruitee-jobs-hiring-intent) | Benelux, DACH & EU Scaleups (5,000+ companies) | Full `/api/offers` structured salary, hybrid/remote flags & 125+ tech-stack extractor |
| 7 | [**Pinpoint ATS Hiring Manager & Intent API**](https://apify.com/yan0lovesha/pinpoint-jobs-hiring-intent) | Enterprise & Digital Health (`SmartThings`, `Digital Science`, `Article`) | Direct Hiring Manager reporting line (`reportingTo`) + placeholder-board protection |
| 8 | [**US Building, Solar & Roofing Permits Leads API**](https://apify.com/yan0lovesha/us-building-solar-permits-leads) | US Municipal Socrata Open Data (`Seattle`, `Austin`, `Chicago`) | Commercial construction, Solar PV/Battery & Roofing permits with **Contractor Phones & Project Valuations ($)** |
| 9 | [**US Medical & Dental Clinic Owners Leads API**](https://apify.com/yan0lovesha/us-npi-medical-dental-clinics-leads) | US Federal HHS CMS NPPES NPI-2 Registry (All 50 States) | Private Dental, MedSpa/Derm, Chiropractic & Mental Health **Clinic Owners + Direct Phone Numbers** |
| 10 | [**FDA 510(k) Cleared Medical Device Leads API**](https://apify.com/yan0lovesha/fda-510k-medical-device-leads) | Official US FDA openFDA 510(k) `SESE` Clearances | Newly cleared MedTech manufacturers, **Named Regulatory Contacts**, addresses & SaMD/AI flags |

---

## Want the Complete Turnkey Outbound Automation Pack ($39 One-Time)?

Skip days of wiring webhooks, deduplication scripts, and prompt engineering. Grab the **Hiring-Intent Cold Email Autopilot Pro Kit ($39)**:
- **Ready-to-Import 14-Node Multi-ATS `n8n` Outbound Engine** (Weekly Cron -> Parallel Multi-ATS Scan -> Cross-Board Account Deduplication -> GPT-4o 75-word Cold Email Composer -> Auto-push to **Instantly.ai**, **Slack/HubSpot Webhook**, and **CSV**).
- **Clay.com Credit-Saver HTTP API Waterfall Blueprint** (cuts Clay contact-enrichment spend by **70%+** by gating email lookups on `intentScore >= 60`).
- **250+ Live Enriched Benchmark Leads & Executive Account Dossiers (`JSON`)**.

---

## License

MIT © B2B Hiring Intent Autopilot Contributors
