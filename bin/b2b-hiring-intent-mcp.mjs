#!/usr/bin/env node
/**
 * b2b-hiring-intent-mcp v1.6.0 — Open-Core Zero-Dependency 10-ATS MCP Server & CLI
 *
 * Inspect, fingerprint, compare, and activate B2B hiring-intent signals across 10 ATS platforms
 * (Workday, Greenhouse, Lever, Ashby, Personio, Teamtailor, SmartRecruiters, Workable, Recruitee, Pinpoint)
 * locally over stdio MCP (`Claude Desktop`, `Cursor`, `VS Code Copilot`), or scale to 100–10,000+ targets
 * on schedule via our 19 hosted Cloud Pay-Per-Event APIs:
 *   https://apify.com/yan0lovesha
 */

import fs from 'node:fs';
import https from 'node:https';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const SERVER_INFO = {
    name: 'b2b-hiring-intent-mcp',
    version: '1.6.0',
};

const CLOUD_ACTOR_MAP = {
    multi_ats: 'yan0lovesha~multi-ats-jobs-hiring-intent',
    workday: 'yan0lovesha~workday-jobs-scraper',
    greenhouse: 'yan0lovesha~greenhouse-jobs-hiring-intent',
    lever: 'yan0lovesha~lever-jobs-hiring-intent',
    ashby: 'yan0lovesha~ashby-jobs-hiring-intent',
    personio: 'yan0lovesha~personio-jobs-hiring-intent',
    teamtailor: 'yan0lovesha~teamtailor-jobs-hiring-signal',
    smartrecruiters: 'yan0lovesha~smartrecruiters-jobs-hiring-intent',
    workable: 'yan0lovesha~workable-jobs-hiring-intent',
    recruitee: 'yan0lovesha~recruitee-jobs-hiring-intent',
    pinpoint: 'yan0lovesha~pinpoint-jobs-hiring-intent',
    google_ads_transparency: 'yan0lovesha~google-ads-transparency-scraper',
    linkedin_ad_library: 'yan0lovesha~linkedin-ad-library-scraper',
    website_contact_finder: 'yan0lovesha~website-contact-email-finder',
    apple_app_store: 'yan0lovesha~apple-app-store-scraper',
    us_fmcsa_trucking: 'yan0lovesha~us-fmcsa-trucking-fleet-leads',
    us_federal_contracts: 'yan0lovesha~us-federal-contracts-awards-leads',
    us_npi_clinics: 'yan0lovesha~us-npi-medical-dental-clinics-leads',
    fda_510k: 'yan0lovesha~fda-510k-medical-device-leads',
};

// 150+ enterprise software & compliance rules across 9 B2B categories
export const TECH_RULES = [
    // 1. CRM & Sales / RevOps
    { name: 'Salesforce', category: 'crm_sales', pattern: /\bsalesforce\b|\bsfdc\b/i },
    { name: 'HubSpot', category: 'crm_sales', pattern: /\bhubspot\b/i },
    { name: 'Pipedrive', category: 'crm_sales', pattern: /\bpipedrive\b/i },
    { name: 'Dynamics 365', category: 'crm_sales', pattern: /\bdynamics\s*365\b|\bms\s*dynamics\b/i },
    { name: 'Gong', category: 'crm_sales', pattern: /\bgong\.io\b|\bgong\s+(?:revenue|call|intelligence|platform|crm|recordings?)/i },
    {
        name: 'Outreach',
        category: 'crm_sales',
        pattern:
            /\boutreach\.io\b|\boutreach\s+(?:sequences?|cadences?|sales\s+engagement)\b|(?:hubspot|salesforce|salesloft|apollo|gong|clay)[,\s/+&]+(?:[a-z0-9.]+\s*,\s*)*outreach\b|\boutreach[,\s/+&]+(?:salesloft|gong|apollo|hubspot|salesforce|clay)\b/i,
    },
    { name: 'Salesloft', category: 'crm_sales', pattern: /\bsalesloft\b/i },
    {
        name: 'Clay',
        category: 'crm_sales',
        pattern:
            /\bclay\.com\b|\bclay\s+(?:tables?|waterfalls?|enrichment|gent)\b|(?:apollo|hubspot|outreach|instantly|smartlead|crm|zapier|n8n|make)[,\s/+&]+(?:[a-z0-9.]+\s*,\s*)*clay\b|\bclay[,\s/+&]+(?:apollo|instantly|smartlead|outreach|hubspot|n8n)\b/i,
    },
    { name: 'Apollo.io', category: 'crm_sales', pattern: /\bapollo\.io\b|(?:cognism|zoominfo|sales\s+navigator|clay|outreach)[,\s/+&]+apollo\b/i },
    { name: 'Cognism', category: 'crm_sales', pattern: /\bcognism\b/i },
    { name: 'ZoomInfo', category: 'crm_sales', pattern: /\bzoominfo\b/i },
    { name: 'LinkedIn Sales Navigator', category: 'crm_sales', pattern: /\bsales\s+navigator\b/i },
    { name: '6sense', category: 'crm_sales', pattern: /\b6sense\b/i },
    { name: 'Clari', category: 'crm_sales', pattern: /\bclari\b/i },
    { name: 'DealHub', category: 'crm_sales', pattern: /\bdealhub\b/i },
    { name: 'Instantly / Smartlead', category: 'crm_sales', pattern: /\binstantly\.ai\b|\bsmartlead(?:\.ai)?\b/i },

    // 2. Cloud & Infrastructure
    { name: 'AWS', category: 'cloud_infra', pattern: /\baws\b|\bamazon\s+web\s+services\b|\bec2\b|\blambda\b|\bs3\b|\beks\b/i },
    { name: 'Microsoft Azure', category: 'cloud_infra', pattern: /\bazure\b|\baks\b/i },
    { name: 'Google Cloud (GCP)', category: 'cloud_infra', pattern: /\bgcp\b|\bgoogle\s+cloud\b|\bgke\b/i },
    { name: 'Kubernetes', category: 'cloud_infra', pattern: /\bkubernetes\b|\bk8s\b|\beks\b|\bgke\b|\baks\b/i },
    { name: 'Docker', category: 'cloud_infra', pattern: /\bdocker\b|\bcontainerization\b/i },
    { name: 'Terraform', category: 'cloud_infra', pattern: /\bterraform\b/i },
    { name: 'OpenTofu', category: 'cloud_infra', pattern: /\bopentofu\b/i },
    { name: 'Pulumi', category: 'cloud_infra', pattern: /\bpulumi\b/i },
    { name: 'Ansible', category: 'cloud_infra', pattern: /\bansible\b/i },
    { name: 'Cloudflare', category: 'cloud_infra', pattern: /\bcloudflare\b/i },
    { name: 'Fastly', category: 'cloud_infra', pattern: /\bfastly\b/i },
    { name: 'Datadog', category: 'cloud_infra', pattern: /\bdatadog\b/i },
    { name: 'Grafana', category: 'cloud_infra', pattern: /\bgrafana\b/i },
    { name: 'Prometheus', category: 'cloud_infra', pattern: /\bprometheus\b/i },
    { name: 'OpenTelemetry', category: 'cloud_infra', pattern: /\bopentelemetry\b|\botel\b/i },
    { name: 'New Relic', category: 'cloud_infra', pattern: /\bnew\s*relic\b/i },
    { name: 'ArgoCD', category: 'cloud_infra', pattern: /\bargo\s*cd\b/i },
    { name: 'Helm', category: 'cloud_infra', pattern: /\bhelm\s+charts?\b|(?:kubernetes|k8s|argocd)[,\s/+&]+helm\b/i },
    { name: 'Vercel', category: 'cloud_infra', pattern: /\bvercel\b/i },

    // 3. Data & Analytics
    { name: 'Snowflake', category: 'data_analytics', pattern: /\bsnowflake\b/i },
    { name: 'Databricks', category: 'data_analytics', pattern: /\bdatabricks\b|\bdelta\s+lake\b/i },
    { name: 'BigQuery', category: 'data_analytics', pattern: /\bbigquery\b/i },
    { name: 'Redshift', category: 'data_analytics', pattern: /\bredshift\b/i },
    { name: 'dbt', category: 'data_analytics', pattern: /\bdbt\b/i },
    { name: 'Apache Airflow', category: 'data_analytics', pattern: /\bairflow\b/i },
    { name: 'Dagster', category: 'data_analytics', pattern: /\bdagster\b/i },
    { name: 'Prefect', category: 'data_analytics', pattern: /\bprefect\b/i },
    { name: 'Apache Kafka', category: 'data_analytics', pattern: /\bkafka\b|\bconfluent\b/i },
    { name: 'Redpanda', category: 'data_analytics', pattern: /\bredpanda\b/i },
    { name: 'Apache Spark', category: 'data_analytics', pattern: /\bapache\s+spark\b|\bpyspark\b|(?:hadoop|kafka|databricks|flink|airflow)[,\s/+&]+spark\b/i },
    { name: 'Apache Flink', category: 'data_analytics', pattern: /\bapache\s+flink\b|(?:kafka|spark)[,\s/+&]+flink\b|\bflink\b/i },
    { name: 'Looker', category: 'data_analytics', pattern: /\blooker\b/i },
    { name: 'Tableau', category: 'data_analytics', pattern: /\btableau\b/i },
    { name: 'Power BI', category: 'data_analytics', pattern: /\bpower\s*bi\b/i },
    { name: 'Metabase', category: 'data_analytics', pattern: /\bmetabase\b/i },
    { name: 'Fivetran', category: 'data_analytics', pattern: /\bfivetran\b/i },
    { name: 'Airbyte', category: 'data_analytics', pattern: /\bairbyte\b/i },
    { name: 'ClickHouse', category: 'data_analytics', pattern: /\bclickhouse\b/i },
    { name: 'PostgreSQL', category: 'data_analytics', pattern: /\bpostgresql\b|\bpostgres\b/i },
    { name: 'MySQL / MariaDB', category: 'data_analytics', pattern: /\bmysql\b|\bmariadb\b/i },
    { name: 'MongoDB', category: 'data_analytics', pattern: /\bmongodb\b/i },
    { name: 'Redis', category: 'data_analytics', pattern: /\bredis\b/i },
    { name: 'Elasticsearch', category: 'data_analytics', pattern: /\belasticsearch\b|\bopensearch\b/i },

    // 4. AI / ML / LLM Stack
    { name: 'OpenAI / GPT', category: 'ai_llm', pattern: /\bopenai\b|\bgpt-4[o]?\b|\bgpt-5\b|\bchatgpt\b/i },
    { name: 'Anthropic / Claude', category: 'ai_llm', pattern: /\banthropic\b|\bclaude\s+(?:3|4|sonnet|opus|code|api|models?)\b/i },
    { name: 'Google Gemini / Vertex AI', category: 'ai_llm', pattern: /\bvertex\s+ai\b|\bgemini\s+(?:1\.5|2\.0|pro|flash|api|models?)\b/i },
    { name: 'AWS Bedrock', category: 'ai_llm', pattern: /\b(?:aws|amazon)\s+bedrock\b/i },
    { name: 'LangChain / LangGraph', category: 'ai_llm', pattern: /\blangchain\b|\blanggraph\b/i },
    { name: 'LlamaIndex', category: 'ai_llm', pattern: /\bllamaindex\b/i },
    { name: 'Pinecone', category: 'ai_llm', pattern: /\bpinecone\b/i },
    { name: 'Qdrant', category: 'ai_llm', pattern: /\bqdrant\b/i },
    { name: 'Weaviate', category: 'ai_llm', pattern: /\bweaviate\b|\bmilvus\b/i },
    { name: 'pgvector', category: 'ai_llm', pattern: /\bpgvector\b/i },
    { name: 'PyTorch', category: 'ai_llm', pattern: /\bpytorch\b/i },
    { name: 'TensorFlow', category: 'ai_llm', pattern: /\btensorflow\b/i },
    { name: 'Hugging Face', category: 'ai_llm', pattern: /\bhugging\s*face\b/i },
    { name: 'vLLM', category: 'ai_llm', pattern: /\bvllm\b/i },
    { name: 'CUDA / TensorRT', category: 'ai_llm', pattern: /\bcuda\b|\btensorrt\b|\btriton\s+inference\b/i },
    { name: 'RAG / Agentic AI', category: 'ai_llm', pattern: /\bretrieval[- ]augmented\s+generation\b|\bllm\s+agents?\b|\bagentic\s+ai\b|\bmcp\s+servers?\b/i },
    { name: 'MLOps', category: 'ai_llm', pattern: /\bmlops\b|\bmlflow\b|\bkubeflow\b|\bweights\s*(?:&|and)\s*biases\b|\bwandb\b/i },

    // 5. DevTools, Languages & Frameworks
    { name: 'TypeScript', category: 'devtools_engineering', pattern: /\btypescript\b/i },
    { name: 'JavaScript', category: 'devtools_engineering', pattern: /\bjavascript\b|\bes6\b/i },
    { name: 'Python', category: 'devtools_engineering', pattern: /\bpython\b/i },
    {
        name: 'Go (Golang)',
        category: 'devtools_engineering',
        pattern: /\bgolang\b|(?:python|rust|java|c\+\+|typescript|kotlin|node\.?js)[,\s/+&]+go\b|\bgo[,\s/+&]+(?:python|rust|java|typescript|kubernetes)\b/i,
    },
    { name: 'Rust', category: 'devtools_engineering', pattern: /\brust\b(?!\s*(?:free|proof|belt))/i },
    { name: 'Java', category: 'devtools_engineering', pattern: /\bjava\b(?!\s*script)/i },
    { name: 'C++', category: 'devtools_engineering', pattern: /(?:^|[\s,/(])c\+\+(?=$|[\s,/.)])/i },
    { name: 'C# / .NET', category: 'devtools_engineering', pattern: /(?:^|[\s,/(])c#(?=$|[\s,/.)])|(?:^|[\s,/(])\.net(?:\s*(?:core|framework|8|9))?\b|\basp\.net\b|\bcsharp\b/i },
    { name: 'Ruby on Rails', category: 'devtools_engineering', pattern: /\bruby\s+on\s+rails\b|\brails\b|\bruby\b/i },
    { name: 'PHP', category: 'devtools_engineering', pattern: /\bphp\b/i },
    { name: 'Symfony / Laravel', category: 'devtools_engineering', pattern: /\bsymfony\b|\blaravel\b/i },
    { name: 'Kotlin', category: 'devtools_engineering', pattern: /\bkotlin\b/i },
    { name: 'Swift', category: 'devtools_engineering', pattern: /\bswift\b(?!\s+(?:action|response|resolution))|\bswiftui\b/i },
    { name: 'React', category: 'devtools_engineering', pattern: /\breact(?:\.js|js)?\b|\breact\s+native\b/i },
    { name: 'Next.js', category: 'devtools_engineering', pattern: /\bnext\.?js\b/i },
    { name: 'Vue.js', category: 'devtools_engineering', pattern: /\bvue(?:\.js|js)?\b|\bnuxt\b/i },
    { name: 'Angular', category: 'devtools_engineering', pattern: /\bangular\b/i },
    { name: 'Node.js', category: 'devtools_engineering', pattern: /\bnode\.?js\b|\bnest\.?js\b/i },
    { name: 'Spring Boot', category: 'devtools_engineering', pattern: /\bspring\s*boot\b/i },
    { name: 'FastAPI / Django', category: 'devtools_engineering', pattern: /\bfastapi\b|\bdjango\b/i },
    { name: 'GraphQL', category: 'devtools_engineering', pattern: /\bgraphql\b/i },
    { name: 'gRPC', category: 'devtools_engineering', pattern: /\bgrpc\b|\bprotobuf\b/i },
    { name: 'RabbitMQ', category: 'devtools_engineering', pattern: /\brabbitmq\b/i },
    { name: 'GitHub Actions', category: 'devtools_engineering', pattern: /\bgithub\s+actions\b/i },
    { name: 'GitLab CI', category: 'devtools_engineering', pattern: /\bgitlab\s*(?:ci|cd)?\b/i },
    { name: 'Sentry', category: 'devtools_engineering', pattern: /\bsentry\b/i },
    { name: 'Playwright / Cypress', category: 'devtools_engineering', pattern: /\bplaywright\b|\bcypress\b/i },

    // 6. ERP, ITSM, Finance & Billing
    { name: 'SAP', category: 'erp_finance', pattern: /\bsap\b(?:\s+s\/4hana|\s+hana|\s+business\s+one|\s+fi|\s+erp)?/i },
    { name: 'Oracle NetSuite', category: 'erp_finance', pattern: /\bnetsuite\b/i },
    { name: 'ServiceNow', category: 'erp_finance', pattern: /\bservicenow\b/i },
    { name: 'DATEV', category: 'erp_finance', pattern: /\bdatev\b/i },
    { name: 'Workday', category: 'erp_finance', pattern: /\bworkday\b/i },
    { name: 'Stripe', category: 'erp_finance', pattern: /\bstripe\b/i },
    { name: 'Adyen', category: 'erp_finance', pattern: /\badyen\b/i },
    { name: 'Chargebee / Zuora', category: 'erp_finance', pattern: /\bchargebee\b|\bzuora\b/i },
    { name: 'Coupa / Zip', category: 'erp_finance', pattern: /\bcoupa\b|\bziphq\b/i },
    { name: 'Spendesk / Moss / Payhawk', category: 'erp_finance', pattern: /\bspendesk\b|\bpayhawk\b|\bgetmoss\b|(?:datev|netsuite|sap)[,\s/+&]+moss\b/i },
    { name: 'Xero / QuickBooks', category: 'erp_finance', pattern: /\bxero\b|\bquickbooks\b|\bexact\s+online\b/i },
    { name: 'Anaplan / Pigment', category: 'erp_finance', pattern: /\banaplan\b|\bpigment\b/i },

    // 7. Security, Governance & Compliance
    { name: 'Okta', category: 'security_compliance', pattern: /\bokta\b/i },
    { name: 'Auth0', category: 'security_compliance', pattern: /\bauth0\b/i },
    { name: 'CrowdStrike', category: 'security_compliance', pattern: /\bcrowdstrike\b/i },
    { name: 'SentinelOne', category: 'security_compliance', pattern: /\bsentinelone\b/i },
    { name: 'Snyk', category: 'security_compliance', pattern: /\bsnyk\b/i },
    {
        name: 'Wiz',
        category: 'security_compliance',
        pattern: /\bwiz\.io\b|\bwiz\s+(?:cloud|security|cnapp|csp)\b|(?:snyk|crowdstrike|orca|lacework|prisma|okta|datadog)[,\s/+&]+wiz\b|\bwiz[,\s/+&]+(?:snyk|crowdstrike|orca|lacework|prisma)\b/i,
    },
    { name: 'Vanta', category: 'security_compliance', pattern: /\bvanta\b/i },
    { name: 'Drata', category: 'security_compliance', pattern: /\bdrata\b/i },
    { name: 'HashiCorp Vault', category: 'security_compliance', pattern: /\bhashicorp\s+vault\b|\bvault\s+secrets?\b/i },
    { name: 'Palo Alto Prisma', category: 'security_compliance', pattern: /\bprisma\s+cloud\b|\bpalo\s+alto\s+networks\b/i },
    { name: 'Splunk', category: 'security_compliance', pattern: /\bsplunk\b/i },
    { name: 'ISO 27001', category: 'security_compliance', pattern: /\biso\s*[/-]?\s*27001\b/i },
    { name: 'SOC 2', category: 'security_compliance', pattern: /\bsoc\s*2\b/i },
    { name: 'HIPAA', category: 'security_compliance', pattern: /\bhipaa\b/i },
    { name: 'FedRAMP', category: 'security_compliance', pattern: /\bfedramp\b|\bcmmc\b/i },
    { name: 'NIS2 / DORA', category: 'security_compliance', pattern: /\bnis\s*2\b|\bdora\s+(?:regulation|compliance)\b/i },
    { name: 'CSRD / ESG Reporting', category: 'security_compliance', pattern: /\bcsrd\b|\besrs\b|\bghg\s+protocol\b/i },

    // 8. Marketing, Product, CX & Collaboration
    { name: 'Marketo / Pardot', category: 'marketing_product', pattern: /\bmarketo\b|\bpardot\b/i },
    { name: 'Braze', category: 'marketing_product', pattern: /\bbraze\b/i },
    { name: 'Klaviyo', category: 'marketing_product', pattern: /\bklaviyo\b/i },
    { name: 'Segment', category: 'marketing_product', pattern: /\btwilio\s+segment\b|\bsegment\.com\b|(?:amplitude|mixpanel|braze|rudderstack)[,\s/+&]+segment\b/i },
    { name: 'Amplitude', category: 'marketing_product', pattern: /\bamplitude\b/i },
    { name: 'Mixpanel', category: 'marketing_product', pattern: /\bmixpanel\b/i },
    { name: 'PostHog', category: 'marketing_product', pattern: /\bposthog\b/i },
    { name: 'Google Analytics / GTM', category: 'marketing_product', pattern: /\bga4\b|\bgoogle\s+analytics\b|\bgoogle\s+tag\s+manager\b/i },
    { name: 'Zendesk', category: 'marketing_product', pattern: /\bzendesk\b/i },
    { name: 'Intercom', category: 'marketing_product', pattern: /\bintercom\b/i },
    { name: 'Gainsight / Planhat', category: 'marketing_product', pattern: /\bgainsight\b|\bplanhat\b/i },
    { name: 'Figma', category: 'marketing_product', pattern: /\bfigma\b/i },
    { name: 'Jira / Confluence', category: 'marketing_product', pattern: /\bjira\b|\bconfluence\b/i },
    { name: 'Linear', category: 'marketing_product', pattern: /(?:jira|notion|figma|github)[,\s/+&]+linear\b|\blinear\.app\b/i },
    { name: 'Notion', category: 'marketing_product', pattern: /\bnotion\b/i },
    { name: 'Slack', category: 'marketing_product', pattern: /\bslack\b/i },
    { name: 'Shopify', category: 'marketing_product', pattern: /\bshopify\b/i },

    // 9. HR & People Tech
    { name: 'Personio', category: 'hr_people', pattern: /\bpersonio\b/i },
    { name: 'Teamtailor', category: 'hr_people', pattern: /\bteamtailor\b/i },
    { name: 'Greenhouse', category: 'hr_people', pattern: /\bgreenhouse\b/i },
    { name: 'Lever', category: 'hr_people', pattern: /\blever\s+ats\b|(?:greenhouse|ashby|workday)[,\s/+&]+lever\b/i },
    { name: 'Ashby', category: 'hr_people', pattern: /\bashby\b/i },
    { name: 'Rippling / Deel', category: 'hr_people', pattern: /\brippling\b|\bdeel\b|\bremote\.com\b/i },
    { name: 'HiBob / BambooHR', category: 'hr_people', pattern: /\bhibob\b|\bbamboohr\b/i },
];

const SIGNAL_PATTERNS = [
    [
        'BUDGET_EXPANSION',
        22,
        /\b(?:rapidly\s+growing|scaling\s+rapidly|hyper[- ]?growth|newly\s+created\s+(?:role|position)|expanding\s+(?:our|the)\s+team|series\s+[a-d]\b|international\s+expansion|entering\s+new\s+markets|growing\s+fast|scale[- ]?up\s+phase)\b/i,
    ],
    [
        'TECH_MIGRATION_MODERNIZATION',
        26,
        /\b(?:greenfield|from\s+scratch|0\s+to\s+1|zero\s+to\s+one|cloud\s+migration|migrating\s+(?:from|to)|moderniz(?:e|ing)\s+(?:our|legacy)|re-?platform(?:ing)?|re-?architect(?:ing)?|shared\s+data\s+platform|next[- ]generation\s+platform)\b/i,
    ],
    [
        'COMPLIANCE_SECURITY_MANDATE',
        20,
        /\b(?:iso\s*[/-]?\s*27001|soc\s*2|nis\s*2|dora\s+compliance|csrd|eu\s+ai\s+act|fedramp|cmmc|regulatory\s+compliance|audit\s+readiness|carbon\s+accounting)\b/i,
    ],
    [
        'AI_TRANSFORMATION_INITIATIVE',
        22,
        /\b(?:ai[- ]native|genai|generative\s+ai|llm\s+(?:pipeline|agent|application|infrastructure)|conversational\s+intelligence|model\s+compression|rag\s+(?:architecture|pipeline)|mlops|ai\s+transformation|agentic\s+ai)\b/i,
    ],
    [
        'URGENT_HIRING_VELOCITY',
        14,
        /\b(?:start\s+date\s*:\s*asap|desired\s+start\s+date\s*\n*\s*asap|immediate\s+start|start\s+immediately|ab\s+sofort|earliest\s+possible\s+start)\b/i,
    ],
];

const LEGAL_COMPANY_STOPWORDS = new Set([
    'inc',
    'incorporated',
    'llc',
    'ltd',
    'limited',
    'gmbh',
    'corp',
    'corporation',
    'company',
    'co',
    'ag',
    'se',
    'plc',
    'ab',
    'bv',
    'sa',
    'sas',
    'technologies',
    'technology',
    'tech',
    'software',
    'systems',
    'labs',
    'group',
    'holdings',
    'international',
    'global',
    'the',
]);

const BRAND_VENDOR_ALIASES = {
    aws: ['amazon', 'aws'],
    'microsoft azure': ['microsoft', 'azure'],
    'google cloud (gcp)': ['google', 'gcp', 'alphabet'],
    'google gemini / vertex ai': ['google', 'gemini', 'alphabet'],
    'google analytics / gtm': ['google', 'alphabet'],
    'aws bedrock': ['amazon', 'aws'],
    'dynamics 365': ['microsoft'],
    'power bi': ['microsoft'],
    'github actions': ['github', 'microsoft'],
    'linkedin sales navigator': ['linkedin', 'microsoft'],
    'oracle netsuite': ['oracle', 'netsuite'],
    'palo alto prisma': ['paloalto', 'paloaltonetworks'],
    'jira / confluence': ['atlassian', 'jira', 'confluence'],
    segment: ['twilio', 'segment'],
    looker: ['google', 'looker'],
    tableau: ['salesforce', 'tableau'],
    slack: ['salesforce', 'slack'],
    'marketo / pardot': ['adobe', 'salesforce', 'marketo', 'pardot'],
};

export function isEmployerSelfBrand(toolName = '', companyName = '', companySlug = '', atsPlatform = '') {
    const toolLower = String(toolName || '').toLowerCase().trim();
    if (!toolLower) return false;

    const hostAts = String(atsPlatform || '').toLowerCase().trim();
    if (hostAts && toolLower === hostAts) return true;

    const rawCompanyTokens = `${companyName || ''} ${companySlug || ''}`
        .toLowerCase()
        .split(/[^a-z0-9+#]+/)
        .filter((tok) => tok.length >= 3 && !LEGAL_COMPANY_STOPWORDS.has(tok));
    if (!rawCompanyTokens.length) return false;

    const companySet = new Set(rawCompanyTokens);
    const compactCompany = rawCompanyTokens.join('');
    if (compactCompany.length >= 4) companySet.add(compactCompany);

    const toolTokens = toolLower
        .split(/[^a-z0-9+#]+/)
        .filter((tok) => tok.length >= 3 && !['ats', 'ci', 'cd', 'cloud', 'reporting', 'esg'].includes(tok));
    const aliasTokens = BRAND_VENDOR_ALIASES[toolLower] || [];
    for (const tok of [...toolTokens, ...aliasTokens]) {
        if (companySet.has(tok)) return true;
    }
    return false;
}

export function stripBoilerplateFooter(text = '') {
    const raw = String(text || '');
    if (!raw) return '';
    const footerRe =
        /\b(?:equal\s+opportunity\s+employer|is\s+an\s+equal\s+opportunity|e-?verify\s+participant|applicant\s+privacy\s+(?:notice|policy)|without\s+regard\s+to\s+race[\s,]+color|all\s+qualified\s+applicants\s+will\s+receive\s+consideration|pursuant\s+to\s+the\s+(?:san\s+francisco|los\s+angeles)\s+fair\s+chance|reasonable\s+accommodation\s+to\s+qualified\s+individuals)\b/i;
    const match = footerRe.exec(raw);
    if (match && match.index >= Math.min(280, Math.floor(raw.length * 0.35))) {
        return raw.slice(0, match.index).trim();
    }
    return raw;
}

export function withIndefiniteArticle(phrase = '') {
    const trimmed = String(phrase || '').trim();
    if (!trimmed) return 'a role';
    if (/^(?:a|an|the)\s+/i.test(trimmed)) return trimmed;
    const firstToken = trimmed.replace(/^[^A-Za-z0-9]+/, '').split(/[\s/-]+/)[0] || '';
    if (!firstToken) return `a ${trimmed}`;
    if (/^(?:AE|AI|EM|ERP|FPA|FP&A|HR|IT|LLM|ML|MLOps|NLP|OKR|R&D|RFP|ROI|SDK|SEO|SLA|SMB|SQL|SRE|SSO)(?:$|\b)/i.test(firstToken) && firstToken === firstToken.toUpperCase()) {
        return `an ${trimmed}`;
    }
    if (/^(?:iOS|MLOps)\b/.test(firstToken)) return `an ${trimmed}`;
    if (/^(?:uni|use|usu|utt|eu[a-z]|one\b)/i.test(firstToken)) return `a ${trimmed}`;
    if (/^(?:honest|hour|heir)/i.test(firstToken)) return `an ${trimmed}`;
    return /^[aeiou]/i.test(firstToken) ? `an ${trimmed}` : `a ${trimmed}`;
}

function normalizeValueClause(rawValue = '', fallback = 'ship faster without adding headcount') {
    let s = String(rawValue || '').trim() || fallback;
    s = s.replace(/[.!?\s]+$/g, '').trim();
    s = s.replace(/^(?:we\s+help\s+(?:[a-z0-9/& -]+\s+)?(?:teams|orgs|organizations|companies|leaders|engineers)\s+(?:to\s+)?)/i, '');
    if (/^(?:we|our\s+(?:platform|product|team|solution|software|tool))\s+/i.test(s)) {
        s = s.replace(/^(?:we|our\s+(?:platform|product|team|solution|software|tool))\s+/i, '');
        s = s.replace(
            /^(cuts|reduces|automates|eliminates|saves|helps|accelerates|streamlines|trims|lowers|improves|boosts)\b/i,
            (verb) => verb.slice(0, -1).toLowerCase(),
        );
    }
    s = s.replace(/^to\s+/i, '');
    const firstWord = s.split(/\s+/)[0] || '';
    if (firstWord.length > 1 && firstWord !== firstWord.toUpperCase()) {
        s = s[0].toLowerCase() + s.slice(1);
    }
    return s || fallback;
}

function decodeEntities(raw = '') {
    let s = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    for (let i = 0; i < 2; i++) {
        s = s
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/&euro;/g, '€');
    }
    return s;
}

function htmlToText(html = '') {
    return decodeEntities(html)
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function xmlTag(block, tag) {
    const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? decodeEntities(m[1]).trim() : '';
}

function xmlAllBlocks(xml, tag) {
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    const out = [];
    let m;
    while ((m = re.exec(xml)) !== null) out.push(m[1]);
    return out;
}

export function normalizeSeniority(title = '') {
    const lower = String(title || '').toLowerCase();
    if (/\b(?:chief|ceo|cto|cfo|cmo|cro|coo|ciso|cpo|vp\b|vice\s+president|svp\b|evp\b|managing\s+director|geschäftsführer)\b/.test(lower)) {
        return 'c_level_vp';
    }
    if (/\b(?:head\s+of|director|general\s+manager|bereichsleiter|abteilungsleiter)\b/.test(lower)) {
        return 'director_head';
    }
    if (/\b(?:team\s*lead|tech\s*lead|staff\b|principal|founding|lead\s+(?:engineer|developer|architect|data|product|designer))\b/.test(lower)) {
        return 'lead_principal';
    }
    if (/\b(?:senior|sr\.?)\b/.test(lower)) {
        return 'senior';
    }
    if (/\b(?:junior|jr\.?|intern|internship|werkstudent|working\s+student|trainee|graduate|entry[\s-]*level)\b/.test(lower)) {
        return 'junior_intern';
    }
    return 'mid_regular';
}

export function enrichIntent(job, structuredSalary = null) {
    const cleanedDesc = stripBoilerplateFooter(job.descriptionText || '');
    const corpus = `${job.title || ''}\n${job.department || ''}\n${cleanedDesc}`;
    const techStackAll = [];
    const techStackByCategory = {};

    for (const rule of TECH_RULES) {
        if (isEmployerSelfBrand(rule.name, job.companyName, job.companySlug, job.atsPlatform)) {
            continue;
        }
        if (rule.pattern.test(corpus)) {
            techStackAll.push(rule.name);
            if (!techStackByCategory[rule.category]) techStackByCategory[rule.category] = [];
            techStackByCategory[rule.category].push(rule.name);
        }
    }

    const seniorityNormalized = normalizeSeniority(job.title);
    const isDecisionMakerHire = seniorityNormalized === 'c_level_vp' || seniorityNormalized === 'director_head';

    const signalCodes = [];
    let score = 18 + Math.min(28, techStackAll.length * 5);
    if (isDecisionMakerHire) {
        signalCodes.push('NEW_LEADERSHIP_DECISION_MAKER');
        score += seniorityNormalized === 'c_level_vp' ? 28 : 24;
    }
    for (const [code, weight, re] of SIGNAL_PATTERNS) {
        if (re.test(corpus)) {
            signalCodes.push(code);
            score += weight;
        }
    }

    const effectiveSalary = structuredSalary || extractWorkdaySalarySummary(job.descriptionText || '');
    if (effectiveSalary) score += 8;

    const intentScore = Math.min(100, score);
    const intentTier = intentScore >= 70 ? 'HOT' : intentScore >= 45 ? 'WARM' : 'MONITOR';
    const topTools = techStackAll.slice(0, 3).join(', ');
    const rolePhrase = withIndefiniteArticle(job.title || 'role');
    return {
        intentScore,
        intentTier,
        seniorityNormalized,
        isDecisionMakerHire,
        techStackAll,
        techStackByCategory,
        signalCodes,
        disclosedSalary: effectiveSalary,
        outreachHook: `Noticed ${job.companyName} is hiring ${rolePhrase}${job.location ? ` in ${job.location}` : ''}${topTools ? ` working with ${topTools}` : ''}.`,
    };
}

async function fetchSafe(url, timeoutMs = 20000, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    Accept: 'application/json, text/html, application/xml;q=0.9, */*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                signal: AbortSignal.timeout(timeoutMs),
            });
            const text = await res.text();
            if ((res.status === 429 || res.status >= 500) && attempt < retries) {
                await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
                continue;
            }
            return { ok: res.ok, status: res.status, text };
        } catch (err) {
            if (attempt < retries) {
                await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
                continue;
            }
            return { ok: false, status: 0, text: '', error: err instanceof Error ? err.message : String(err) };
        }
    }
    return { ok: false, status: 0, text: '' };
}

const CHROME_TLS_CIPHERS = [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
].join(':');

const SHARED_WORKDAY_AGENT = new https.Agent({
    keepAlive: false,
    maxSockets: 32,
    ciphers: CHROME_TLS_CIPHERS,
    ecdhCurve: 'X25519:prime256v1:secp384r1',
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
});

const WORKDAY_ENTERPRISE_DIRECTORY = {
    salesforce: ['Salesforce', 'salesforce', 'wd12', 'External_Career_Site'],
    slack: ['Slack (Salesforce)', 'salesforce', 'wd12', 'Slack'],
    tableau: ['Tableau (Salesforce)', 'salesforce', 'wd12', 'Tableau'],
    capitalone: ['Capital One', 'capitalone', 'wd12', 'Capital_One'],
    verizon: ['Verizon', 'verizon', 'wd12', 'verizon-careers'],
    lilly: ['Eli Lilly', 'lilly', 'wd115', 'LLY'],
    nordstrom: ['Nordstrom', 'nordstrom', 'wd501', 'nordstrom_careers'],
    walmart: ['Walmart', 'walmart', 'wd504', 'WalmartExternal'],
    accenture: ['Accenture', 'accenture', 'wd103', 'AccentureCareers'],
    nvidia: ['NVIDIA', 'nvidia', 'wd5', 'NVIDIAExternalCareerSite'],
    adobe: ['Adobe', 'adobe', 'wd5', 'external_experienced'],
    crowdstrike: ['CrowdStrike', 'crowdstrike', 'wd5', 'crowdstrikecareers'],
    workday: ['Workday', 'workday', 'wd5', 'Workday'],
    mastercard: ['Mastercard', 'mastercard', 'wd1', 'CorporateCareers'],
    cisco: ['Cisco', 'cisco', 'wd5', 'Cisco_Careers'],
    dell: ['Dell Technologies', 'dell', 'wd1', 'External'],
    boeing: ['Boeing', 'boeing', 'wd1', 'EXTERNAL_CAREERS'],
    pfizer: ['Pfizer', 'pfizer', 'wd1', 'PfizerCareers'],
    paloaltonetworks: ['Palo Alto Networks', 'paloaltonetworks', 'wd5', 'panwexternalcareers'],
    intel: ['Intel', 'intel', 'wd1', 'External'],
    broadcom: ['Broadcom', 'broadcom', 'wd1', 'External_Career'],
    appliedmaterials: ['Applied Materials', 'amat', 'wd1', 'External'],
    autodesk: ['Autodesk', 'autodesk', 'wd1', 'Ext'],
    zoom: ['Zoom Communications', 'zoom', 'wd5', 'Zoom'],
    motorolasolutions: ['Motorola Solutions', 'motorolasolutions', 'wd5', 'Careers'],
    paypal: ['PayPal', 'paypal', 'wd1', 'jobs'],
    morganstanley: ['Morgan Stanley', 'ms', 'wd5', 'External'],
    blackrock: ['BlackRock', 'blackrock', 'wd1', 'BlackRock_Professional'],
    bankofamerica: ['Bank of America', 'ghr', 'wd1', 'Lateral-US'],
    citigroup: ['Citigroup', 'citi', 'wd5', '2'],
    fidelity: ['Fidelity Investments', 'fmr', 'wd1', 'FidelityCareers'],
    spglobal: ['S&P Global', 'spgi', 'wd5', 'SPGI_Careers'],
    pwc: ['PwC', 'pwc', 'wd3', 'Global_Experienced_Careers'],
    aig: ['AIG', 'aig', 'wd1', 'aig'],
    target: ['Target', 'target', 'wd5', 'targetcareers'],
    homedepot: ['The Home Depot', 'homedepot', 'wd5', 'CareerDepot'],
    disney: ['The Walt Disney Company', 'disney', 'wd5', 'disneycareer'],
    nike: ['Nike', 'nike', 'wd1', 'nke'],
    amgen: ['Amgen', 'amgen', 'wd1', 'Careers'],
    astrazeneca: ['AstraZeneca', 'astrazeneca', 'wd3', 'Careers'],
    medtronic: ['Medtronic', 'medtronic', 'wd1', 'MedtronicCareers'],
    cvshealth: ['CVS Health', 'cvshealth', 'wd1', 'CVS_Health_Careers'],
    cigna: ['The Cigna Group', 'cigna', 'wd5', 'cignacareers'],
    humana: ['Humana', 'humana', 'wd5', 'Humana_External_Career_Site'],
    '3m': ['3M', '3m', 'wd1', 'Search'],
    caterpillar: ['Caterpillar', 'cat', 'wd5', 'CaterpillarCareers'],
    geaerospace: ['GE Aerospace', 'geaerospace', 'wd5', 'GE_ExternalSite'],
    rtx: ['RTX (Raytheon)', 'globalhr', 'wd5', 'REC_RTX_Ext_Gateway'],
    tranetechnologies: ['Trane Technologies', 'tranetechnologies', 'wd12', 'Trane_Technologies_Careers'],
    otis: ['Otis Worldwide', 'otis', 'wd504', 'REC_Ext_Gateway'],
    shi: ['SHI International', 'shi', 'wd12', 'shicareers'],
    livenation: ['Live Nation Entertainment', 'livenation', 'wd503', 'LNExternalSite'],
    danaher: ['Danaher', 'danaher', 'wd1', 'DanaherJobs'],
    stryker: ['Stryker', 'stryker', 'wd1', 'StrykerCareers'],
    thermofisher: ['Thermo Fisher Scientific', 'thermofisher', 'wd5', 'ThermoFisherCareers'],
    unilever: ['Unilever', 'unilever', 'wd3', 'Unilever_Experienced_Professionals'],
    siemens: ['Siemens', 'siemens', 'wd3', 'Jobs'],
    shell: ['Shell', 'shell', 'wd3', 'ShellCareers'],
    roche: ['Roche', 'roche', 'wd3', 'roche-ext'],
    novartis: ['Novartis', 'novartis', 'wd3', 'Novartis_Careers'],
    barclays: ['Barclays', 'barclays', 'wd3', 'External_Career_Site_Barclays'],
};

const WORKDAY_ALIASES = {
    elililly: 'lilly',
    paloalto: 'paloaltonetworks',
    panw: 'paloaltonetworks',
    amat: 'appliedmaterials',
    motorola: 'motorolasolutions',
    ms: 'morganstanley',
    bofa: 'bankofamerica',
    ghr: 'bankofamerica',
    citi: 'citigroup',
    fmr: 'fidelity',
    spgi: 'spglobal',
    thehomedepot: 'homedepot',
    waltdisney: 'disney',
    cvs: 'cvshealth',
    mmm: '3m',
    cat: 'caterpillar',
    ge: 'geaerospace',
    raytheon: 'rtx',
    globalhr: 'rtx',
    trane: 'tranetechnologies',
    delltechnologies: 'dell',
};

const WORKDAY_LOCALE_SEGMENT_RE = /^[a-z]{2}(?:-[a-zA-Z]{2,4})?$/;

function buildWorkdayTarget(companySlug, companyName, tenant, wdCluster, site, originOverride) {
    const origin = originOverride || `https://${tenant}.${wdCluster}.myworkdayjobs.com`;
    const isMyWorkdaySite = origin.includes('.myworkdaysite.com');
    const careerSiteUrl = isMyWorkdaySite ? `${origin}/recruiting/${tenant}/${site}` : `${origin}/${site}`;
    const cxsBaseUrl = `${origin}/wday/cxs/${tenant}/${site}`;
    return {
        companySlug,
        companyName,
        tenant,
        wdCluster,
        site,
        origin,
        careerSiteUrl,
        cxsBaseUrl,
        cxsJobsUrl: `${cxsBaseUrl}/jobs`,
    };
}

function findWorkdayDirMatch(tenant, site) {
    const tLower = tenant.toLowerCase();
    const sLower = site.toLowerCase();
    for (const [slug, [companyName, t, wdCluster, s]] of Object.entries(WORKDAY_ENTERPRISE_DIRECTORY)) {
        if (t.toLowerCase() === tLower && s.toLowerCase() === sLower) {
            return { slug, companyName, tenant: t, wdCluster, site: s };
        }
    }
    return null;
}

function humanizeTenantName(tenant) {
    return tenant.replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}

export function resolveWorkdayBoardTarget(raw = '') {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return null;

    const shorthand = trimmed.match(/^(wd\d+)\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/?$/i);
    if (shorthand) {
        const wdCluster = shorthand[1].toLowerCase();
        const tenant = shorthand[2];
        const site = shorthand[3];
        const matched = findWorkdayDirMatch(tenant, site);
        return buildWorkdayTarget(
            matched ? matched.slug : tenant.toLowerCase(),
            matched ? matched.companyName : humanizeTenantName(tenant),
            matched ? matched.tenant : tenant,
            wdCluster,
            site,
        );
    }

    if (/myworkday(?:jobs|site)\.com/i.test(trimmed)) {
        const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        let parsed;
        try {
            parsed = new URL(withScheme);
        } catch {
            return null;
        }
        const hostLower = parsed.hostname.toLowerCase();
        const rawSegments = parsed.pathname.split('/').map((s) => s.trim()).filter(Boolean);

        const wdJobsHost = hostLower.match(/^([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com$/);
        if (wdJobsHost) {
            let tenant = wdJobsHost[1];
            const wdCluster = wdJobsHost[2];
            let site;
            if (rawSegments[0]?.toLowerCase() === 'wday' && rawSegments[1]?.toLowerCase() === 'cxs') {
                tenant = rawSegments[2] || tenant;
                site = rawSegments[3];
            } else {
                const segs = [...rawSegments];
                if (segs.length >= 2 && WORKDAY_LOCALE_SEGMENT_RE.test(segs[0])) segs.shift();
                site = segs[0];
            }
            if (!site) return null;
            const matched = findWorkdayDirMatch(tenant, site);
            return buildWorkdayTarget(
                matched ? matched.slug : tenant.toLowerCase(),
                matched ? matched.companyName : humanizeTenantName(tenant),
                matched ? matched.tenant : tenant,
                wdCluster,
                site,
            );
        }

        const wdSiteHost = hostLower.match(/^(wd\d+)\.myworkdaysite\.com$/);
        if (wdSiteHost) {
            const wdCluster = wdSiteHost[1];
            const segs = [...rawSegments];
            if (segs.length >= 3 && WORKDAY_LOCALE_SEGMENT_RE.test(segs[0])) segs.shift();
            let tenant;
            let site;
            if (segs[0]?.toLowerCase() === 'wday' && segs[1]?.toLowerCase() === 'cxs') {
                tenant = segs[2];
                site = segs[3];
            } else if (segs[0]?.toLowerCase() === 'recruiting') {
                tenant = segs[1];
                site = segs[2];
            }
            if (!tenant || !site) return null;
            const matched = findWorkdayDirMatch(tenant, site);
            return buildWorkdayTarget(
                matched ? matched.slug : tenant.toLowerCase(),
                matched ? matched.companyName : humanizeTenantName(tenant),
                matched ? matched.tenant : tenant,
                wdCluster,
                site,
                `https://${wdCluster}.myworkdaysite.com`,
            );
        }
        return null;
    }

    if (/^https?:\/\//i.test(trimmed) || trimmed.includes('/')) return null;

    const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    const canonical = WORKDAY_ALIASES[key] || key;
    const entry = WORKDAY_ENTERPRISE_DIRECTORY[canonical];
    if (!entry) return null;
    return buildWorkdayTarget(canonical, entry[0], entry[1], entry[2], entry[3]);
}

async function fetchWorkdayEndpoint(url, { method = 'GET', body, timeoutMs = 10000 } = {}) {
    const payload = body !== undefined ? Buffer.from(body, 'utf8') : null;
    return new Promise((resolve) => {
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (err) {
            resolve({ ok: false, status: 0, text: '', error: String(err) });
            return;
        }
        const req = https.request(
            {
                protocol: parsedUrl.protocol,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 443,
                path: parsedUrl.pathname + parsedUrl.search,
                method,
                agent: SHARED_WORKDAY_AGENT,
                timeout: timeoutMs,
                headers: {
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    ...(payload
                        ? { 'Content-Type': 'application/json', 'Content-Length': String(payload.length) }
                        : {}),
                },
            },
            (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const status = res.statusCode ?? 0;
                    const location = typeof res.headers.location === 'string' ? res.headers.location : '';
                    if ((status === 302 || status === 303) && /maintenance-page/i.test(location)) {
                        resolve({ ok: false, status, text: '', isMaintenance: true });
                        return;
                    }
                    const rawBuf = Buffer.concat(chunks);
                    const enc = String(res.headers['content-encoding'] || '').toLowerCase();
                    let text = '';
                    try {
                        if (enc === 'gzip') text = zlib.gunzipSync(rawBuf).toString('utf8');
                        else if (enc === 'deflate') text = zlib.inflateSync(rawBuf).toString('utf8');
                        else if (enc === 'br') text = zlib.brotliDecompressSync(rawBuf).toString('utf8');
                        else text = rawBuf.toString('utf8');
                    } catch {
                        text = rawBuf.toString('utf8');
                    }
                    resolve({ ok: status >= 200 && status < 300, status, text });
                });
            },
        );
        req.on('timeout', () => req.destroy(new Error(`Timeout after ${timeoutMs}ms`)));
        req.on('error', (err) => resolve({ ok: false, status: 0, text: '', error: String(err) }));
        if (payload) req.write(payload);
        req.end();
    });
}

function parseWorkdayCompToken(raw = '') {
    const cleaned = raw.trim().toLowerCase();
    if (!cleaned) return null;
    if (cleaned.endsWith('k')) {
        const n = Number.parseFloat(cleaned.slice(0, -1).trim());
        return Number.isFinite(n) ? Math.round(n * 1000) : null;
    }
    const n = Number.parseFloat(cleaned.replace(/,/g, ''));
    return Number.isFinite(n) ? Math.round(n) : null;
}

function extractWorkdaySalarySummary(plainText = '') {
    if (!plainText) return null;
    const symToIso = { $: 'USD', '€': 'EUR', '£': 'GBP' };
    const annualRe =
        /(?:\b(USD|CAD|AUD|EUR|GBP|CHF)\s*)?([$€£])?\s*(\d{2,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{2,3}(?:\.\d+)?\s*[kK])\s*\+?\s*(?:-|–|—|to)\s*(?:\b(?:USD|CAD|AUD|EUR|GBP|CHF)\s*)?[$€£]?\s*(\d{2,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{2,3}(?:\.\d+)?\s*[kK])\s*\+?(?:\s*(USD|CAD|AUD|EUR|GBP|CHF))?/gi;
    let m;
    while ((m = annualRe.exec(plainText)) !== null) {
        if (!m[1] && !m[2] && !m[5]) continue;
        const min = parseWorkdayCompToken(m[3]);
        const max = parseWorkdayCompToken(m[4]);
        if (min === null || max === null || max < min || min < 22000 || max > 1500000) continue;
        const prefix = plainText.slice(Math.max(0, m.index - 35), m.index).toLowerCase();
        if (/\b(?:bonus|commission|incentive)\s+(?:of|range|is)\s*$/.test(prefix)) continue;
        const ccy = (m[1] || m[5] || symToIso[m[2]] || 'USD').toUpperCase();
        const sym = ccy === 'EUR' ? '€' : ccy === 'GBP' ? '£' : '$';
        return `${ccy} ${sym}${min.toLocaleString('en-US')} - ${sym}${max.toLocaleString('en-US')} / yr`;
    }
    const hourlyRe =
        /(?:\b(USD|CAD|AUD|EUR|GBP)\s*)?([$€£])\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:-|–|—|to)\s*(?:\b(?:USD|CAD|AUD|EUR|GBP)\s*)?[$€£]?\s*(\d{2,3}(?:\.\d{1,2})?)\s*(?:USD|CAD|AUD|EUR|GBP)?\s*(?:per\s+hour|\/\s*hr\b|\/\s*hour\b|an\s+hour|hourly)/i;
    const hm = plainText.match(hourlyRe);
    if (hm) {
        const min = Number.parseFloat(hm[3]);
        const max = Number.parseFloat(hm[4]);
        if (Number.isFinite(min) && Number.isFinite(max) && max >= min && min >= 10 && max <= 400) {
            const ccy = (hm[1] || symToIso[hm[2]] || 'USD').toUpperCase();
            const sym = ccy === 'EUR' ? '€' : ccy === 'GBP' ? '£' : '$';
            return `${ccy} ${sym}${min.toFixed(2)} - ${sym}${max.toFixed(2)} / hr`;
        }
    }
    return null;
}

const SUPPORTED_PLATFORMS = new Set([
    'workday',
    'greenhouse',
    'lever',
    'ashby',
    'personio',
    'teamtailor',
    'smartrecruiters',
    'workable',
    'recruitee',
    'pinpoint',
]);

export function detectAtsTarget(rawInput = '', explicitPlatform = '') {
    const trimmed = String(rawInput || '').trim();
    const exp = String(explicitPlatform || '').trim().toLowerCase();
    if (!trimmed) return null;

    const colonMatch = trimmed.match(/^([a-zA-Z0-9_-]+):(.+)$/);
    if (colonMatch && !/^https?$/i.test(colonMatch[1])) {
        const prefix = colonMatch[1].toLowerCase();
        if (SUPPORTED_PLATFORMS.has(prefix)) {
            return detectAtsTarget(colonMatch[2].trim(), prefix);
        }
    }

    if (/myworkday(?:jobs|site)\.com/i.test(trimmed) || /^wd\d+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/?$/i.test(trimmed)) {
        const wd = resolveWorkdayBoardTarget(trimmed);
        if (wd) {
            const dirEntry = WORKDAY_ENTERPRISE_DIRECTORY[wd.companySlug];
            const isCanonicalDir =
                dirEntry &&
                dirEntry[1].toLowerCase() === wd.tenant.toLowerCase() &&
                dirEntry[2].toLowerCase() === wd.wdCluster.toLowerCase() &&
                dirEntry[3].toLowerCase() === wd.site.toLowerCase() &&
                !wd.origin.includes('.myworkdaysite.com');
            return { platform: 'workday', target: isCanonicalDir ? wd.companySlug : wd.careerSiteUrl };
        }
    }

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            const host = parsed.hostname.toLowerCase();
            const parts = parsed.pathname.split('/').filter(Boolean);

            if (host.endsWith('greenhouse.io')) {
                const forToken = parsed.searchParams.get('for');
                if (forToken) return { platform: 'greenhouse', target: forToken.trim() };
                const bIdx = parts.indexOf('boards');
                if (bIdx >= 0 && parts[bIdx + 1]) return { platform: 'greenhouse', target: decodeURIComponent(parts[bIdx + 1]) };
                if (parts[0] && parts[0] !== 'embed') return { platform: 'greenhouse', target: decodeURIComponent(parts[0]) };
            }
            if (host.endsWith('lever.co')) {
                const isEu = host === 'jobs.eu.lever.co' || host === 'api.eu.lever.co' || host.endsWith('.eu.lever.co');
                const pIdx = parts.indexOf('postings');
                const slug =
                    pIdx >= 0 && parts[pIdx + 1]
                        ? decodeURIComponent(parts[pIdx + 1])
                        : parts[0]
                          ? decodeURIComponent(parts[0])
                          : '';
                if (slug) return isEu ? { platform: 'lever', target: slug, region: 'eu' } : { platform: 'lever', target: slug };
            }
            if (host.endsWith('ashbyhq.com')) {
                const jIdx = parts.indexOf('job-board');
                const slug = jIdx >= 0 && parts[jIdx + 1] ? parts[jIdx + 1] : parts[0];
                if (slug) return { platform: 'ashby', target: decodeURIComponent(slug) };
            }
            const personioMatch = host.match(/^([a-z0-9-]+)\.jobs\.personio\.(?:de|com)$/);
            if (personioMatch) return { platform: 'personio', target: personioMatch[1] };

            const ttMatch = host.match(/^([a-z0-9-]+)\.teamtailor\.com$/);
            if (ttMatch && ttMatch[1] !== 'www') return { platform: 'teamtailor', target: `https://${host}` };

            if (host.endsWith('smartrecruiters.com')) {
                const cIdx = parts.indexOf('companies');
                const slug = cIdx >= 0 && parts[cIdx + 1] ? parts[cIdx + 1] : parts[0];
                if (slug) return { platform: 'smartrecruiters', target: decodeURIComponent(slug) };
            }
            if (host.endsWith('workable.com')) {
                if (host !== 'apply.workable.com' && host !== 'www.workable.com') {
                    return { platform: 'workable', target: host.split('.')[0] };
                }
                const aIdx = parts.indexOf('accounts');
                if (aIdx >= 0 && parts[aIdx + 1]) return { platform: 'workable', target: parts[aIdx + 1].toLowerCase() };
                if (parts[0] && parts[0] !== 'j' && parts[0] !== 'api') return { platform: 'workable', target: parts[0].toLowerCase() };
            }
            const rcMatch = host.match(/^([a-z0-9-]+)\.recruitee\.com$/);
            if (rcMatch && rcMatch[1] !== 'www') return { platform: 'recruitee', target: rcMatch[1] };

            const ppMatch = host.match(/^([a-z0-9-]+)\.pinpointhq\.com$/);
            if (ppMatch && ppMatch[1] !== 'www') return { platform: 'pinpoint', target: ppMatch[1] };
        } catch {
            return null;
        }
    }

    if (exp && SUPPORTED_PLATFORMS.has(exp)) {
        return { platform: exp, target: trimmed };
    }
    return null;
}

function candidateRolePriority(title = '', hasComp = false) {
    const t = String(title || '');
    let score = hasComp ? 2 : 0;
    if (/\b(?:chief|ceo|cto|cfo|ciso|cro|cmo|cpo|vp\b|vice\s+president|svp\b|evp\b|head\s+of|director)\b/i.test(t)) {
        score += 4;
    }
    if (
        /\b(?:engineer|engineering|architect|platform|infrastructure|devops|sre\b|data|analytics|scientist|machine\s+learning|ai\b|ml\b|security|infosec|grc\b|revops|revenue\s+operations|gtm\s+engineer|cloud|systems|developer)\b/i.test(
            t,
        )
    ) {
        score += 3;
    }
    return score;
}

function rankAndCapEnrichedJobs(enrichedJobs, cap) {
    return [...enrichedJobs]
        .sort((a, b) => (b.intent?.intentScore || 0) - (a.intent?.intentScore || 0))
        .slice(0, cap);
}

export async function scanSingleTarget(platform, target, maxJobs = 5) {
    const cap = Math.min(10, Math.max(1, Number(maxJobs || 5)));
    const poolCap = Math.max(cap * 3, 18);
    const detected = detectAtsTarget(target, platform && platform !== 'auto' ? platform : '');
    const p = detected ? detected.platform : String(platform || 'ashby').toLowerCase();
    const resolvedTarget = detected ? detected.target : String(target || '').trim();
    if (!resolvedTarget) return [];

    if (p === 'greenhouse') {
        const slug = resolvedTarget.replace(/^https?:\/\/(?:job-)?boards(?:\.eu)?\.greenhouse\.io\//i, '').split('/')[0].trim();
        const r = await fetchSafe(
            `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true&pay_transparency=true`,
        );
        if (!r.ok) return [];
        const j = JSON.parse(r.text);
        const jobs = [...(j.jobs || [])].sort(
            (a, b) =>
                candidateRolePriority(b.title, Boolean(b.pay_input_ranges?.length)) -
                candidateRolePriority(a.title, Boolean(a.pay_input_ranges?.length)),
        );
        const enriched = jobs.slice(0, poolCap).map((item) => {
            const pr = (item.pay_input_ranges || [])[0];
            const hasMin = pr && pr.min_cents !== null && pr.min_cents !== undefined && Number(pr.min_cents) > 0;
            const hasMax = pr && pr.max_cents !== null && pr.max_cents !== undefined && Number(pr.max_cents) > 0;
            const ccy = pr?.currency_type || 'USD';
            const sal =
                hasMin && hasMax
                    ? `${ccy} $${Math.round(Number(pr.min_cents) / 100).toLocaleString('en-US')} - $${Math.round(Number(pr.max_cents) / 100).toLocaleString('en-US')}`
                    : hasMin
                      ? `${ccy} $${Math.round(Number(pr.min_cents) / 100).toLocaleString('en-US')}+`
                      : hasMax
                        ? `Up to ${ccy} $${Math.round(Number(pr.max_cents) / 100).toLocaleString('en-US')}`
                        : null;
            const desc = htmlToText(item.content || '');
            const fullJob = {
                atsPlatform: 'greenhouse',
                companySlug: slug,
                companyName: item.company_name || slug,
                title: item.title,
                department: item.departments?.[0]?.name || 'General',
                location: item.location?.name || item.offices?.[0]?.name || 'Global',
                jobUrl: item.absolute_url || `https://boards.greenhouse.io/${slug}/jobs/${item.id}`,
                descriptionText: desc,
            };
            const intent = enrichIntent(fullJob, sal);
            return { ...fullJob, descriptionText: desc.slice(0, 900), intent };
        });
        return rankAndCapEnrichedJobs(enriched, cap);
    }

    if (p === 'lever') {
        const isExplicitEu =
            detected?.region === 'eu' ||
            /^https?:\/\/(?:jobs|api)\.eu\.lever\.co\//i.test(String(target || '')) ||
            /^eu:/i.test(resolvedTarget);
        const slug = resolvedTarget
            .replace(/^eu:/i, '')
            .replace(/^https?:\/\/(?:jobs|api)(?:\.eu)?\.lever\.co\/(?:v0\/postings\/)?/i, '')
            .split(/[/?#]/)[0]
            .trim();
        const limitParam = Math.max(30, cap * 5);
        const primaryHost = isExplicitEu ? 'api.eu.lever.co' : 'api.lever.co';
        let r = await fetchSafe(`https://${primaryHost}/v0/postings/${encodeURIComponent(slug)}?mode=json&limit=${limitParam}`);
        if (!r.ok && !isExplicitEu) {
            r = await fetchSafe(`https://api.eu.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json&limit=${limitParam}`);
        }
        if (!r.ok) return [];
        const arr = JSON.parse(r.text);
        if (!Array.isArray(arr)) return [];
        arr.sort(
            (a, b) =>
                candidateRolePriority(b.text, Boolean(b.salaryRange?.min)) -
                candidateRolePriority(a.text, Boolean(a.salaryRange?.min)),
        );
        const enriched = arr.slice(0, poolCap).map((item) => {
            const sr = item.salaryRange;
            const hasMin = sr && sr.min !== null && sr.min !== undefined && Number(sr.min) > 0;
            const hasMax = sr && sr.max !== null && sr.max !== undefined && Number(sr.max) > 0;
            const ccy = sr?.currency || 'USD';
            const interval = sr?.interval || 'per-year';
            const sal =
                hasMin && hasMax
                    ? `${ccy} ${Number(sr.min).toLocaleString('en-US')} - ${Number(sr.max).toLocaleString('en-US')} (${interval})`
                    : hasMin
                      ? `${ccy} ${Number(sr.min).toLocaleString('en-US')}+ (${interval})`
                      : hasMax
                        ? `Up to ${ccy} ${Number(sr.max).toLocaleString('en-US')} (${interval})`
                        : null;
            const listsText = (item.lists || []).map((l) => `${l.text || ''}: ${htmlToText(l.content || '')}`).join('\n');
            const fullDesc = [item.descriptionPlain || htmlToText(item.description || ''), listsText, item.additionalPlain || '']
                .filter(Boolean)
                .join('\n');
            const fullJob = {
                atsPlatform: 'lever',
                companySlug: slug,
                companyName: slug,
                title: item.text,
                department: item.categories?.department || item.categories?.team || 'General',
                location: item.categories?.location || 'Global',
                jobUrl: item.hostedUrl,
                descriptionText: fullDesc,
            };
            const intent = enrichIntent(fullJob, sal);
            return { ...fullJob, descriptionText: fullDesc.slice(0, 900), intent };
        });
        return rankAndCapEnrichedJobs(enriched, cap);
    }

    if (p === 'ashby') {
        const slug = resolvedTarget.replace(/^https?:\/\/jobs\.ashbyhq\.com\//i, '').split('/')[0].trim();
        const r = await fetchSafe(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`);
        if (!r.ok) return [];
        const j = JSON.parse(r.text);
        const jobs = [...(j.jobs || [])].sort(
            (a, b) =>
                candidateRolePriority(b.title, Boolean(b.compensation?.compensationTierSummary)) -
                candidateRolePriority(a.title, Boolean(a.compensation?.compensationTierSummary)),
        );
        const enriched = jobs.slice(0, poolCap).map((item) => {
            const sal = item.compensation?.compensationTierSummary || item.compensation?.scrapeableCompensationSalarySummary || null;
            const fullDesc = item.descriptionPlain || htmlToText(item.descriptionHtml || '');
            const fullJob = {
                atsPlatform: 'ashby',
                companySlug: slug,
                companyName: j.organizationName || slug,
                title: item.title,
                department: item.department || item.team || 'General',
                location: item.location || 'Remote',
                jobUrl: item.jobUrl,
                descriptionText: fullDesc,
            };
            const intent = enrichIntent(fullJob, sal);
            return { ...fullJob, descriptionText: fullDesc.slice(0, 900), intent };
        });
        return rankAndCapEnrichedJobs(enriched, cap);
    }

    if (p === 'personio') {
        const slug = resolvedTarget.replace(/\.jobs\.personio\.(de|com).*$/i, '').replace(/^https?:\/\//i, '').trim();
        const baseUrl = `https://${slug}.jobs.personio.de`;
        const xmlRes = await fetchSafe(`${baseUrl}/xml?language=en`);
        if (xmlRes.ok && /<position>/i.test(xmlRes.text)) {
            return xmlAllBlocks(xmlRes.text, 'position').slice(0, cap).map((pos) => {
                const id = xmlTag(pos, 'id');
                const desc = htmlToText(xmlAllBlocks(pos, 'jobDescription').map((b) => xmlTag(b, 'value')).join('\n'));
                const fullJob = {
                    atsPlatform: 'personio',
                    companySlug: slug,
                    companyName: xmlTag(pos, 'subcompany') || slug,
                    title: xmlTag(pos, 'name'),
                    department: xmlTag(pos, 'department') || 'General',
                    location: xmlTag(pos, 'office') || 'Europe',
                    jobUrl: `${baseUrl}/job/${id}?language=en`,
                    descriptionText: desc,
                };
                const intent = enrichIntent(fullJob);
                return { ...fullJob, descriptionText: desc.slice(0, 900), intent };
            });
        }
        return [];
    }

    if (p === 'teamtailor') {
        const baseUrl = /^https?:\/\//i.test(resolvedTarget) ? new URL(resolvedTarget).origin : `https://${resolvedTarget.trim()}.teamtailor.com`;
        const slug = new URL(baseUrl).hostname.replace(/\.teamtailor\.com$/i, '');
        const rss = await fetchSafe(`${baseUrl}/jobs.rss`);
        if (!rss.ok) return [];
        const companyName = xmlTag(rss.text.split('<item>')[0] || '', 'title') || resolvedTarget;
        return xmlAllBlocks(rss.text, 'item').slice(0, cap).map((item) => {
            const desc = htmlToText(xmlTag(item, 'description'));
            const fullJob = {
                atsPlatform: 'teamtailor',
                companySlug: slug,
                companyName,
                title: xmlTag(item, 'title'),
                department: xmlTag(item, 'tt:department') || 'General',
                location: xmlTag(item, 'tt:name') || 'Europe',
                jobUrl: xmlTag(item, 'link'),
                descriptionText: desc,
            };
            const intent = enrichIntent(fullJob);
            return { ...fullJob, descriptionText: desc.slice(0, 900), intent };
        });
    }

    if (p === 'workable') {
        const slug = resolvedTarget.trim().toLowerCase();
        const r = await fetchSafe(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}?details=true`);
        if (!r.ok) return [];
        const j = JSON.parse(r.text);
        return (j.jobs || []).slice(0, cap).map((item) => {
            const desc = htmlToText(`${item.description || ''}\n${item.requirements || ''}`);
            const fullJob = {
                atsPlatform: 'workable',
                companySlug: slug,
                companyName: j.name || slug,
                title: item.title,
                department: item.department || 'General',
                location: [item.city, item.country].filter(Boolean).join(', '),
                jobUrl: item.url,
                descriptionText: desc,
            };
            const intent = enrichIntent(fullJob);
            return { ...fullJob, descriptionText: desc.slice(0, 900), intent };
        });
    }

    if (p === 'recruitee') {
        const slug = resolvedTarget.replace(/\.recruitee\.com.*$/i, '').trim().toLowerCase();
        const r = await fetchSafe(`https://${slug}.recruitee.com/api/offers`);
        if (!r.ok) return [];
        const j = JSON.parse(r.text);
        return (j.offers || []).slice(0, cap).map((o) => {
            const desc = htmlToText(`${o.description || ''}\n${o.requirements || ''}`);
            const sal = o.min_salary || o.max_salary ? `${o.salary_currency || 'EUR'} ${o.min_salary || ''}-${o.max_salary || ''}` : null;
            const fullJob = {
                atsPlatform: 'recruitee',
                companySlug: slug,
                companyName: o.company_name || slug,
                title: o.title,
                department: o.department || 'General',
                location: o.location || o.city || 'Europe',
                jobUrl: o.careers_url,
                descriptionText: desc,
            };
            const intent = enrichIntent(fullJob, sal);
            return { ...fullJob, descriptionText: desc.slice(0, 900), intent };
        });
    }

    if (p === 'pinpoint') {
        const slug = resolvedTarget.replace(/\.pinpointhq\.com.*$/i, '').trim().toLowerCase();
        const r = await fetchSafe(`https://${slug}.pinpointhq.com/postings.json`);
        if (!r.ok) return [];
        const parsed = JSON.parse(r.text);
        const arr = Array.isArray(parsed) ? parsed : parsed.data || [];
        return arr.slice(0, cap).map((item) => {
            const desc = htmlToText(`${item.description || ''}\n${item.skills_knowledge_expertise || ''}`);
            const sal = item.compensation_visible && item.compensation ? String(item.compensation) : null;
            const fullJob = {
                atsPlatform: 'pinpoint',
                companySlug: slug,
                companyName: slug,
                title: item.title,
                department: item.job?.department?.name || 'General',
                location: item.location?.name || 'Global',
                reportingTo: item.reporting_to || null,
                jobUrl: item.url,
                descriptionText: desc,
            };
            const intent = enrichIntent(fullJob, sal);
            return { ...fullJob, descriptionText: desc.slice(0, 900), intent };
        });
    }

    if (p === 'smartrecruiters') {
        const slug = resolvedTarget.trim();
        const r = await fetchSafe(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${cap}`);
        if (!r.ok) return [];
        const j = JSON.parse(r.text);
        const items = (j.content || []).slice(0, cap);
        return Promise.all(
            items.map(async (item) => {
                let desc = '';
                try {
                    const det = await fetchSafe(
                        `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings/${encodeURIComponent(item.id)}`,
                    );
                    if (det.ok) {
                        const dj = JSON.parse(det.text);
                        const sections = dj.jobAd?.sections || {};
                        desc = htmlToText(
                            [
                                sections.jobDescription?.text,
                                sections.qualifications?.text,
                                sections.additionalInformation?.text,
                            ]
                                .filter(Boolean)
                                .join('\n'),
                        );
                    }
                } catch {
                    // fallback to listing metadata
                }
                const fullJob = {
                    atsPlatform: 'smartrecruiters',
                    companySlug: slug,
                    companyName: item.company?.name || slug,
                    title: item.name,
                    department: item.department?.label || 'General',
                    location: [item.location?.city, item.location?.country?.toUpperCase()].filter(Boolean).join(', '),
                    jobUrl: `https://jobs.smartrecruiters.com/${slug}/${item.id}`,
                    descriptionText: desc,
                };
                const intent = enrichIntent(fullJob);
                return { ...fullJob, descriptionText: desc.slice(0, 900), intent };
            }),
        );
    }

    if (p === 'workday') {
        const wd = resolveWorkdayBoardTarget(resolvedTarget) || resolveWorkdayBoardTarget(String(target || ''));
        if (!wd) return [];
        const listRes = await fetchWorkdayEndpoint(wd.cxsJobsUrl, {
            method: 'POST',
            body: JSON.stringify({ appliedFacets: {}, limit: Math.min(20, cap), offset: 0, searchText: '' }),
        });
        if (!listRes.ok) return [];
        let parsed;
        try {
            parsed = JSON.parse(listRes.text);
        } catch {
            return [];
        }
        const postings = (parsed.jobPostings || []).filter((x) => x.externalPath || x.title).slice(0, cap);
        if (!postings.length) return [];

        const enriched = await Promise.all(
            postings.map(async (item) => {
                let info = {};
                let orgName = '';
                if (item.externalPath) {
                    const detRes = await fetchWorkdayEndpoint(`${wd.cxsBaseUrl}${item.externalPath}`, { method: 'GET' });
                    if (detRes.ok) {
                        try {
                            const detJson = JSON.parse(detRes.text);
                            info = detJson.jobPostingInfo || {};
                            orgName = String(detJson.hiringOrganization?.name || '').replace(/^\d+\s+/, '').trim();
                        } catch {
                            // keep listing fallback
                        }
                    }
                }
                const rawTitle = decodeEntities(info.title || item.title || 'Untitled Position').trim();
                const title = /^XMLNAME--/i.test(rawTitle)
                    ? rawTitle.replace(/^XMLNAME--/i, '').replace(/--/g, ' - ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
                    : rawTitle;
                const desc = htmlToText(info.jobDescription || '');
                const sal = extractWorkdaySalarySummary(desc);
                const jobUrl = info.externalUrl || (item.externalPath ? `${wd.careerSiteUrl}${item.externalPath}` : wd.careerSiteUrl);
                const companyName = WORKDAY_ENTERPRISE_DIRECTORY[wd.companySlug] ? wd.companyName : orgName || wd.companyName;
                const fullJob = {
                    atsPlatform: 'workday',
                    companySlug: wd.companySlug,
                    companyName,
                    title,
                    department: 'General',
                    location: (info.location || item.locationsText || 'Global').trim(),
                    jobUrl,
                    descriptionText: desc,
                };
                const intent = enrichIntent(fullJob, sal);
                return { ...fullJob, descriptionText: desc.slice(0, 900), intent };
            }),
        );
        return enriched;
    }

    return [];
}

const CLOUD_CATALOG_CATEGORIES = {
    ats_hiring_intent: [
        'multi_ats',
        'workday',
        'greenhouse',
        'lever',
        'ashby',
        'personio',
        'teamtailor',
        'smartrecruiters',
        'workable',
        'recruitee',
        'pinpoint',
    ],
    ad_spy_contact_enrichment: [
        'google_ads_transparency',
        'linkedin_ad_library',
        'website_contact_finder',
        'apple_app_store',
    ],
    us_fleet_govcon: ['us_fmcsa_trucking', 'us_federal_contracts'],
    us_healthcare_fda: ['us_npi_clinics', 'fda_510k'],
};

export async function detectCompanyAtsBoard(rawInput = '', probeLive = true) {
    const cleaned = String(rawInput || '').trim();
    if (!cleaned) return { input: rawInput, detected: false, boards: [] };

    const direct = detectAtsTarget(cleaned);
    if (direct) {
        const probeTarget =
            direct.platform === 'lever' && direct.region === 'eu'
                ? `https://jobs.eu.lever.co/${direct.target}`
                : direct.target;
        const sample = probeLive ? await scanSingleTarget(direct.platform, probeTarget, 3) : [];
        return {
            input: cleaned,
            detected: true,
            mode: 'url_pattern',
            boards: [
                {
                    platform: direct.platform,
                    target: direct.target,
                    ...(direct.region ? { region: direct.region } : {}),
                    reachable: probeLive ? sample.length > 0 : null,
                    sampledOpenRoles: sample.length,
                    hasDisclosedCompensation: sample.some((j) => Boolean(j.intent?.disclosedSalary)),
                    sampleTitles: sample.map((j) => j.title),
                },
            ],
        };
    }

    const slug = cleaned
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/\.(com|io|ai|co|de|org|net)$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');

    if (!probeLive || !slug) {
        return { input: cleaned, detected: false, candidateSlug: slug, boards: [] };
    }

    const candidates = [
        'workday',
        'greenhouse',
        'lever',
        'ashby',
        'workable',
        'recruitee',
        'pinpoint',
        'personio',
        'teamtailor',
        'smartrecruiters',
    ];
    const checks = await Promise.all(
        candidates.map(async (plat) => {
            try {
                const jobs = await scanSingleTarget(plat, slug, 2);
                if (jobs.length > 0) {
                    return {
                        platform: plat,
                        target: slug,
                        companyName: jobs[0].companyName || slug,
                        reachable: true,
                        sampledOpenRoles: jobs.length,
                        hasDisclosedCompensation: jobs.some((j) => Boolean(j.intent?.disclosedSalary)),
                        sampleTitles: jobs.map((j) => j.title),
                    };
                }
            } catch {
                // Ignore unreachable board
            }
            return null;
        }),
    );
    const boards = checks.filter(Boolean);
    return {
        input: cleaned,
        candidateSlug: slug,
        detected: boards.length > 0,
        mode: 'live_slug_probe',
        boards,
    };
}

export async function compareCompaniesHiringIntent(targets = [], maxJobsPerCompany = 4) {
    const boundedTargets = (Array.isArray(targets) ? targets : []).slice(0, 5).map((t) => String(t || '').trim()).filter(Boolean);
    const cap = Math.min(8, Math.max(1, Number(maxJobsPerCompany || 4)));

    const dossiers = await Promise.all(
        boundedTargets.map(async (entry) => {
            const parsed = detectAtsTarget(entry);
            let jobs = [];
            let resolvedPlatform = parsed?.platform || null;
            let resolvedTarget = parsed?.target || entry;

            if (parsed) {
                jobs = await scanSingleTarget(parsed.platform, parsed.target, cap);
            } else {
                const boardInfo = await detectCompanyAtsBoard(entry, true);
                if (boardInfo.boards.length > 0) {
                    resolvedPlatform = boardInfo.boards[0].platform;
                    resolvedTarget = boardInfo.boards[0].target;
                    jobs = await scanSingleTarget(resolvedPlatform, resolvedTarget, cap);
                }
            }

            const scores = jobs.map((j) => j.intent?.intentScore || 0);
            const maxIntentScore = scores.length ? Math.max(...scores) : 0;
            const hotRoleCount = jobs.filter((j) => j.intent?.intentTier === 'HOT').length;
            const aggregatedTechStack = [...new Set(jobs.flatMap((j) => j.intent?.techStackAll || []))];
            const signalCodes = [...new Set(jobs.flatMap((j) => j.intent?.signalCodes || []))];
            const executiveRoles = jobs
                .filter((j) => (j.intent?.signalCodes || []).includes('NEW_LEADERSHIP_DECISION_MAKER'))
                .map((j) => j.title);
            const topDisclosedSalary = jobs.map((j) => j.intent?.disclosedSalary).find(Boolean) || null;
            const topJob = [...jobs].sort((a, b) => (b.intent?.intentScore || 0) - (a.intent?.intentScore || 0))[0] || null;

            return {
                input: entry,
                companyName: topJob?.companyName || resolvedTarget,
                atsPlatform: resolvedPlatform || 'unknown',
                sampledOpenRoles: jobs.length,
                hotRoleCount,
                maxIntentScore,
                accountTier: maxIntentScore >= 70 ? 'PRIORITY_HOT' : maxIntentScore >= 45 ? 'ACTIVE_WARM' : 'MONITOR',
                executiveRoles,
                aggregatedTechStack,
                signalCodes,
                topDisclosedSalary,
                recommendedOutreachHook: topJob?.intent?.outreachHook || null,
            };
        }),
    );

    dossiers.sort((a, b) => b.maxIntentScore - a.maxIntentScore || b.hotRoleCount - a.hotRoleCount);
    return {
        comparedCount: dossiers.length,
        batchScaleNote:
            'Local comparison supports up to 5 accounts interactively. For scheduled 50-10,000+ account waterfalls, use https://mcp.apify.com/?tools=yan0lovesha/multi-ats-jobs-hiring-intent.',
        rankedDossiers: dossiers,
    };
}

export function generateSignalOutreachSequence(args = {}) {
    const {
        companyName,
        roleTitle = 'Senior Platform Engineer',
        techStack = [],
        disclosedSalary = '',
        buyerPersona = 'vp_engineering',
        valueProposition = 'cut onboarding and tooling ramp time by 40%',
    } = args || {};

    const cleanCompany = typeof companyName === 'string' ? companyName.trim() : '';
    if (!cleanCompany) {
        return {
            isError: true,
            error: 'VALIDATION_ERROR',
            field: 'companyName',
            message:
                'Missing required parameter "companyName". Pass a real target company name (e.g. {"companyName": "Ramp", "roleTitle": "Staff Data Platform Engineer"}).',
        };
    }

    const cleanRole = String(roleTitle || 'Senior Platform Engineer').trim() || 'Senior Platform Engineer';
    const roleWithArticle = withIndefiniteArticle(cleanRole);
    const stackList = (Array.isArray(techStack) ? techStack : String(techStack || '').split(','))
        .map((s) => String(s || '').trim())
        .filter((s) => Boolean(s) && !isEmployerSelfBrand(s, cleanCompany, cleanCompany, ''))
        .slice(0, 3);
    const stackPhrase = stackList.length ? stackList.join(' + ') : 'your core stack';
    const cleanValue = normalizeValueClause(valueProposition, 'ship faster without adding headcount');
    const salaryNote = disclosedSalary ? ` (especially at the ${disclosedSalary} band)` : '';

    const personaAngles = {
        vp_engineering: {
            subject1: `${cleanCompany.toLowerCase()} ${cleanRole.toLowerCase()} search`,
            touch1: `Saw ${cleanCompany} opened ${roleWithArticle} role working across ${stackPhrase}. While that seat fills, teams usually hit delivery bottlenecks on the exact workflows that hire will own. We help engineering orgs ${cleanValue} before new hires finish onboarding. Worth sending a one-page architecture note?`,
            touch2: `Quick follow-up on the ${cleanRole} req: are you prioritizing ${stackPhrase} throughput this quarter, or keeping capacity flat until the role is filled? Happy to share a two-minute teardown tailored to ${cleanCompany}.`,
            touch3: `Closing the loop so I don't clutter your inbox. If scaling ${stackPhrase} velocity comes back to the top of ${cleanCompany}'s roadmap, let me know and I'll send over the benchmark notes.`,
        },
        cfo_finance: {
            subject1: `hiring roi / ${cleanRole.toLowerCase()}`,
            touch1: `Noticed ${cleanCompany} is budgeting for ${roleWithArticle}${salaryNote}. Most finance leaders we work with automate manual ${stackPhrase} workloads alongside new headcount so OPEX scales sub-linearly. We help teams ${cleanValue}. Open to a brief payback-comparison note?`,
            touch2: `Following up briefly: even trimming 30 days of ramp friction around your ${stackPhrase} workflow typically pays back within one quarter. Happy to send the unit-economics breakdown if helpful.`,
            touch3: `Last note from me. Whenever headcount efficiency around ${cleanCompany}'s ${stackPhrase} stack becomes a focus, feel free to reply here.`,
        },
        revops_gtm: {
            subject1: `${cleanCompany.toLowerCase()} gtm signal`,
            touch1: `Spotted ${cleanCompany} hiring ${roleWithArticle} with ${stackPhrase} in the stack. Usually that signals an active pipeline or operational push. We help GTM and RevOps teams ${cleanValue} without rebuilding existing workflows. Open to seeing how peer teams wire this up?`,
            touch2: `Quick follow-up on ${cleanCompany}'s ${cleanRole} buildout: happy to share the exact workflow template teams use on top of ${stackPhrase} if that saves your team setup hours.`,
            touch3: `Signing off on this thread for now. Reach out anytime if automating ${stackPhrase} handoffs moves up the priority list at ${cleanCompany}.`,
        },
    };

    const chosen = personaAngles[buyerPersona] || personaAngles.vp_engineering;
    return {
        companyName: cleanCompany,
        buyerPersona: personaAngles[buyerPersona] ? buyerPersona : 'vp_engineering',
        subjectLine: chosen.subject1.trim(),
        touches: [
            { step: 1, dayOffset: 0, body: chosen.touch1, wordCount: chosen.touch1.split(/\s+/).length },
            { step: 2, dayOffset: 3, body: chosen.touch2, wordCount: chosen.touch2.split(/\s+/).length },
            { step: 3, dayOffset: 7, body: chosen.touch3, wordCount: chosen.touch3.split(/\s+/).length },
        ],
        clayCreditSaverFormula: '{{intentScore}} >= 60 && ({{intentTier}} == "HOT" || {{signalCodes}}?.length > 0)',
        proAutomationTemplateUrl: 'https://www.agensi.io/skills/b2b-signal-to-cold-email-autopilot-pro-clay-n8n',
    };
}

const READ_ONLY_ANNOTATIONS = {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
};

const TOOLS = [
    {
        name: 'scan_company_hiring_intent',
        description:
            'Scan a single company career board across 10 ATS platforms (workday, greenhouse, lever, ashby, personio, teamtailor, smartrecruiters, workable, recruitee, pinpoint) via career URL (`url`) or (`platform` + `target`) to extract open jobs, 125+ tech-stack signals, disclosed salaries, and B2B buying intent scores.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description:
                        'Full career board URL (auto-detects *.myworkdayjobs.com/*, *.myworkdaysite.com/*, boards.greenhouse.io/*, job-boards.greenhouse.io/*, jobs.lever.co/*, jobs.ashbyhq.com/*, *.jobs.personio.de/*, *.teamtailor.com/*, careers.smartrecruiters.com/*, apply.workable.com/*, *.recruitee.com/*, *.pinpointhq.com/*).',
                },
                platform: {
                    type: 'string',
                    enum: [
                        'auto',
                        'workday',
                        'greenhouse',
                        'lever',
                        'ashby',
                        'personio',
                        'teamtailor',
                        'smartrecruiters',
                        'workable',
                        'recruitee',
                        'pinpoint',
                    ],
                    description: 'ATS platform identifier (defaults to auto when url is passed).',
                },
                target: {
                    type: 'string',
                    description:
                        'Company ATS board slug or career URL (e.g. nvidia, salesforce, figma, zoox, ramp, adsquare, puzzel, viva, channable, smartthings, Canva).',
                },
                maxJobs: { type: 'number', default: 5, minimum: 1, maximum: 10, description: 'Maximum open roles to enrich (1-10).' },
            },
        },
    },
    {
        name: 'compare_companies_hiring_intent',
        description:
            'Scan and rank up to 5 company career URLs or slugs in parallel across all 10 ATS platforms (including Workday Fortune 500 boards), returning prioritized Account Buying Dossiers with maxIntentScore, hotRoleCount, executive hires, aggregated tech stack, and disclosed salary bands.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            required: ['targets'],
            properties: {
                targets: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 5,
                    description:
                        'List of 1 to 5 career URLs, platform:slug strings (e.g. "workday:nvidia", "greenhouse:figma", "ashby:ramp"), or company slugs.',
                },
                maxJobsPerCompany: {
                    type: 'number',
                    default: 4,
                    minimum: 1,
                    maximum: 8,
                    description: 'Number of roles sampled per company (1-8).',
                },
            },
        },
    },
    {
        name: 'detect_company_ats_board',
        description:
            'Identify which of the 10 supported ATS platforms powers a career URL, or probe a company slug live across Workday (55+ Fortune 500 boards), Greenhouse, Lever, Ashby, Workable, Recruitee, Pinpoint, Personio, Teamtailor, and SmartRecruiters to find active job boards and compensation availability.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            required: ['input'],
            properties: {
                input: {
                    type: 'string',
                    description:
                        'Company career URL (e.g. https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite, https://boards.greenhouse.io/figma) or company slug (e.g. nvidia, salesforce, ramp, zoox, figma).',
                },
                probeLive: {
                    type: 'boolean',
                    default: true,
                    description: 'When true, verifies live board reachability and samples active role titles.',
                },
            },
        },
    },
    {
        name: 'generate_signal_outreach_sequence',
        description:
            'Convert a detected B2B hiring signal (company name, open role, tech stack, and optional salary band) into a concise 3-touch plain-text outbound sequence (<=75 words per email) tailored to VP Engineering, CFO/Finance, or RevOps/GTM plus a Clay credit-saver filter formula.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            required: ['companyName', 'roleTitle'],
            properties: {
                companyName: { type: 'string', description: 'Target company name.' },
                roleTitle: { type: 'string', description: 'Open job title triggering the buying signal.' },
                techStack: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Detected tech stack tags (e.g. ["Snowflake", "dbt", "Kubernetes"]).',
                },
                disclosedSalary: { type: 'string', description: 'Optional disclosed compensation band.' },
                buyerPersona: {
                    type: 'string',
                    enum: ['vp_engineering', 'cfo_finance', 'revops_gtm'],
                    default: 'vp_engineering',
                    description: 'Executive persona to tailor messaging for.',
                },
                valueProposition: {
                    type: 'string',
                    description: 'One-phrase outcome your product delivers (e.g. "cut Snowflake compute spend by 30%").',
                },
            },
        },
    },
    {
        name: 'list_cloud_b2b_lead_apis',
        description:
            'List all 19 hosted Cloud Pay-Per-Event B2B Lead, Ad Spy, App Store, Contact Enrichment & Hiring Intent APIs (10-ATS Unified API, Workday Fortune 500 Jobs & Salary API, LinkedIn Ad Library B2B Ads Spy API, Google Ads Transparency API, Apple App Store & iOS Reviews API, Website Contact/Work Email/DNS MX & 70+ Tech Stack API, dedicated ATS APIs, and US FMCSA/GovCon/NPI/FDA 510k APIs) with streamable-http MCP URLs and REST invocation endpoints.',
        annotations: READ_ONLY_ANNOTATIONS,
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: [
                        'all',
                        'ats_hiring_intent',
                        'ad_spy_contact_enrichment',
                        'us_fleet_govcon',
                        'us_healthcare_fda',
                    ],
                    default: 'all',
                    description: 'Optional vertical filter for Cloud PPE APIs.',
                },
            },
        },
    },
];

async function handleRpc(msg) {
    const { id, method, params } = msg;
    if (method === 'initialize') {
        return {
            jsonrpc: '2.0',
            id,
            result: {
                protocolVersion: params?.protocolVersion || '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: SERVER_INFO,
            },
        };
    }
    if (method === 'notifications/initialized') return null;
    if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
    if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    if (method === 'resources/list') return { jsonrpc: '2.0', id, result: { resources: [] } };
    if (method === 'prompts/list') return { jsonrpc: '2.0', id, result: { prompts: [] } };
    if (method === 'tools/call') {
        const args = params?.arguments || {};
        if (params?.name === 'list_cloud_b2b_lead_apis') {
            const cat = args.category && args.category !== 'all' ? args.category : null;
            const allowedKeys = cat && CLOUD_CATALOG_CATEGORIES[cat] ? new Set(CLOUD_CATALOG_CATEGORIES[cat]) : null;
            const endpoints = Object.fromEntries(
                Object.entries(CLOUD_ACTOR_MAP)
                    .filter(([k]) => !allowedKeys || allowedKeys.has(k))
                    .map(([k, actorTilde]) => {
                        const slashSlug = actorTilde.replace('~', '/');
                        return [
                            k,
                            {
                                actorIdSlug: actorTilde,
                                storeUrl: `https://apify.com/${slashSlug}`,
                                hostedMcpUrl: `https://mcp.apify.com/?tools=${slashSlug}`,
                                syncRestEndpoint: `https://api.apify.com/v2/acts/${actorTilde}/run-sync-get-dataset-items`,
                            },
                        ];
                    }),
            );
            return {
                jsonrpc: '2.0',
                id,
                result: {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    storeProfile: 'https://apify.com/yan0lovesha',
                                    mcpEndpoint: 'https://mcp.apify.com',
                                    officialMcpRegistryName: 'io.github.yan0lovesha/hiring-intent-mcp',
                                    glamaPage: 'https://glama.ai/mcp/servers/yan0lovesha/hiring-intent-mcp',
                                    agensiCreatorProfile: 'https://www.agensi.io/creators/yan0lovesha',
                                    agensiFreeHiringRadarSkill:
                                        'https://www.agensi.io/skills/b2b-hiring-intent-125-tech-stack-radar-9-global-ats',
                                    agensiOutboundAutopilotSkill:
                                        'https://www.agensi.io/skills/b2b-signal-to-cold-email-autopilot-pro-clay-n8n',
                                    categoryFilter: cat || 'all',
                                    actors: CLOUD_ACTOR_MAP,
                                    endpoints,
                                },
                                null,
                                2,
                            ),
                        },
                    ],
                },
            };
        }
        if (params?.name === 'scan_company_hiring_intent') {
            const inputTarget = String(args.url || args.target || '');
            const inputPlatform = args.url ? 'auto' : args.platform || 'auto';
            const data = await scanSingleTarget(inputPlatform, inputTarget, args.maxJobs);
            return {
                jsonrpc: '2.0',
                id,
                result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] },
            };
        }
        if (params?.name === 'compare_companies_hiring_intent' || params?.name === 'compare_companies_hiring_dossier') {
            const data = await compareCompaniesHiringIntent(args.targets || [], args.maxJobsPerCompany);
            return {
                jsonrpc: '2.0',
                id,
                result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] },
            };
        }
        if (params?.name === 'detect_company_ats_board') {
            const data = await detectCompanyAtsBoard(args.input || '', args.probeLive !== false);
            return {
                jsonrpc: '2.0',
                id,
                result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] },
            };
        }
        if (params?.name === 'generate_signal_outreach_sequence') {
            const data = generateSignalOutreachSequence(args);
            if (data.isError) {
                return {
                    jsonrpc: '2.0',
                    id,
                    result: { isError: true, content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] },
                };
            }
            return {
                jsonrpc: '2.0',
                id,
                result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] },
            };
        }
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${params?.name}` } };
    }
    return id !== undefined ? { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } } : null;
}

const isMain = (() => {
    try {
        return Boolean(process.argv[1]) && fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
    } catch {
        return false;
    }
})();

if (isMain) {
    const argv = process.argv.slice(2);
    if (argv.includes('--help') || argv.includes('-h')) {
        process.stdout.write(
            [
                `${SERVER_INFO.name} v${SERVER_INFO.version} — Zero-Dependency 10-ATS Hiring Intent MCP Server & CLI`,
                '',
                'Usage:',
                '  npx -y github:yan0lovesha/hiring-intent-mcp                                      # Start MCP stdio server (Claude Desktop, Cursor, VS Code)',
                '  npx -y github:yan0lovesha/hiring-intent-mcp --cli --url <career_url> [--max 4]   # Scan any supported ATS career URL',
                '  npx -y github:yan0lovesha/hiring-intent-mcp --cli --platform <ats> --target <id> # Scan explicit ATS slug',
                '',
                'Supported ATS Platforms (10):',
                '  workday (55+ Fortune 500 + *.myworkdayjobs.com), greenhouse, lever (US + EU), ashby, personio, teamtailor, smartrecruiters, workable, recruitee, pinpoint',
                '',
                'Hosted Cloud Batch & Remote MCP Gateway (19 PPE APIs — 100-10,000+ targets + LinkedIn/Google Ads Spy + iOS App Store + Contact Finder + US Leads):',
                '  https://mcp.apify.com/?tools=yan0lovesha/multi-ats-jobs-hiring-intent',
                '  https://apify.com/yan0lovesha',
                '',
            ].join('\n'),
        );
        process.exit(0);
    }
    if (argv.includes('--version') || argv.includes('-v')) {
        process.stdout.write(`${SERVER_INFO.version}\n`);
        process.exit(0);
    }
    if (argv.includes('--cli') || argv.includes('--url') || argv.includes('--platform')) {
        const getArg = (k, d) => {
            const i = process.argv.indexOf(`--${k}`);
            return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
        };
        const careerUrl = getArg('url', '');
        const items = careerUrl
            ? await scanSingleTarget('auto', careerUrl, Number(getArg('max', '4')))
            : await scanSingleTarget(getArg('platform', 'ashby'), getArg('target', 'ramp'), Number(getArg('max', '4')));
        process.stdout.write(JSON.stringify(items, null, 2) + '\n');
    } else {
        const rl = readline.createInterface({ input: process.stdin, terminal: false });
        for await (const line of rl) {
            const t = line.trim();
            if (!t) continue;
            let parsed;
            try {
                parsed = JSON.parse(t);
            } catch {
                process.stdout.write(
                    JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n',
                );
                continue;
            }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                process.stdout.write(
                    JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }) + '\n',
                );
                continue;
            }
            try {
                const res = await handleRpc(parsed);
                if (res) process.stdout.write(JSON.stringify(res) + '\n');
            } catch (err) {
                process.stdout.write(
                    JSON.stringify({
                        jsonrpc: '2.0',
                        id: parsed.id ?? null,
                        error: { code: -32603, message: err instanceof Error ? err.message : 'Internal error' },
                    }) + '\n',
                );
            }
        }
    }
}
