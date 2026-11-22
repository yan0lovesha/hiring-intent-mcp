#!/usr/bin/env python3
"""
ats_intent_radar.py — Zero-Dependency 9-ATS Live Hiring Intent & Tech-Stack Radar

Part of the `b2b-hiring-intent-radar` Agent Skill.
Uses ONLY the Python 3 standard library (`urllib.request`, `json`, `xml.etree.ElementTree`,
`re`, `html`, `argparse`, `concurrent.futures`).

Security & Network Policy:
  - Read-only HTTPS GET requests ONLY to a strict allowlist of 9 official public ATS career hosts:
    Ashby, Greenhouse, Lever, Personio, Teamtailor, SmartRecruiters, Workable, Recruitee, Pinpoint.
  - Zero credentials read from environment variables, zero dynamic code execution, zero external deps.

Usage:
  python3 scripts/ats_intent_radar.py --platform auto --targets ramp,cloudflare,adsquare --max-jobs 5
  python3 scripts/ats_intent_radar.py --platform ashby --targets ramp,vanta --max-jobs 6
  python3 scripts/ats_intent_radar.py --cloud-catalog
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import html
import json
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

USER_AGENT = "Mozilla/5.0 (compatible; B2BHiringIntentRadarSkill/1.0; +https://apify.com/yan0lovesha)"
APIFY_PUBLISHER_URL = "https://apify.com/yan0lovesha"
APIFY_HOSTED_MCP_URL = "https://mcp.apify.com"

SUPPORTED_PLATFORMS = (
    "ashby",
    "greenhouse",
    "lever",
    "personio",
    "teamtailor",
    "smartrecruiters",
    "workable",
    "recruitee",
    "pinpoint",
)

DECLARED_NETWORK_HOSTS = (
    "api.ashbyhq.com",
    "boards-api.greenhouse.io",
    "api.lever.co",
    "api.eu.lever.co",
    "jobs.personio.de",
    "jobs.personio.com",
    "teamtailor.com",
    "api.smartrecruiters.com",
    "apply.workable.com",
    "recruitee.com",
    "pinpointhq.com",
)

ALLOWED_HOST_PATTERNS = (
    re.compile(r"^api\.ashbyhq\.com$", re.IGNORECASE),
    re.compile(r"^boards-api\.greenhouse\.io$", re.IGNORECASE),
    re.compile(r"^api(?:\.eu)?\.lever\.co$", re.IGNORECASE),
    re.compile(r"^[a-z0-9-]+\.jobs\.personio\.(?:de|com)$", re.IGNORECASE),
    re.compile(r"^[a-z0-9-]+\.teamtailor\.com$", re.IGNORECASE),
    re.compile(r"^api\.smartrecruiters\.com$", re.IGNORECASE),
    re.compile(r"^apply\.workable\.com$", re.IGNORECASE),
    re.compile(r"^[a-z0-9-]+\.recruitee\.com$", re.IGNORECASE),
    re.compile(r"^[a-z0-9-]+\.pinpointhq\.com$", re.IGNORECASE),
)

SLUG_CLEAN_RE = re.compile(r"^[A-Za-z0-9._-]+$")

# 132 distinct enterprise tools & standards across 8 categories (125+ tech-stack tag coverage)
TECH_STACK_CATALOG: list[tuple[str, str, str]] = [
    # 1. cloud_infra (20)
    ("AWS", "cloud_infra", r"\baws\b|\bamazon\s+web\s+services\b|\bec2\b|\bs3\b"),
    ("Microsoft Azure", "cloud_infra", r"\bazure\b"),
    ("Google Cloud (GCP)", "cloud_infra", r"\bgcp\b|\bgoogle\s+cloud\b|\bgke\b"),
    ("Kubernetes", "cloud_infra", r"\bkubernetes\b|\bk8s\b|\beks\b|\baks\b"),
    ("Docker", "cloud_infra", r"\bdocker\b|\bcontainers?\b"),
    ("Terraform", "cloud_infra", r"\bterraform\b"),
    ("OpenTofu", "cloud_infra", r"\bopentofu\b"),
    ("Pulumi", "cloud_infra", r"\bpulumi\b"),
    ("Ansible", "cloud_infra", r"\bansible\b"),
    ("Helm", "cloud_infra", r"\bhelm\b"),
    ("ArgoCD", "cloud_infra", r"\bargocd\b|\bargo\s+cd\b"),
    ("Cloudflare", "cloud_infra", r"\bcloudflare\b"),
    ("Fastly", "cloud_infra", r"\bfastly\b"),
    ("Vercel", "cloud_infra", r"\bvercel\b"),
    ("Datadog", "cloud_infra", r"\bdatadog\b"),
    ("Grafana", "cloud_infra", r"\bgrafana\b"),
    ("Prometheus", "cloud_infra", r"\bprometheus\b"),
    ("OpenTelemetry", "cloud_infra", r"\bopentelemetry\b|\botel\b"),
    ("Splunk", "cloud_infra", r"\bsplunk\b"),
    ("New Relic", "cloud_infra", r"\bnew\s+relic\b"),
    # 2. data_analytics (20)
    ("Snowflake", "data_analytics", r"\bsnowflake\b"),
    ("Databricks", "data_analytics", r"\bdatabricks\b|\bdelta\s+lake\b"),
    ("BigQuery", "data_analytics", r"\bbigquery\b"),
    ("Amazon Redshift", "data_analytics", r"\bredshift\b"),
    ("ClickHouse", "data_analytics", r"\bclickhouse\b"),
    ("dbt", "data_analytics", r"\bdbt\b"),
    ("Apache Airflow", "data_analytics", r"\bairflow\b"),
    ("Dagster", "data_analytics", r"\bdagster\b"),
    ("Prefect", "data_analytics", r"\bprefect\b"),
    ("Apache Kafka", "data_analytics", r"\bkafka\b|\bconfluent\b"),
    ("Redpanda", "data_analytics", r"\bredpanda\b"),
    ("Apache Spark", "data_analytics", r"\bspark\b|\bpyspark\b"),
    ("Apache Flink", "data_analytics", r"\bflink\b"),
    ("Fivetran", "data_analytics", r"\bfivetran\b"),
    ("Airbyte", "data_analytics", r"\bairbyte\b"),
    ("Looker", "data_analytics", r"\blooker\b"),
    ("Tableau", "data_analytics", r"\btableau\b"),
    ("Power BI", "data_analytics", r"\bpower\s*bi\b"),
    ("PostgreSQL", "data_analytics", r"\bpostgresql\b|\bpostgres\b"),
    ("Redis", "data_analytics", r"\bredis\b"),
    # 3. ai_ml (16)
    ("OpenAI", "ai_ml", r"\bopenai\b|\bgpt-4o?\b|\bgpt-5\b"),
    ("Anthropic Claude", "ai_ml", r"\banthropic\b|\bclaude\b"),
    ("Google Gemini", "ai_ml", r"\bgemini\b|\bvertex\s+ai\b"),
    ("LangChain", "ai_ml", r"\blangchain\b"),
    ("LangGraph", "ai_ml", r"\blanggraph\b"),
    ("LlamaIndex", "ai_ml", r"\bllamaindex\b"),
    ("PyTorch", "ai_ml", r"\bpytorch\b"),
    ("TensorFlow", "ai_ml", r"\btensorflow\b"),
    ("Hugging Face", "ai_ml", r"\bhugging\s*face\b|\btransformers\b"),
    ("vLLM", "ai_ml", r"\bvllm\b"),
    ("NVIDIA CUDA / TensorRT", "ai_ml", r"\bcuda\b|\btensorrt\b|\btriton\b"),
    ("Pinecone", "ai_ml", r"\bpinecone\b"),
    ("Weaviate", "ai_ml", r"\bweaviate\b"),
    ("Qdrant", "ai_ml", r"\bqdrant\b"),
    ("pgvector", "ai_ml", r"\bpgvector\b"),
    ("MLflow / Weights & Biases", "ai_ml", r"\bmlflow\b|\bweights\s*(?:&|and)\s*biases\b|\bwandb\b"),
    # 4. devtools_engineering (24)
    ("Python", "devtools_engineering", r"\bpython\b"),
    ("TypeScript", "devtools_engineering", r"\btypescript\b"),
    ("JavaScript", "devtools_engineering", r"\bjavascript\b|\bes6\b"),
    ("Go (Golang)", "devtools_engineering", r"\bgolang\b|\bgo\s+(?:backend|services|microservices)\b"),
    ("Rust", "devtools_engineering", r"\brust\b(?!\s*(?:free|proof|belt))"),
    ("Java", "devtools_engineering", r"\bjava\b"),
    ("Kotlin", "devtools_engineering", r"\bkotlin\b"),
    ("C++", "devtools_engineering", r"\bc\+\+\b"),
    ("C# / .NET", "devtools_engineering", r"(?:^|[\s,/(])c#(?=$|[\s,/.)])|\basp\.net\b|\.net\s*(?:core|8|9)\b"),
    ("Ruby on Rails", "devtools_engineering", r"\bruby\s+on\s+rails\b|\brails\b"),
    ("PHP / Laravel", "devtools_engineering", r"\bphp\b|\blaravel\b|\bsymfony\b"),
    ("Swift / iOS", "devtools_engineering", r"\bswift\b|\bswiftui\b"),
    ("React", "devtools_engineering", r"\breact(?:\.js|js)?\b"),
    ("Next.js", "devtools_engineering", r"\bnext\.?js\b"),
    ("Vue.js", "devtools_engineering", r"\bvue(?:\.js|js)?\b|\bnuxt\b"),
    ("Angular", "devtools_engineering", r"\bangular\b"),
    ("Node.js", "devtools_engineering", r"\bnode\.?js\b"),
    ("FastAPI / Django", "devtools_engineering", r"\bfastapi\b|\bdjango\b"),
    ("Spring Boot", "devtools_engineering", r"\bspring\s+boot\b"),
    ("GraphQL", "devtools_engineering", r"\bgraphql\b"),
    ("gRPC", "devtools_engineering", r"\bgrpc\b"),
    ("GitHub Actions", "devtools_engineering", r"\bgithub\s+actions\b"),
    ("GitLab CI", "devtools_engineering", r"\bgitlab\s+ci\b"),
    ("Sentry", "devtools_engineering", r"\bsentry\b"),
    # 5. security_compliance (16)
    ("Okta", "security_compliance", r"\bokta\b"),
    ("Auth0", "security_compliance", r"\bauth0\b"),
    ("CrowdStrike", "security_compliance", r"\bcrowdstrike\b"),
    ("Wiz", "security_compliance", r"\bwiz\.io\b|\bwiz\s+(?:cloud|security|cnapp)\b"),
    ("Snyk", "security_compliance", r"\bsnyk\b"),
    ("Vanta", "security_compliance", r"\bvanta\b"),
    ("Drata", "security_compliance", r"\bdrata\b"),
    ("HashiCorp Vault", "security_compliance", r"\bhashicorp\s+vault\b|\bvault\s+secrets?\b"),
    ("Palo Alto Prisma", "security_compliance", r"\bpalo\s+alto\b|\bprisma\s+cloud\b"),
    ("SentinelOne", "security_compliance", r"\bsentinelone\b"),
    ("SOC 2", "security_compliance", r"\bsoc\s*2\b"),
    ("ISO 27001", "security_compliance", r"\biso\s*[/-]?\s*27001\b"),
    ("HIPAA", "security_compliance", r"\bhipaa\b"),
    ("FedRAMP", "security_compliance", r"\bfedramp\b|\bcmmc\b"),
    ("GDPR", "security_compliance", r"\bgdpr\b"),
    ("NIS2 / DORA", "security_compliance", r"\bnis2\b|\bdora\b"),
    # 6. crm_gtm_revops (16)
    ("Salesforce", "crm_gtm_revops", r"\bsalesforce\b|\bsfdc\b"),
    ("HubSpot", "crm_gtm_revops", r"\bhubspot\b"),
    ("Gong", "crm_gtm_revops", r"\bgong\.io\b|\bgong\s+(?:revenue|call|intelligence|platform|crm)"),
    (
        "Outreach",
        "crm_gtm_revops",
        r"\boutreach\.io\b|\boutreach\s+(?:sequences?|cadences?)|(?:salesforce|hubspot|gong|salesloft|apollo|clay)[,\s/+&]+outreach\b",
    ),
    ("Salesloft", "crm_gtm_revops", r"\bsalesloft\b"),
    ("Clay", "crm_gtm_revops", r"\bclay\.com\b|\bclay\s+(?:tables?|waterfalls?|enrichment)\b|(?:apollo|hubspot|outreach|instantly)[,\s/+&]+clay\b"),
    ("Apollo", "crm_gtm_revops", r"\bapollo\.io\b"),
    ("ZoomInfo", "crm_gtm_revops", r"\bzoominfo\b"),
    ("Cognism", "crm_gtm_revops", r"\bcognism\b"),
    ("6sense", "crm_gtm_revops", r"\b6sense\b"),
    ("Marketo", "crm_gtm_revops", r"\bmarketo\b"),
    ("Braze", "crm_gtm_revops", r"\bbraze\b"),
    ("Twilio Segment", "crm_gtm_revops", r"\btwilio\s+segment\b|\bsegment\.com\b|\bsegment\s+cdp\b"),
    ("Amplitude", "crm_gtm_revops", r"\bamplitude\b"),
    ("Mixpanel", "crm_gtm_revops", r"\bmixpanel\b"),
    ("Zendesk / Intercom", "crm_gtm_revops", r"\bzendesk\b|\bintercom\b"),
    # 7. erp_fintech (12)
    ("NetSuite", "erp_fintech", r"\bnetsuite\b"),
    ("SAP", "erp_fintech", r"\bsap\b|\bs/4hana\b"),
    ("ServiceNow", "erp_fintech", r"\bservicenow\b"),
    ("Workday", "erp_fintech", r"\bworkday\b"),
    ("Stripe", "erp_fintech", r"\bstripe\b"),
    ("Adyen", "erp_fintech", r"\badyen\b"),
    ("Chargebee / Zuora", "erp_fintech", r"\bchargebee\b|\bzuora\b"),
    ("Coupa / Zip", "erp_fintech", r"\bcoupa\b|\bziphq\b"),
    ("DATEV", "erp_fintech", r"\bdatev\b"),
    ("QuickBooks / Xero", "erp_fintech", r"\bquickbooks\b|\bxero\b"),
    ("Anaplan / Pigment", "erp_fintech", r"\banaplan\b|\bpigment\b"),
    ("Plaid", "erp_fintech", r"\bplaid\b"),
    # 8. hr_collaboration (9)
    ("Jira / Confluence", "hr_collaboration", r"\bjira\b|\bconfluence\b"),
    ("Linear", "hr_collaboration", r"\blinear\.app\b"),
    ("Notion", "hr_collaboration", r"\bnotion\b"),
    ("Slack", "hr_collaboration", r"\bslack\b"),
    ("Figma", "hr_collaboration", r"\bfigma\b"),
    ("Rippling / Deel", "hr_collaboration", r"\brippling\b|\bdeel\b"),
    ("BambooHR / HiBob", "hr_collaboration", r"\bbamboohr\b|\bhibob\b"),
    ("Greenhouse ATS", "hr_collaboration", r"\bgreenhouse\b"),
    ("Ashby ATS", "hr_collaboration", r"\bashby\b"),
]

COMPILED_TECH_PATTERNS = [
    (name, category, re.compile(pattern, re.IGNORECASE))
    for name, category, pattern in TECH_STACK_CATALOG
]

BUYING_SIGNAL_RULES = [
    (
        "TECH_MIGRATION_MODERNIZATION",
        24,
        re.compile(
            r"\b(?:greenfield|from\s+scratch|0\s+to\s+1|zero\s+to\s+one|cloud\s+migration|migrating|"
            r"moderniz(?:e|ing)|re-?architect|re-?platform|legacy\s+replacement)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "AI_TRANSFORMATION_INITIATIVE",
        20,
        re.compile(
            r"\b(?:ai[- ]native|genai|generative\s+ai|agentic|llm\s+infrastructure|mlops|ai\s+agents|"
            r"rag\s+pipeline|foundation\s+model)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "BUDGET_HYPERGROWTH",
        18,
        re.compile(
            r"\b(?:rapidly\s+growing|scaling\s+rapidly|hyper[- ]?growth|newly\s+created\s+role|"
            r"founding\s+engineer|first\s+hire|expanding\s+(?:our|the)\s+team|series\s+[a-e])\b",
            re.IGNORECASE,
        ),
    ),
    (
        "SECURITY_COMPLIANCE_MANDATE",
        18,
        re.compile(
            r"\b(?:soc\s*2|iso\s*27001|fedramp|cmmc|dora\b|nis2|hipaa|zero\s+trust|"
            r"audit\s+readiness|security\s+posture)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "REVOPS_GTM_SCALE",
        16,
        re.compile(
            r"\b(?:enterprise\s+account\s+executive|revenue\s+operations|revops|gtm\s+engineer|"
            r"demand\s+generation|pipeline\s+generation|international\s+expansion)\b",
            re.IGNORECASE,
        ),
    ),
]

LEADERSHIP_RE = re.compile(
    r"\b(?:chief|ceo|cto|cfo|ciso|cro|cmo|cpo|vp\b|vice\s+president|svp\b|evp\b|head\s+of|director|managing\s+director)\b",
    re.IGNORECASE,
)

SALARY_INLINE_RE = re.compile(
    r"(?:USD|EUR|GBP|CHF|\$|€|£)\s?\d{2,3}(?:[.,]\d{3}|\s?[kK])"
    r"(?:\s?(?:-|–|—|to)\s?(?:USD|EUR|GBP|CHF|\$|€|£)?\s?\d{2,3}(?:[.,]\d{3}|\s?[kK]))?"
)

COMPANY_STOPWORDS = {
    "inc", "incorporated", "llc", "ltd", "limited", "gmbh", "corp", "corporation",
    "company", "co", "ag", "se", "plc", "ab", "bv", "sa", "sas", "technologies",
    "technology", "tech", "software", "systems", "labs", "group", "holdings", "the",
}

VENDOR_BRAND_ALIASES = {
    "aws": ("amazon", "aws"),
    "microsoft azure": ("microsoft", "azure"),
    "google cloud (gcp)": ("google", "gcp", "alphabet"),
    "google gemini": ("google", "gemini", "alphabet"),
    "nvidia cuda / tensorrt": ("nvidia",),
    "palo alto prisma": ("paloalto", "paloaltonetworks"),
    "twilio segment": ("twilio", "segment"),
    "greenhouse ats": ("greenhouse",),
    "ashby ats": ("ashby",),
}

CLOUD_PPE_CATALOG = [
    {
        "slug": "multi-ats-jobs-hiring-intent",
        "url": f"{APIFY_PUBLISHER_URL}/multi-ats-jobs-hiring-intent",
        "useCase": "Flagship 10-ATS Unified Aggregator: scan mixed Workday, Greenhouse, Lever, Ashby & EU career URLs in one run",
    },
    {
        "slug": "workday-jobs-scraper",
        "url": f"{APIFY_PUBLISHER_URL}/workday-jobs-scraper",
        "useCase": "Fortune 500 & Global 2000 Workday CXS jobs, full JDs, US salary ranges & 125+ tech-stack signals",
    },
    {
        "slug": "greenhouse-jobs-hiring-intent",
        "url": f"{APIFY_PUBLISHER_URL}/greenhouse-jobs-hiring-intent",
        "useCase": "Batch Greenhouse scans with native pay_transparency salary bands, departments & account dossiers",
    },
    {
        "slug": "lever-jobs-hiring-intent",
        "url": f"{APIFY_PUBLISHER_URL}/lever-jobs-hiring-intent",
        "useCase": "Batch US & EU Lever scans with structured salaryRange, requirement lists & 0-100 intent scores",
    },
    {
        "slug": "ashby-jobs-hiring-intent",
        "url": f"{APIFY_PUBLISHER_URL}/ashby-jobs-hiring-intent",
        "useCase": "Batch scan 10-10,000+ YC & AI Unicorn Ashby boards with structured USD salary + equity tiers",
    },
    {
        "slug": "personio-jobs-hiring-intent",
        "url": f"{APIFY_PUBLISHER_URL}/personio-jobs-hiring-intent",
        "useCase": "DACH/EU 14,000+ Personio boards with automatic /search.json & JSON-LD fallback when XML is disabled",
    },
    {
        "slug": "teamtailor-jobs-hiring-signal",
        "url": f"{APIFY_PUBLISHER_URL}/teamtailor-jobs-hiring-signal",
        "useCase": "UK & Nordics 10,000+ Teamtailor career sites including custom-domain JSON-LD extraction",
    },
    {
        "slug": "smartrecruiters-jobs-hiring-intent",
        "url": f"{APIFY_PUBLISHER_URL}/smartrecruiters-jobs-hiring-intent",
        "useCase": "Global Fortune 2000 SmartRecruiters full jobAd + compensation batch intelligence",
    },
    {
        "slug": "workable-jobs-hiring-intent",
        "url": f"{APIFY_PUBLISHER_URL}/workable-jobs-hiring-intent",
        "useCase": "Global Mid-Market SaaS (27,000+ Workable companies) batch tech-stack & hiring velocity API",
    },
    {
        "slug": "recruitee-jobs-hiring-intent",
        "url": f"{APIFY_PUBLISHER_URL}/recruitee-jobs-hiring-intent",
        "useCase": "Benelux & EU scaleups (Recruitee / Tellent) structured salary & tech-stack monitoring",
    },
    {
        "slug": "pinpoint-jobs-hiring-intent",
        "url": f"{APIFY_PUBLISHER_URL}/pinpoint-jobs-hiring-intent",
        "useCase": "Enterprise & Digital Health Pinpoint boards with direct Hiring Manager reporting lines",
    },
    {
        "slug": "website-contact-email-finder",
        "url": f"{APIFY_PUBLISHER_URL}/website-contact-email-finder",
        "useCase": "Verified work emails, Cloudflare decoding, live DNS MX/SPF mail stack & 70+ web technologies per domain",
    },
    {
        "slug": "google-ads-transparency-scraper",
        "url": f"{APIFY_PUBLISHER_URL}/google-ads-transparency-scraper",
        "useCase": "Google Ads Transparency Center advertiser IDs, active creatives, evergreen velocity & YouTube/copy assets",
    },
    {
        "slug": "apple-app-store-scraper",
        "url": f"{APIFY_PUBLISHER_URL}/apple-app-store-scraper",
        "useCase": "iOS App Store metadata, multi-country 1-5 star reviews, churn pain-point mining & publisher domains",
    },
    {
        "slug": "us-fmcsa-trucking-fleet-leads",
        "url": f"{APIFY_PUBLISHER_URL}/us-fmcsa-trucking-fleet-leads",
        "useCase": "US DOT FMCSA Commercial Trucking Fleets with power units, safety ratings, owners & insurance leads",
    },
    {
        "slug": "us-federal-contracts-awards-leads",
        "url": f"{APIFY_PUBLISHER_URL}/us-federal-contracts-awards-leads",
        "useCase": "US Federal Contract Awards & GovCon B2B Leads with newly awarded prime contractors & NAICS codes",
    },
    {
        "slug": "us-npi-medical-dental-clinics-leads",
        "url": f"{APIFY_PUBLISHER_URL}/us-npi-medical-dental-clinics-leads",
        "useCase": "US Federal HHS NPPES NPI-2 Dental, MedSpa & Specialty Clinic Owners + direct clinic phone numbers",
    },
    {
        "slug": "fda-510k-medical-device-leads",
        "url": f"{APIFY_PUBLISHER_URL}/fda-510k-medical-device-leads",
        "useCase": "Official US FDA 510(k) Newly Cleared Medical Device Manufacturers + named regulatory contacts",
    },
]


def is_allowed_ats_url(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        return False
    return any(pattern.match(parsed.hostname) for pattern in ALLOWED_HOST_PATTERNS)


MAX_HTTP_READ_BYTES = 25 * 1024 * 1024  # 25MB cap so large Ashby boards (e.g. openai ~15MB) parse cleanly


def fetch_public_url(url: str, timeout_sec: float = 20.0) -> str | None:
    if not is_allowed_ats_url(url):
        raise ValueError(f"Blocked URL outside official 9-ATS allowlist: {url}")
    req = urllib.request.Request(
        url,
        method="GET",
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json, application/xml, text/xml, */*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            if resp.status < 200 or resp.status >= 300:
                return None
            raw = resp.read(MAX_HTTP_READ_BYTES)
            return raw.decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None


def strip_html(raw_html: str | None) -> str:
    if not raw_html:
        return ""
    unescaped = html.unescape(html.unescape(str(raw_html)))
    no_scripts = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", unescaped, flags=re.IGNORECASE | re.DOTALL)
    no_tags = re.sub(r"<[^>]+>", " ", no_scripts)
    return re.sub(r"\s+", " ", no_tags).strip()


def normalize_slug(raw_target: str) -> str:
    cleaned = raw_target.strip()
    if cleaned.startswith(("http://", "https://")):
        parsed = urllib.parse.urlparse(cleaned)
        host = (parsed.hostname or "").lower()
        for suffix in (".jobs.personio.de", ".jobs.personio.com", ".teamtailor.com", ".recruitee.com", ".pinpointhq.com"):
            if host.endswith(suffix):
                cleaned = host[: -len(suffix)]
                break
        else:
            parts = [p for p in parsed.path.split("/") if p]
            cleaned = parts[0] if parts else host.split(".")[0]
    else:
        for suffix in (".jobs.personio.de", ".jobs.personio.com", ".teamtailor.com", ".recruitee.com", ".pinpointhq.com"):
            if cleaned.lower().endswith(suffix):
                cleaned = cleaned[: -len(suffix)]
                break
        cleaned = cleaned.strip("/").split("/")[0]

    if not SLUG_CLEAN_RE.match(cleaned):
        raise ValueError(f"Invalid company slug format: {raw_target!r}")
    return cleaned


def is_employer_self_brand(tool_name: str, company_name: str, company_slug: str, ats_platform: str) -> bool:
    tool_lower = (tool_name or "").strip().lower()
    if not tool_lower:
        return False
    host_ats = (ats_platform or "").strip().lower()
    if host_ats and (tool_lower == host_ats or tool_lower == f"{host_ats} ats"):
        return True

    raw_tokens = [
        tok
        for tok in re.split(r"[^a-z0-9+#]+", f"{company_name or ''} {company_slug or ''}".lower())
        if len(tok) >= 3 and tok not in COMPANY_STOPWORDS
    ]
    if not raw_tokens:
        return False
    company_set = set(raw_tokens)
    compact = "".join(raw_tokens)
    if len(compact) >= 4:
        company_set.add(compact)

    tool_tokens = [
        tok
        for tok in re.split(r"[^a-z0-9+#]+", tool_lower)
        if len(tok) >= 3 and tok not in {"ats", "cloud", "ci"}
    ]
    alias_tokens = VENDOR_BRAND_ALIASES.get(tool_lower, ())
    return any(tok in company_set for tok in (*tool_tokens, *alias_tokens))


def enrich_job(record: dict) -> dict:
    title = str(record.get("title") or "").strip()
    department = str(record.get("department") or "General").strip()
    description = str(record.get("description") or "").strip()
    company_name = str(record.get("companyName") or "")
    company_slug = str(record.get("companySlug") or "")
    ats_platform = str(record.get("atsPlatform") or "")
    corpus = f"{title}\n{department}\n{description}"

    detected_tools: list[str] = []
    tools_by_category: dict[str, list[str]] = {}
    for tool_name, category, regex in COMPILED_TECH_PATTERNS:
        if is_employer_self_brand(tool_name, company_name, company_slug, ats_platform):
            continue
        if regex.search(corpus):
            detected_tools.append(tool_name)
            tools_by_category.setdefault(category, []).append(tool_name)

    signals: list[str] = []
    score = 16 + min(28, len(detected_tools) * 4)

    if LEADERSHIP_RE.search(title):
        signals.append("NEW_LEADERSHIP_DECISION_MAKER")
        score += 22

    for sig_code, weight, sig_re in BUYING_SIGNAL_RULES:
        if sig_re.search(corpus):
            signals.append(sig_code)
            score += weight

    salary = record.get("disclosedSalary")
    if not salary:
        inline_match = SALARY_INLINE_RE.search(corpus)
        if inline_match:
            salary = inline_match.group(0).strip()
    if salary:
        score += 8

    intent_score = min(100, score)
    intent_tier = "HOT" if intent_score >= 70 else "WARM" if intent_score >= 45 else "MONITOR"

    return {
        "atsPlatform": record["atsPlatform"],
        "companyName": record["companyName"],
        "companySlug": record["companySlug"],
        "title": title,
        "department": department,
        "location": record.get("location") or "Unspecified",
        "workplaceType": record.get("workplaceType") or "unspecified",
        "disclosedSalary": salary,
        "publishedAt": record.get("publishedAt"),
        "jobUrl": record.get("jobUrl"),
        "intentScore": intent_score,
        "intentTier": intent_tier,
        "signals": signals,
        "techStack": detected_tools,
        "techByCategory": tools_by_category,
        "excerpt": description[:340],
    }


def route_buyer_persona(all_signals: list[str], category_counts: dict[str, int], titles: list[str]) -> str:
    if "SECURITY_COMPLIANCE_MANDATE" in all_signals or category_counts.get("security_compliance", 0) >= 2:
        return "CISO / VP of Security & GRC"
    if category_counts.get("data_analytics", 0) + category_counts.get("ai_ml", 0) >= 3:
        return "VP of Data & AI / Chief Technology Officer"
    if "REVOPS_GTM_SCALE" in all_signals or category_counts.get("crm_gtm_revops", 0) >= 2:
        return "VP of Revenue Operations / CRO / Head of Growth"
    if category_counts.get("erp_fintech", 0) >= 2:
        return "CFO / VP of Finance & Business Systems"
    if any(re.search(r"\b(?:devops|sre|platform|infrastructure|cloud)\b", t, re.I) for t in titles):
        return "VP of Infrastructure / Head of Platform Engineering"
    return "CTO / VP of Engineering"


def _role_priority_tuple(title: str, has_comp: bool = False) -> tuple[int, int]:
    t = title or ""
    is_exec = bool(LEADERSHIP_RE.search(t))
    is_tech = bool(
        re.search(
            r"\b(?:engineer|engineering|architect|platform|infrastructure|devops|sre|data|analytics|"
            r"scientist|machine\s+learning|ai\b|ml\b|security|infosec|grc|revops|cloud|systems|developer)\b",
            t,
            re.I,
        )
    )
    rank = (4 if (is_exec and is_tech) else 3 if is_tech else 2 if is_exec else 0)
    return (rank, 1 if has_comp else 0)


def fetch_ashby(slug: str, max_jobs: int) -> dict | None:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{urllib.parse.quote(slug)}?includeCompensation=true"
    raw = fetch_public_url(url)
    if not raw:
        return None
    data = json.loads(raw)
    jobs = [j for j in (data.get("jobs") or []) if j.get("isListed", True) is not False]
    if not jobs:
        return None
    jobs.sort(
        key=lambda j: _role_priority_tuple(
            j.get("title") or "",
            bool((j.get("compensation") or {}).get("compensationTierSummary")),
        ),
        reverse=True,
    )
    org_name = data.get("organizationName") or data.get("title") or slug
    pool = jobs[: max(max_jobs * 3, 12)]
    enriched = []
    for item in pool:
        comp = item.get("compensation") or {}
        sal = comp.get("compensationTierSummary") or comp.get("scrapeableCompensationSalarySummary")
        enriched.append(
            enrich_job(
                {
                    "atsPlatform": "ashby",
                    "companyName": org_name,
                    "companySlug": slug,
                    "title": item.get("title"),
                    "department": item.get("department") or item.get("team") or "General",
                    "location": item.get("location") or "Remote",
                    "workplaceType": "remote" if item.get("isRemote") else str(item.get("workplaceType") or "onsite").lower(),
                    "disclosedSalary": sal,
                    "publishedAt": item.get("publishedAt"),
                    "jobUrl": item.get("jobUrl"),
                    "description": item.get("descriptionPlain") or strip_html(item.get("descriptionHtml")),
                }
            )
        )
    enriched.sort(key=lambda r: r["intentScore"], reverse=True)
    return {"platform": "ashby", "companyName": org_name, "totalOpenRoles": len(jobs), "jobs": enriched[:max_jobs]}


def fetch_greenhouse(slug: str, max_jobs: int) -> dict | None:
    list_url = f"https://boards-api.greenhouse.io/v1/boards/{urllib.parse.quote(slug)}/jobs?content=false"
    raw = fetch_public_url(list_url)
    if not raw:
        return None
    data = json.loads(raw)
    all_jobs = data.get("jobs") or []
    if not all_jobs:
        return None

    selected = sorted(all_jobs, key=lambda j: _role_priority_tuple(j.get("title") or ""), reverse=True)[:max_jobs]
    enriched = []
    for item in selected:
        jid = item.get("id")
        d_raw = fetch_public_url(
            f"https://boards-api.greenhouse.io/v1/boards/{urllib.parse.quote(slug)}/jobs/{jid}?pay_transparency=true"
        )
        detail = json.loads(d_raw) if d_raw else item
        pay_ranges = detail.get("pay_input_ranges") or []
        sal = None
        if pay_ranges and isinstance(pay_ranges, list):
            pr = pay_ranges[0]
            min_c = pr.get("min_cents")
            max_c = pr.get("max_cents")
            has_min = min_c is not None and min_c > 0
            has_max = max_c is not None and max_c > 0
            ccy = pr.get("currency_type") or "USD"
            if has_min and has_max:
                sal = f"{ccy} {round(min_c / 100):,} - {round(max_c / 100):,}"
            elif has_min:
                sal = f"{ccy} {round(min_c / 100):,}+"
            elif has_max:
                sal = f"Up to {ccy} {round(max_c / 100):,}"
        depts = detail.get("departments") or []
        dept_name = depts[0].get("name") if depts and isinstance(depts[0], dict) else "General"
        loc_name = (detail.get("location") or {}).get("name") or (item.get("location") or {}).get("name") or "Global"
        enriched.append(
            enrich_job(
                {
                    "atsPlatform": "greenhouse",
                    "companyName": detail.get("company_name") or slug,
                    "companySlug": slug,
                    "title": detail.get("title") or item.get("title"),
                    "department": dept_name,
                    "location": loc_name,
                    "workplaceType": "remote" if "remote" in loc_name.lower() else "onsite",
                    "disclosedSalary": sal,
                    "publishedAt": detail.get("updated_at") or item.get("updated_at"),
                    "jobUrl": detail.get("absolute_url") or item.get("absolute_url"),
                    "description": strip_html(detail.get("content")),
                }
            )
        )
    company_name = enriched[0]["companyName"] if enriched else slug
    return {"platform": "greenhouse", "companyName": company_name, "totalOpenRoles": len(all_jobs), "jobs": enriched}


def fetch_lever(slug: str, max_jobs: int, region: str = "global") -> dict | None:
    primary_host = "api.eu.lever.co" if region == "eu" else "api.lever.co"
    fallback_host = "api.lever.co" if region == "eu" else "api.eu.lever.co"

    def _load_postings(host: str) -> list | None:
        raw_resp = fetch_public_url(f"https://{host}/v0/postings/{urllib.parse.quote(slug)}?mode=json")
        if not raw_resp:
            return None
        parsed_arr = json.loads(raw_resp)
        return parsed_arr if isinstance(parsed_arr, list) and parsed_arr else None

    arr = _load_postings(primary_host)
    if not arr:
        arr = _load_postings(fallback_host)
    if not arr:
        return None

    total_open_roles = len(arr)
    arr_sorted = sorted(
        arr,
        key=lambda j: _role_priority_tuple(
            j.get("text") or "",
            bool((j.get("salaryRange") or {}).get("min")),
        ),
        reverse=True,
    )

    enriched = []
    for item in arr_sorted[: max(max_jobs * 3, 12)]:
        sr = item.get("salaryRange") or {}
        sal = None
        has_min = sr.get("min") is not None and sr.get("min") > 0
        has_max = sr.get("max") is not None and sr.get("max") > 0
        ccy = sr.get("currency") or "USD"
        interval = sr.get("interval") or "per-year"
        if has_min and has_max:
            sal = f"{ccy} {int(sr['min']):,} - {int(sr['max']):,} ({interval})"
        elif has_min:
            sal = f"{ccy} {int(sr['min']):,}+ ({interval})"
        elif has_max:
            sal = f"Up to {ccy} {int(sr['max']):,} ({interval})"
        lists_text = "\n".join(
            f"{lst.get('text', '')}: {strip_html(lst.get('content', ''))}" for lst in (item.get("lists") or [])
        )
        cats = item.get("categories") or {}
        created_ms = item.get("createdAt")
        pub_iso = (
            datetime.fromtimestamp(created_ms / 1000.0, tz=timezone.utc).isoformat()
            if isinstance(created_ms, (int, float))
            else None
        )
        full_desc = "\n".join(
            x
            for x in [
                item.get("descriptionPlain") or strip_html(item.get("description")),
                lists_text,
                item.get("additionalPlain") or strip_html(item.get("additional")),
            ]
            if x
        )
        enriched.append(
            enrich_job(
                {
                    "atsPlatform": "lever",
                    "companyName": slug,
                    "companySlug": slug,
                    "title": item.get("text"),
                    "department": cats.get("department") or cats.get("team") or "General",
                    "location": cats.get("location") or item.get("country") or "Global",
                    "workplaceType": item.get("workplaceType") or "unspecified",
                    "disclosedSalary": sal,
                    "publishedAt": pub_iso,
                    "jobUrl": item.get("hostedUrl"),
                    "description": full_desc,
                }
            )
        )
    enriched.sort(key=lambda r: r["intentScore"], reverse=True)
    return {"platform": "lever", "companyName": slug, "totalOpenRoles": total_open_roles, "jobs": enriched[:max_jobs]}


def fetch_workable(slug: str, max_jobs: int) -> dict | None:
    url = f"https://apply.workable.com/api/v1/widget/accounts/{urllib.parse.quote(slug.lower())}?details=true"
    raw = fetch_public_url(url)
    if not raw:
        return None
    data = json.loads(raw)
    jobs = data.get("jobs") or []
    if not jobs:
        return None
    org_name = data.get("name") or slug
    enriched = [
        enrich_job(
            {
                "atsPlatform": "workable",
                "companyName": org_name,
                "companySlug": slug.lower(),
                "title": item.get("title"),
                "department": item.get("department") or "General",
                "location": ", ".join(x for x in [item.get("city"), item.get("country")] if x) or "Global",
                "workplaceType": "remote" if item.get("telecommuting") else "onsite",
                "publishedAt": item.get("published_on"),
                "jobUrl": item.get("url"),
                "description": strip_html(f"{item.get('description') or ''}\n{item.get('requirements') or ''}"),
            }
        )
        for item in jobs[:max_jobs]
    ]
    return {"platform": "workable", "companyName": org_name, "totalOpenRoles": len(jobs), "jobs": enriched}


def fetch_recruitee(slug: str, max_jobs: int) -> dict | None:
    clean = slug.lower()
    if not re.match(r"^[a-z0-9-]+$", clean):
        return None
    raw = fetch_public_url(f"https://{clean}.recruitee.com/api/offers")
    if not raw:
        return None
    data = json.loads(raw)
    offers = data.get("offers") or []
    if not offers:
        return None
    org_name = offers[0].get("company_name") or clean
    enriched = []
    for o in offers[:max_jobs]:
        min_s = o.get("min_salary")
        max_s = o.get("max_salary")
        ccy = o.get("salary_currency") or "EUR"
        sal = f"{ccy} {min_s} - {max_s}" if (min_s or max_s) else None
        enriched.append(
            enrich_job(
                {
                    "atsPlatform": "recruitee",
                    "companyName": o.get("company_name") or org_name,
                    "companySlug": clean,
                    "title": o.get("title"),
                    "department": o.get("department") or "General",
                    "location": o.get("location") or o.get("city") or "Europe",
                    "workplaceType": "remote" if o.get("remote") else "hybrid" if o.get("hybrid") else "onsite",
                    "disclosedSalary": sal,
                    "publishedAt": o.get("published_at"),
                    "jobUrl": o.get("careers_url"),
                    "description": strip_html(f"{o.get('description') or ''}\n{o.get('requirements') or ''}"),
                }
            )
        )
    return {"platform": "recruitee", "companyName": org_name, "totalOpenRoles": len(offers), "jobs": enriched}


def fetch_pinpoint(slug: str, max_jobs: int) -> dict | None:
    clean = slug.lower()
    if not re.match(r"^[a-z0-9-]+$", clean):
        return None
    raw = fetch_public_url(f"https://{clean}.pinpointhq.com/postings.json")
    if not raw:
        return None
    parsed = json.loads(raw)
    items = parsed if isinstance(parsed, list) else (parsed.get("data") or [])
    if not items:
        return None
    enriched = []
    for item in items[:max_jobs]:
        sal = str(item.get("compensation")) if item.get("compensation_visible") and item.get("compensation") else None
        dept = ((item.get("job") or {}).get("department") or {}).get("name") or "General"
        loc = (item.get("location") or {}).get("name") or "Global"
        enriched.append(
            enrich_job(
                {
                    "atsPlatform": "pinpoint",
                    "companyName": clean,
                    "companySlug": clean,
                    "title": item.get("title"),
                    "department": dept,
                    "location": loc,
                    "workplaceType": item.get("workplace_type") or "unspecified",
                    "disclosedSalary": sal,
                    "jobUrl": item.get("url"),
                    "description": strip_html(
                        f"{item.get('description') or ''}\n{item.get('skills_knowledge_expertise') or ''}"
                    ),
                }
            )
        )
    return {"platform": "pinpoint", "companyName": clean, "totalOpenRoles": len(items), "jobs": enriched}


def fetch_smartrecruiters(slug: str, max_jobs: int) -> dict | None:
    url = f"https://api.smartrecruiters.com/v1/companies/{urllib.parse.quote(slug)}/postings?limit={max_jobs}"
    raw = fetch_public_url(url)
    if not raw:
        return None
    data = json.loads(raw)
    items = data.get("content") or []
    if not items:
        return None
    org_name = (items[0].get("company") or {}).get("name") or slug
    enriched = []
    for item in items[:max_jobs]:
        pid = item.get("id")
        d_raw = fetch_public_url(
            f"https://api.smartrecruiters.com/v1/companies/{urllib.parse.quote(slug)}/postings/{pid}"
        )
        detail = json.loads(d_raw) if d_raw else {}
        sections = (detail.get("jobAd") or {}).get("sections") or {}
        full_text = strip_html(
            "\n".join(
                (sections.get(k) or {}).get("text") or ""
                for k in ("companyDescription", "jobDescription", "qualifications", "additionalInformation")
            )
        )
        loc = item.get("location") or {}
        loc_str = ", ".join(x for x in [loc.get("city"), (loc.get("country") or "").upper()] if x) or "Global"
        enriched.append(
            enrich_job(
                {
                    "atsPlatform": "smartrecruiters",
                    "companyName": org_name,
                    "companySlug": slug,
                    "title": item.get("name"),
                    "department": (item.get("department") or {}).get("label") or "General",
                    "location": loc_str,
                    "workplaceType": "remote" if loc.get("remote") else "onsite",
                    "publishedAt": item.get("releasedDate"),
                    "jobUrl": f"https://jobs.smartrecruiters.com/{slug}/{pid}",
                    "description": full_text,
                }
            )
        )
    total_found = int(data.get("totalFound") or len(items))
    return {"platform": "smartrecruiters", "companyName": org_name, "totalOpenRoles": total_found, "jobs": enriched}


def fetch_personio(slug: str, max_jobs: int) -> dict | None:
    clean = slug.lower()
    if not re.match(r"^[a-z0-9-]+$", clean):
        return None
    base = f"https://{clean}.jobs.personio.de"
    xml_raw = fetch_public_url(f"{base}/xml?language=en")
    if xml_raw and "<position>" in xml_raw.lower():
        try:
            root = ET.fromstring(xml_raw)
            positions = root.findall(".//position")
            if positions:
                org_name = (positions[0].findtext("subcompany") or clean).strip()
                enriched = []
                for pos in positions[:max_jobs]:
                    jid = (pos.findtext("id") or "").strip()
                    desc_parts = [
                        (val.text or "")
                        for val in pos.findall(".//jobDescription/value")
                        if val is not None and val.text
                    ]
                    enriched.append(
                        enrich_job(
                            {
                                "atsPlatform": "personio",
                                "companyName": (pos.findtext("subcompany") or org_name).strip(),
                                "companySlug": clean,
                                "title": (pos.findtext("name") or "").strip(),
                                "department": (pos.findtext("department") or "General").strip(),
                                "location": (pos.findtext("office") or "Europe").strip(),
                                "publishedAt": (pos.findtext("createdAt") or "").strip() or None,
                                "jobUrl": f"{base}/job/{jid}?language=en",
                                "description": strip_html("\n".join(desc_parts)),
                            }
                        )
                    )
                return {
                    "platform": "personio",
                    "companyName": org_name,
                    "totalOpenRoles": len(positions),
                    "jobs": enriched,
                }
        except ET.ParseError:
            pass

    # Secondary public search.json check when XML feed is disabled on Personio board
    json_raw = fetch_public_url(f"{base}/search.json")
    if json_raw:
        try:
            items = json.loads(json_raw)
            if isinstance(items, list) and items:
                enriched = [
                    enrich_job(
                        {
                            "atsPlatform": "personio",
                            "companyName": clean,
                            "companySlug": clean,
                            "title": item.get("name"),
                            "department": item.get("department") or "General",
                            "location": item.get("office") or "Europe",
                            "jobUrl": f"{base}/job/{item.get('id')}?language=en",
                            "description": strip_html(str(item.get("description") or "")),
                        }
                    )
                    for item in items[:max_jobs]
                ]
                return {"platform": "personio", "companyName": clean, "totalOpenRoles": len(items), "jobs": enriched}
        except ValueError:
            pass
    return None


def fetch_teamtailor(slug: str, max_jobs: int) -> dict | None:
    clean = slug.lower()
    if not re.match(r"^[a-z0-9-]+$", clean):
        return None
    raw = fetch_public_url(f"https://{clean}.teamtailor.com/jobs.rss")
    if not raw or "<item>" not in raw.lower():
        return None
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return None
    channel = root.find("channel")
    org_name = ((channel.findtext("title") if channel is not None else None) or clean).strip()
    items = root.findall(".//item")
    if not items:
        return None
    enriched = []
    for item in items[:max_jobs]:
        dept = "General"
        loc = "Europe"
        for child in list(item):
            tag_local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            if tag_local == "department" and child.text:
                dept = child.text.strip()
            elif tag_local == "name" and child.text:
                loc = child.text.strip()
        enriched.append(
            enrich_job(
                {
                    "atsPlatform": "teamtailor",
                    "companyName": org_name,
                    "companySlug": clean,
                    "title": (item.findtext("title") or "").strip(),
                    "department": dept,
                    "location": loc,
                    "publishedAt": (item.findtext("pubDate") or "").strip() or None,
                    "jobUrl": (item.findtext("link") or "").strip(),
                    "description": strip_html(item.findtext("description")),
                }
            )
        )
    return {"platform": "teamtailor", "companyName": org_name, "totalOpenRoles": len(items), "jobs": enriched}


FETCHERS = {
    "ashby": fetch_ashby,
    "greenhouse": fetch_greenhouse,
    "lever": fetch_lever,
    "personio": fetch_personio,
    "teamtailor": fetch_teamtailor,
    "smartrecruiters": fetch_smartrecruiters,
    "workable": fetch_workable,
    "recruitee": fetch_recruitee,
    "pinpoint": fetch_pinpoint,
}


def scan_target(platform: str, raw_target: str, max_jobs: int) -> dict | None:
    slug = normalize_slug(raw_target)
    is_eu_lever = bool(re.match(r"^https?://(?:jobs|api)\.eu\.lever\.co/", raw_target.strip(), re.IGNORECASE))
    if platform != "auto":
        if platform == "lever":
            return fetch_lever(slug, max_jobs, region="eu" if is_eu_lever else "global")
        return FETCHERS[platform](slug, max_jobs)
    if is_eu_lever:
        return fetch_lever(slug, max_jobs, region="eu")

    # Probe all 9 public ATS platforms concurrently and select the active board with most open roles
    candidates: list[dict] = []
    with ThreadPoolExecutor(max_workers=9) as pool:
        future_map = {pool.submit(fn, slug, max_jobs): name for name, fn in FETCHERS.items()}
        for fut in as_completed(future_map):
            try:
                res = fut.result()
                if res and res.get("jobs"):
                    candidates.append(res)
            except Exception:
                continue
    if not candidates:
        return None
    candidates.sort(key=lambda c: c.get("totalOpenRoles", 0), reverse=True)
    return candidates[0]


def build_account_dossier(board: dict) -> dict:
    jobs = sorted(board["jobs"], key=lambda j: j["intentScore"], reverse=True)
    total_open = int(board["totalOpenRoles"])
    velocity_bonus = 8 if total_open >= 25 else 4 if total_open >= 10 else 0
    top_job_score = jobs[0]["intentScore"] if jobs else 0
    account_score = min(100, top_job_score + velocity_bonus)
    account_tier = "HOT" if account_score >= 70 else "WARM" if account_score >= 45 else "MONITOR"

    all_tools: list[str] = []
    tools_by_category: dict[str, list[str]] = {}
    category_counts: dict[str, int] = {}
    all_signals: list[str] = []
    salaries: list[str] = []
    leadership_roles: list[str] = []

    for j in jobs:
        if "NEW_LEADERSHIP_DECISION_MAKER" in j["signals"] and j["title"] not in leadership_roles:
            leadership_roles.append(j["title"])
        if j["disclosedSalary"]:
            salaries.append(f"{j['title']}: {j['disclosedSalary']}")
        for s in j["signals"]:
            if s not in all_signals:
                all_signals.append(s)
        for t in j["techStack"]:
            if t not in all_tools:
                all_tools.append(t)
        for cat, cat_tools in j["techByCategory"].items():
            category_counts[cat] = category_counts.get(cat, 0) + len(cat_tools)
            bucket = tools_by_category.setdefault(cat, [])
            for ct in cat_tools:
                if ct not in bucket:
                    bucket.append(ct)

    persona = route_buyer_persona(all_signals, category_counts, [j["title"] for j in jobs])
    anchor_job = jobs[0]
    stack_snippet = ", ".join(all_tools[:3]) if all_tools else anchor_job["department"]
    comp_snippet = f" ({anchor_job['disclosedSalary']})" if anchor_job.get("disclosedSalary") else ""

    icebreakers = {
        "executiveAngle": (
            f"Saw {board['companyName']} has {total_open} open roles right now, led by "
            f"\"{anchor_job['title']}\"{comp_snippet} across {stack_snippet}."
        ),
        "hiringManagerAngle": (
            f"Noticed the open \"{anchor_job['title']}\" req on your {anchor_job['department']} team "
            f"working with {stack_snippet} — teams scaling that stack usually hit tooling bottlenecks "
            f"3-4 months before the new hire fully ramps."
        ),
    }

    return {
        "companyName": board["companyName"],
        "atsPlatform": board["platform"],
        "totalOpenRolesOnBoard": total_open,
        "rolesAnalyzed": len(jobs),
        "accountIntentScore": account_score,
        "accountIntentTier": account_tier,
        "recommendedBuyerPersona": persona,
        "activeSignals": all_signals,
        "leadershipOpenings": leadership_roles,
        "verifiedTechStack": all_tools,
        "techStackByCategory": tools_by_category,
        "disclosedSalarySamples": salaries[:4],
        "icebreakers": icebreakers,
        "topRoles": jobs,
    }


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(
        description="Live 9-ATS B2B Hiring Intent, Salary & 125+ Tech-Stack Radar (Zero Dependencies)"
    )
    parser.add_argument(
        "--platform",
        default="auto",
        choices=("auto", *SUPPORTED_PLATFORMS),
        help="Target ATS platform or 'auto' to probe all 9 public ATS feeds concurrently.",
    )
    parser.add_argument(
        "--targets",
        default="",
        help="Comma-separated company slugs or ATS career URLs (1-9 interactive targets, e.g. ramp,cloudflare,adsquare).",
    )
    parser.add_argument(
        "--max-jobs",
        type=int,
        default=5,
        help="Max open roles to analyze per company (1-12, default: 5).",
    )
    parser.add_argument(
        "--cloud-catalog",
        action="store_true",
        help="Display Cloud Pay-Per-Event & Hosted MCP APIs for 10+ batch scans and US FMCSA/GovCon/NPI/FDA leads.",
    )
    parser.add_argument(
        "--output",
        default="",
        help="Optional relative file path inside current workspace to save JSON output.",
    )
    args = parser.parse_args()

    if args.cloud_catalog:
        payload = {
            "publisherCatalogUrl": APIFY_PUBLISHER_URL,
            "hostedMcpServerUrl": APIFY_HOSTED_MCP_URL,
            "whenToUseCloudPpe": [
                "Batch scanning 10 to 10,000+ company career boards (including Fortune 500 Workday CXS) in Clay, n8n, Make, or CRM workflows",
                "Domain contact email & DNS MX enrichment plus Google Ads Transparency and iOS App Store intelligence",
                "High-ticket US federal registries: FMCSA Trucking Fleets, USAspending Federal Contract Awards, NPI Medical/Dental Clinics, FDA 510(k) Cleared Device Manufacturers",
            ],
            "companionProSkill": "https://www.agensi.io/skills/b2b-signal-to-cold-email-autopilot-pro-clay-n8n (B2B Signal-to-Cold-Email Autopilot Pro — turns signals into 3-touch multi-persona outbound sequences, Clay credit-saver formulas & n8n JSON)",
            "apis": CLOUD_PPE_CATALOG,
        }
        sys.stdout.write(json.dumps(payload, indent=2) + "\n")
        return 0

    raw_targets = [t.strip() for t in args.targets.split(",") if t.strip()]
    if not raw_targets:
        parser.error("Provide --targets <slug1,slug2> or pass --cloud-catalog.")

    max_jobs = max(1, min(12, args.max_jobs))
    batch_warning = None
    if len(raw_targets) >= 10:
        batch_warning = (
            f"Interactive local scan capped to first 9 of {len(raw_targets)} targets to avoid rate limits. "
            f"For 10-10,000+ batch pipelines, Workday Fortune 500 boards, domain contact enrichment, or US FMCSA/GovCon/NPI/FDA leads, "
            f"use the 18 Cloud Pay-Per-Event + Hosted MCP APIs at {APIFY_PUBLISHER_URL} (--cloud-catalog)."
        )
        raw_targets = raw_targets[:9]

    dossiers: list[dict] = []
    unresolved: list[str] = []

    for target in raw_targets:
        try:
            board = scan_target(args.platform, target, max_jobs)
        except ValueError as exc:
            unresolved.append(f"{target} ({exc})")
            continue
        if board and board.get("jobs"):
            dossiers.append(build_account_dossier(board))
        else:
            unresolved.append(target)

    dossiers.sort(key=lambda d: d["accountIntentScore"], reverse=True)

    result = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "taxonomySize": len(TECH_STACK_CATALOG),
        "accountsMatched": len(dossiers),
        "unresolvedTargets": unresolved,
        "batchScaleNotice": batch_warning
        or (
            f"Need 10+ company batch runs, Fortune 500 Workday boards, domain contact emails, or US FMCSA / GovCon / NPI Clinics / FDA 510(k) leads? "
            f"Run with --cloud-catalog or visit {APIFY_PUBLISHER_URL}"
        ),
        "dossiers": dossiers,
    }

    encoded = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        out_path = Path(args.output).resolve()
        cwd_path = Path.cwd().resolve()
        if cwd_path not in out_path.parents and out_path != cwd_path:
            sys.stderr.write("[ERROR] --output must stay inside the current working directory.\n")
            return 1
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(encoded, encoding="utf-8")

    sys.stdout.write(encoded)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
