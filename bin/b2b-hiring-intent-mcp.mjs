#!/usr/bin/env node
/**
 * b2b-hiring-intent-mcp — Open-Core Zero-Dependency MCP Server & CLI
 *
 * Inspect single companies & regulatory filings locally over stdio MCP (`Claude Desktop`, `Cursor`, `VS Code Copilot`),
 * or scale to 100–10,000+ targets on schedule via our 10 hosted Cloud Pay-Per-Event APIs:
 *   https://apify.com/yan0lovesha
 */

import readline from 'node:readline';

const SERVER_INFO = {
    name: 'b2b-hiring-intent-mcp',
    version: '1.0.0',
};

const CLOUD_ACTOR_MAP = {
    ashby: 'yan0lovesha~ashby-jobs-hiring-intent',
    personio: 'yan0lovesha~personio-jobs-hiring-intent',
    teamtailor: 'yan0lovesha~teamtailor-jobs-hiring-signal',
    smartrecruiters: 'yan0lovesha~smartrecruiters-jobs-hiring-intent',
    workable: 'yan0lovesha~workable-jobs-hiring-intent',
    recruitee: 'yan0lovesha~recruitee-jobs-hiring-intent',
    pinpoint: 'yan0lovesha~pinpoint-jobs-hiring-intent',
    us_permits: 'yan0lovesha~us-building-solar-permits-leads',
    us_npi_clinics: 'yan0lovesha~us-npi-medical-dental-clinics-leads',
    fda_510k: 'yan0lovesha~fda-510k-medical-device-leads',
};

const TECH_PATTERNS = [
    ['Salesforce', 'crm_sales', /\bsalesforce\b|\bsfdc\b/i],
    ['HubSpot', 'crm_sales', /\bhubspot\b/i],
    ['Gong', 'crm_sales', /\bgong\.io\b|\bgong\s+(?:revenue|intelligence)/i],
    ['AWS', 'cloud_infra', /\baws\b|\bamazon\s+web\s+services\b/i],
    ['Microsoft Azure', 'cloud_infra', /\bazure\b/i],
    ['Google Cloud (GCP)', 'cloud_infra', /\bgcp\b|\bgoogle\s+cloud\b/i],
    ['Kubernetes', 'cloud_infra', /\bkubernetes\b|\bk8s\b/i],
    ['Docker', 'cloud_infra', /\bdocker\b/i],
    ['Terraform', 'cloud_infra', /\bterraform\b/i],
    ['Datadog', 'cloud_infra', /\bdatadog\b/i],
    ['Snowflake', 'data_analytics', /\bsnowflake\b/i],
    ['Databricks', 'data_analytics', /\bdatabricks\b/i],
    ['BigQuery', 'data_analytics', /\bbigquery\b/i],
    ['dbt', 'data_analytics', /\bdbt\b/i],
    ['Apache Airflow', 'data_analytics', /\bairflow\b/i],
    ['Apache Kafka', 'data_analytics', /\bkafka\b/i],
    ['PostgreSQL', 'data_analytics', /\bpostgresql\b|\bpostgres\b/i],
    ['OpenAI / GPT', 'ai_llm', /\bopenai\b|\bgpt-4[o]?\b|\bgpt-5\b/i],
    ['Anthropic / Claude', 'ai_llm', /\banthropic\b|\bclaude\s+(?:3|4|sonnet|opus)/i],
    ['LangChain / LangGraph', 'ai_llm', /\blangchain\b|\blanggraph\b/i],
    ['PyTorch', 'ai_llm', /\bpytorch\b/i],
    ['TypeScript', 'devtools_engineering', /\btypescript\b/i],
    ['Python', 'devtools_engineering', /\bpython\b/i],
    ['Go (Golang)', 'devtools_engineering', /\bgolang\b/i],
    ['Rust', 'devtools_engineering', /\brust\b(?!\s*(?:free|proof))/i],
    ['C# / .NET', 'devtools_engineering', /(?:^|[\s,/(])c#(?=$|[\s,/.)])|(?:^|[\s,/(])\.net(?:\s*(?:core|framework|8|9))?\b|\basp\.net\b/i],
    ['React', 'devtools_engineering', /\breact(?:\.js|js)?\b/i],
    ['Node.js', 'devtools_engineering', /\bnode\.?js\b/i],
    ['SAP', 'erp_finance', /\bsap\b/i],
    ['NetSuite', 'erp_finance', /\bnetsuite\b/i],
    ['Stripe', 'erp_finance', /\bstripe\b/i],
    ['Okta / Auth0', 'security_compliance', /\bokta\b|\bauth0\b/i],
    ['ISO 27001 / SOC 2', 'security_compliance', /\biso\s*[/-]?\s*27001\b|\bsoc\s*2\b/i],
];

const SIGNAL_PATTERNS = [
    ['BUDGET_EXPANSION', 22, /\b(?:rapidly\s+growing|scaling\s+rapidly|hyper[- ]?growth|newly\s+created\s+role|expanding\s+(?:our|the)\s+team|series\s+[a-d])\b/i],
    ['TECH_MIGRATION_MODERNIZATION', 26, /\b(?:greenfield|from\s+scratch|0\s+to\s+1|cloud\s+migration|migrating|moderniz(?:e|ing)|re-?platform|shared\s+data\s+platform)\b/i],
    ['AI_TRANSFORMATION_INITIATIVE', 22, /\b(?:ai[- ]native|genai|generative\s+ai|conversational\s+intelligence|mlops|llm\s+agent)\b/i],
];

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

function enrichIntent(job, structuredSalary = null) {
    const corpus = `${job.title}\n${job.department || ''}\n${job.descriptionText || ''}`;
    const techStackAll = [];
    for (const [name, , re] of TECH_PATTERNS) {
        if (re.test(corpus)) techStackAll.push(name);
    }

    const signalCodes = [];
    let score = 18 + Math.min(28, techStackAll.length * 5);
    if (/\b(chief|cto|cfo|vp|vice\s+president|head\s+of|director|team\s*lead|staff\b|principal)\b/i.test(job.title)) {
        signalCodes.push('NEW_LEADERSHIP_DECISION_MAKER');
        score += 24;
    }
    for (const [code, weight, re] of SIGNAL_PATTERNS) {
        if (re.test(corpus)) {
            signalCodes.push(code);
            score += weight;
        }
    }
    if (structuredSalary) score += 8;

    const intentScore = Math.min(100, score);
    const intentTier = intentScore >= 70 ? 'HOT' : intentScore >= 45 ? 'WARM' : 'MONITOR';
    const topTools = techStackAll.slice(0, 3).join(', ');
    return {
        intentScore,
        intentTier,
        techStackAll,
        signalCodes,
        disclosedSalary: structuredSalary,
        outreachHook: `Noticed ${job.companyName} is hiring a ${job.title}${job.location ? ` in ${job.location}` : ''}${topTools ? ` working with ${topTools}` : ''}.`,
    };
}

async function fetchSafe(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; B2BHiringIntentMCP/1.0)' },
        signal: AbortSignal.timeout(15000),
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
}

async function scanSingleTarget(platform, target, maxJobs = 5) {
    const cap = Math.min(10, Math.max(1, Number(maxJobs || 5)));
    const p = String(platform || 'ashby').toLowerCase();

    if (p === 'ashby') {
        const slug = target.replace(/^https?:\/\/jobs\.ashbyhq\.com\//i, '').split('/')[0].trim();
        const r = await fetchSafe(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`);
        if (!r.ok) return [];
        const j = JSON.parse(r.text);
        return (j.jobs || []).slice(0, cap).map((item) => {
            const sal = item.compensation?.compensationTierSummary || item.compensation?.scrapeableCompensationSalarySummary || null;
            const job = {
                atsPlatform: 'ashby',
                companyName: j.organizationName || slug,
                title: item.title,
                department: item.department || item.team || 'General',
                location: item.location || 'Remote',
                jobUrl: item.jobUrl,
                descriptionText: (item.descriptionPlain || htmlToText(item.descriptionHtml || '')).slice(0, 900),
            };
            return { ...job, intent: enrichIntent(job, sal) };
        });
    }

    if (p === 'personio') {
        const slug = target.replace(/\.jobs\.personio\.(de|com).*$/i, '').replace(/^https?:\/\//i, '').trim();
        const baseUrl = `https://${slug}.jobs.personio.de`;
        const xmlRes = await fetchSafe(`${baseUrl}/xml?language=en`);
        if (xmlRes.ok && /<position>/i.test(xmlRes.text)) {
            return xmlAllBlocks(xmlRes.text, 'position').slice(0, cap).map((pos) => {
                const id = xmlTag(pos, 'id');
                const desc = htmlToText(xmlAllBlocks(pos, 'jobDescription').map((b) => xmlTag(b, 'value')).join('\n'));
                const job = {
                    atsPlatform: 'personio',
                    companyName: xmlTag(pos, 'subcompany') || slug,
                    title: xmlTag(pos, 'name'),
                    department: xmlTag(pos, 'department') || 'General',
                    location: xmlTag(pos, 'office') || 'Europe',
                    jobUrl: `${baseUrl}/job/${id}?language=en`,
                    descriptionText: desc.slice(0, 900),
                };
                return { ...job, intent: enrichIntent(job) };
            });
        }
        return [];
    }

    if (p === 'teamtailor') {
        const baseUrl = /^https?:\/\//i.test(target) ? new URL(target).origin : `https://${target.trim()}.teamtailor.com`;
        const rss = await fetchSafe(`${baseUrl}/jobs.rss`);
        if (!rss.ok) return [];
        const companyName = xmlTag(rss.text.split('<item>')[0] || '', 'title') || target;
        return xmlAllBlocks(rss.text, 'item').slice(0, cap).map((item) => {
            const desc = htmlToText(xmlTag(item, 'description'));
            const job = {
                atsPlatform: 'teamtailor',
                companyName,
                title: xmlTag(item, 'title'),
                department: xmlTag(item, 'tt:department') || 'General',
                location: xmlTag(item, 'tt:name') || 'Europe',
                jobUrl: xmlTag(item, 'link'),
                descriptionText: desc.slice(0, 900),
            };
            return { ...job, intent: enrichIntent(job) };
        });
    }

    if (p === 'workable') {
        const slug = target.trim().toLowerCase();
        const r = await fetchSafe(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}?details=true`);
        if (!r.ok) return [];
        const j = JSON.parse(r.text);
        return (j.jobs || []).slice(0, cap).map((item) => {
            const desc = htmlToText(item.description || '');
            const job = {
                atsPlatform: 'workable',
                companyName: j.name || slug,
                title: item.title,
                department: item.department || 'General',
                location: [item.city, item.country].filter(Boolean).join(', '),
                jobUrl: item.url,
                descriptionText: desc.slice(0, 900),
            };
            return { ...job, intent: enrichIntent(job) };
        });
    }

    if (p === 'recruitee') {
        const slug = target.replace(/\.recruitee\.com.*$/i, '').trim().toLowerCase();
        const r = await fetchSafe(`https://${slug}.recruitee.com/api/offers`);
        if (!r.ok) return [];
        const j = JSON.parse(r.text);
        return (j.offers || []).slice(0, cap).map((o) => {
            const desc = htmlToText(`${o.description || ''}\n${o.requirements || ''}`);
            const job = {
                atsPlatform: 'recruitee',
                companyName: o.company_name || slug,
                title: o.title,
                department: o.department || 'General',
                location: o.location || o.city || 'Europe',
                jobUrl: o.careers_url,
                descriptionText: desc.slice(0, 900),
            };
            return { ...job, intent: enrichIntent(job) };
        });
    }

    if (p === 'pinpoint') {
        const slug = target.replace(/\.pinpointhq\.com.*$/i, '').trim().toLowerCase();
        const r = await fetchSafe(`https://${slug}.pinpointhq.com/postings.json`);
        if (!r.ok) return [];
        const parsed = JSON.parse(r.text);
        const arr = Array.isArray(parsed) ? parsed : parsed.data || [];
        return arr.slice(0, cap).map((item) => {
            const desc = htmlToText(`${item.description || ''}\n${item.skills_knowledge_expertise || ''}`);
            const job = {
                atsPlatform: 'pinpoint',
                companyName: slug,
                title: item.title,
                department: item.job?.department?.name || 'General',
                location: item.location?.name || 'Global',
                reportingTo: item.reporting_to || null,
                jobUrl: item.url,
                descriptionText: desc.slice(0, 900),
            };
            return { ...job, intent: enrichIntent(job) };
        });
    }

    if (p === 'smartrecruiters') {
        const slug = target.trim();
        const r = await fetchSafe(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${cap}`);
        if (!r.ok) return [];
        const j = JSON.parse(r.text);
        return (j.content || []).slice(0, cap).map((item) => {
            const job = {
                atsPlatform: 'smartrecruiters',
                companyName: item.company?.name || slug,
                title: item.name,
                department: item.department?.label || 'General',
                location: [item.location?.city, item.location?.country?.toUpperCase()].filter(Boolean).join(', '),
                jobUrl: `https://jobs.smartrecruiters.com/${slug}/${item.id}`,
                descriptionText: '',
            };
            return { ...job, intent: enrichIntent(job) };
        });
    }

    return [];
}

const TOOLS = [
    {
        name: 'scan_company_hiring_intent',
        description:
            'Scan a single company board across 7 ATS platforms (ashby, personio, teamtailor, smartrecruiters, workable, recruitee, pinpoint) to extract open jobs, tech stack, disclosed salaries, and B2B buying intent scores. For 50-10,000 company batch runs, XML-404 fallbacks & Company Dossiers, use https://apify.com/yan0lovesha.',
        inputSchema: {
            type: 'object',
            properties: {
                platform: {
                    type: 'string',
                    enum: ['ashby', 'personio', 'teamtailor', 'smartrecruiters', 'workable', 'recruitee', 'pinpoint'],
                },
                target: { type: 'string', description: 'Company ATS board slug (e.g. ramp, adsquare, puzzel, viva, channable, smartthings, Canva).' },
                maxJobs: { type: 'number', default: 5 },
            },
            required: ['platform', 'target'],
        },
    },
    {
        name: 'list_cloud_b2b_lead_apis',
        description:
            'List all 10 production Cloud Pay-Per-Event APIs (7 Global/EU ATS Hiring Intent APIs + US Solar/Building Permits + US Medical/Dental Clinic Owners + FDA 510k Cleared MedTech Leads) available on Apify Store.',
        inputSchema: { type: 'object', properties: {} },
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
    if (method === 'tools/call') {
        if (params?.name === 'list_cloud_b2b_lead_apis') {
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
                                    actors: CLOUD_ACTOR_MAP,
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
            const data = await scanSingleTarget(params.arguments?.platform, String(params.arguments?.target || ''), params.arguments?.maxJobs);
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

if (process.argv.includes('--cli')) {
    const getArg = (k, d) => {
        const i = process.argv.indexOf(`--${k}`);
        return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
    };
    const items = await scanSingleTarget(getArg('platform', 'ashby'), getArg('target', 'ramp'), Number(getArg('max', '4')));
    process.stdout.write(JSON.stringify(items, null, 2) + '\n');
} else {
    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    for await (const line of rl) {
        const t = line.trim();
        if (!t.startsWith('{')) continue;
        const res = await handleRpc(JSON.parse(t));
        if (res) process.stdout.write(JSON.stringify(res) + '\n');
    }
}
