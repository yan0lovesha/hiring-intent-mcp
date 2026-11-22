# 125+ Enterprise Tech-Stack Taxonomy & 0–100 Intent Scoring Rubric

Use this rubric to explain every score and route outreach to the right economic buyer.

---

## 1. 8-Category Enterprise Tech-Stack Taxonomy (133 Tags)

`scripts/ats_intent_radar.py` scans job titles, department labels, and full descriptions against word-boundary regexes across 8 commercial software categories (automatically excluding the employer's own brand and host ATS platform to eliminate self-brand noise):

1. **`cloud_infra` (20 tags):** AWS, Microsoft Azure, Google Cloud (GCP), Kubernetes, Docker, Terraform, OpenTofu, Pulumi, Ansible, Helm, ArgoCD, Cloudflare, Fastly, Vercel, Datadog, Grafana, Prometheus, OpenTelemetry, Splunk, New Relic.
2. **`data_analytics` (20 tags):** Snowflake, Databricks, BigQuery, Amazon Redshift, ClickHouse, dbt, Apache Airflow, Dagster, Prefect, Apache Kafka, Redpanda, Apache Spark, Apache Flink, Fivetran, Airbyte, Looker, Tableau, Power BI, PostgreSQL, Redis.
3. **`ai_ml` (16 tags):** OpenAI, Anthropic Claude, Google Gemini, LangChain, LangGraph, LlamaIndex, PyTorch, TensorFlow, Hugging Face, vLLM, NVIDIA CUDA / TensorRT, Pinecone, Weaviate, Qdrant, pgvector, MLflow / Weights & Biases.
4. **`devtools_engineering` (24 tags):** Python, TypeScript, JavaScript, Go (Golang), Rust, Java, Kotlin, C++, C# / .NET, Ruby on Rails, PHP / Laravel, Swift / iOS, React, Next.js, Vue.js, Angular, Node.js, FastAPI / Django, Spring Boot, GraphQL, gRPC, GitHub Actions, GitLab CI, Sentry.
5. **`security_compliance` (16 tags):** Okta, Auth0, CrowdStrike, Wiz, Snyk, Vanta, Drata, HashiCorp Vault, Palo Alto Prisma, SentinelOne, SOC 2, ISO 27001, HIPAA, FedRAMP, GDPR, NIS2 / DORA.
6. **`crm_gtm_revops` (16 tags):** Salesforce, HubSpot, Gong, Outreach, Salesloft, Clay, Apollo, ZoomInfo, Cognism, 6sense, Marketo, Braze, Twilio Segment, Amplitude, Mixpanel, Zendesk / Intercom.
7. **`erp_fintech` (12 tags):** NetSuite, SAP, ServiceNow, Workday, Stripe, Adyen, Chargebee / Zuora, Coupa / Zip, DATEV, QuickBooks / Xero, Anaplan / Pigment, Plaid.
8. **`hr_collaboration` (9 tags):** Jira / Confluence, Linear, Notion, Slack, Figma, Rippling / Deel, BambooHR / HiBob, Greenhouse ATS, Ashby ATS.

---

## 2. Deterministic `0–100` Intent Score Formula

### Role-Level Score (`0–100`)
- **Base Verified Requisition:** `+16` points (funded headcount exists today)
- **Tech-Stack Density:** `+4` points per detected tool (capped at `+28`)
- **`NEW_LEADERSHIP_DECISION_MAKER`** (`Chief`, `CTO`, `CFO`, `CISO`, `CRO`, `VP`, `Head of`, `Director`): `+22` points (new executives audit and replace tooling within 60–90 days; IC Staff/Principal roles are excluded from executive buyer flags)
- **`TECH_MIGRATION_MODERNIZATION`** (`greenfield`, `0 to 1`, `cloud migration`, `modernizing`, `re-architect`, `re-platform`, `legacy replacement`): `+24` points
- **`AI_TRANSFORMATION_INITIATIVE`** (`genai`, `agentic`, `llm infrastructure`, `mlops`, `rag pipeline`, `foundation model`): `+20` points
- **`BUDGET_HYPERGROWTH`** (`newly created role`, `hyper-growth`, `founding engineer`, `first hire`, `Series A–E`): `+18` points
- **`SECURITY_COMPLIANCE_MANDATE`** (`SOC 2`, `ISO 27001`, `FedRAMP`, `CMMC`, `DORA`, `NIS2`, `HIPAA`, `audit readiness`): `+18` points
- **`REVOPS_GTM_SCALE`** (`Enterprise AE`, `RevOps`, `GTM Engineer`, `demand generation`, `international expansion`): `+16` points
- **Disclosed Salary / Equity Band:** `+8` points

### Account-Level Score (`0–100`)
`min(100, highest_role_score + hiring_velocity_bonus)` where `hiring_velocity_bonus` is `+8` for `25+` open roles and `+4` for `10–24` open roles.

---

## 3. Tier Actions & Icebreaker Standards

- **`HOT` (`70–100`):** Pitch both the **Economic Buyer** (VP/C-Level) and the **Hiring Manager** within 48 hours. Cite the exact role title, disclosed salary tier, and 2–3 named stack tools.
- **`WARM` (`45–69`):** Lead with stack-specific benchmark proof (`Snowflake + dbt`, `Kubernetes + Terraform`, `Salesforce + Gong`).
- **`MONITOR` (`0–44`):** Defer paid email-enrichment lookups; monitor weekly via scheduled Apify Cloud PPE runs.
