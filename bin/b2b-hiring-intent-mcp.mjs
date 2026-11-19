#!/usr/bin/env node
/**
 * b2b-hiring-intent-mcp v1.1.0 — Open-Core Zero-Dependency 9-ATS MCP Server & CLI
 *
 * Inspect any company across 9 ATS platforms (Greenhouse, Lever, Ashby, Personio, Teamtailor,
 * SmartRecruiters, Workable, Recruitee, Pinpoint) locally over stdio MCP (`Claude Desktop`, `Cursor`, `VS Code Copilot`),
 * or scale to 100–10,000+ targets on schedule via our 11 hosted Cloud Pay-Per-Event APIs:
 *   https://apify.com/yan0lovesha
 */

import fs from 'node:fs';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const SERVER_INFO = {
    name: 'b2b-hiring-intent-mcp',
    version: '1.2.1',
};

const CLOUD_ACTOR_MAP = {
    multi_ats: 'yan0lovesha~multi-ats-jobs-hiring-intent',
    greenhouse: 'yan0lovesha~greenhouse-jobs-hiring-intent',
    lever: 'yan0lovesha~lever-jobs-hiring-intent',
    ashby: 'yan0lovesha~ashby-jobs-hiring-intent',
    personio: 'yan0lovesha~personio-jobs-hiring-intent',
    teamtailor: 'yan0lovesha~teamtailor-jobs-hiring-signal',
    smartrecruiters: 'yan0lovesha~smartrecruiters-jobs-hiring-intent',
    workable: 'yan0lovesha~workable-jobs-hiring-intent',
    recruitee: 'yan0lovesha~recruitee-jobs-hiring-intent',
    pinpoint: 'yan0lovesha~pinpoint-jobs-hiring-intent',
    us_permits: 'yan0lovesha~us-building-solar-permits-leads',
    us_contractor_licenses: 'yan0lovesha~us-contractor-licenses-leads',
    us_fmcsa_trucking: 'yan0lovesha~us-fmcsa-trucking-fleet-leads',
    us_federal_contracts: 'yan0lovesha~us-federal-contracts-awards-leads',
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
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; B2BHiringIntentMCP/1.1)' },
        signal: AbortSignal.timeout(15000),
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
}

const SUPPORTED_PLATFORMS = new Set([
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
                const pIdx = parts.indexOf('postings');
                if (pIdx >= 0 && parts[pIdx + 1]) return { platform: 'lever', target: decodeURIComponent(parts[pIdx + 1]) };
                if (parts[0]) return { platform: 'lever', target: decodeURIComponent(parts[0]) };
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

export async function scanSingleTarget(platform, target, maxJobs = 5) {
    const cap = Math.min(10, Math.max(1, Number(maxJobs || 5)));
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
        const jobs = [...(j.jobs || [])].sort((a, b) => {
            const pA = a.pay_input_ranges?.length ? 1 : 0;
            const pB = b.pay_input_ranges?.length ? 1 : 0;
            return pB - pA;
        });
        return jobs.slice(0, cap).map((item) => {
            const pr = (item.pay_input_ranges || [])[0];
            const sal =
                pr && (pr.min_cents || pr.max_cents)
                    ? `${pr.currency_type || 'USD'} $${Math.round((pr.min_cents || 0) / 100).toLocaleString('en-US')} - $${Math.round((pr.max_cents || 0) / 100).toLocaleString('en-US')}`
                    : null;
            const desc = htmlToText(item.content || '');
            const job = {
                atsPlatform: 'greenhouse',
                companyName: item.company_name || slug,
                title: item.title,
                department: item.departments?.[0]?.name || 'General',
                location: item.location?.name || item.offices?.[0]?.name || 'Global',
                jobUrl: item.absolute_url || `https://boards.greenhouse.io/${slug}/jobs/${item.id}`,
                descriptionText: desc.slice(0, 900),
            };
            return { ...job, intent: enrichIntent(job, sal) };
        });
    }

    if (p === 'lever') {
        const slug = resolvedTarget.replace(/^https?:\/\/jobs(?:\.eu)?\.lever\.co\//i, '').split('/')[0].trim();
        const r = await fetchSafe(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json&limit=${Math.max(15, cap * 3)}`);
        if (!r.ok) return [];
        const arr = JSON.parse(r.text);
        if (!Array.isArray(arr)) return [];
        arr.sort((a, b) => ((b.salaryRange?.min ? 1 : 0) - (a.salaryRange?.min ? 1 : 0)));
        return arr.slice(0, cap).map((item) => {
            const sr = item.salaryRange;
            const sal =
                sr && (sr.min || sr.max)
                    ? `${sr.currency || 'USD'} ${Number(sr.min || 0).toLocaleString('en-US')} - ${Number(sr.max || 0).toLocaleString('en-US')} (${sr.interval || 'per-year'})`
                    : null;
            const listsText = (item.lists || []).map((l) => `${l.text || ''}: ${htmlToText(l.content || '')}`).join('\n');
            const fullDesc = [item.descriptionPlain || htmlToText(item.description || ''), listsText, item.additionalPlain || '']
                .filter(Boolean)
                .join('\n');
            const job = {
                atsPlatform: 'lever',
                companyName: slug,
                title: item.text,
                department: item.categories?.department || item.categories?.team || 'General',
                location: item.categories?.location || 'Global',
                jobUrl: item.hostedUrl,
                descriptionText: fullDesc.slice(0, 900),
            };
            return { ...job, intent: enrichIntent(job, sal) };
        });
    }

    if (p === 'ashby') {
        const slug = resolvedTarget.replace(/^https?:\/\/jobs\.ashbyhq\.com\//i, '').split('/')[0].trim();
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
        const slug = resolvedTarget.replace(/\.jobs\.personio\.(de|com).*$/i, '').replace(/^https?:\/\//i, '').trim();
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
        const baseUrl = /^https?:\/\//i.test(resolvedTarget) ? new URL(resolvedTarget).origin : `https://${resolvedTarget.trim()}.teamtailor.com`;
        const rss = await fetchSafe(`${baseUrl}/jobs.rss`);
        if (!rss.ok) return [];
        const companyName = xmlTag(rss.text.split('<item>')[0] || '', 'title') || resolvedTarget;
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
        const slug = resolvedTarget.trim().toLowerCase();
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
        const slug = resolvedTarget.replace(/\.recruitee\.com.*$/i, '').trim().toLowerCase();
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
        const slug = resolvedTarget.replace(/\.pinpointhq\.com.*$/i, '').trim().toLowerCase();
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
        const slug = resolvedTarget.trim();
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
            'Scan any company career board across 9 ATS platforms (greenhouse, lever, ashby, personio, teamtailor, smartrecruiters, workable, recruitee, pinpoint) by passing either a career URL (`url`) or (`platform` + `target`) to extract open jobs, tech stack, disclosed salaries, and B2B buying intent scores. For 50-10,000 company batch runs & Account Dossiers, use https://apify.com/yan0lovesha.',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description:
                        'Optional full career board URL (auto-detects boards.greenhouse.io/*, job-boards.greenhouse.io/*, jobs.lever.co/*, jobs.ashbyhq.com/*, *.jobs.personio.de/*, *.teamtailor.com/*, careers.smartrecruiters.com/*, apply.workable.com/*, *.recruitee.com/*, *.pinpointhq.com/*).',
                },
                platform: {
                    type: 'string',
                    enum: ['auto', 'greenhouse', 'lever', 'ashby', 'personio', 'teamtailor', 'smartrecruiters', 'workable', 'recruitee', 'pinpoint'],
                },
                target: {
                    type: 'string',
                    description: 'Company ATS board slug or career URL (e.g. figma, zoox, ramp, adsquare, puzzel, viva, channable, smartthings, Canva).',
                },
                maxJobs: { type: 'number', default: 5 },
            },
        },
    },
    {
        name: 'list_cloud_b2b_lead_apis',
        description:
            'List all 16 production Cloud Pay-Per-Event APIs (Flagship 9-ATS Unified Hiring Intent API + 9 Dedicated Global/EU ATS APIs + US Solar/Building Permits + US Licensed Contractors + FMCSA Trucking Fleets + Federal Contract Awards + US Medical/Dental Clinic Owners + FDA 510k Cleared MedTech Leads) plus Agensi AI Agent Skills.',
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
    if (method === 'resources/list') return { jsonrpc: '2.0', id, result: { resources: [] } };
    if (method === 'prompts/list') return { jsonrpc: '2.0', id, result: { prompts: [] } };
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
                                    agensiCreatorProfile: 'https://www.agensi.io/creators/yan0lovesha',
                                    agensiFreeHiringRadarSkill:
                                        'https://www.agensi.io/skills/b2b-hiring-intent-125-tech-stack-radar-9-global-ats',
                                    agensiOutboundAutopilotSkill:
                                        'https://www.agensi.io/skills/b2b-signal-to-cold-email-autopilot-pro-clay-n8n',
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
            const args = params.arguments || {};
            const inputTarget = String(args.url || args.target || '');
            const inputPlatform = args.url ? 'auto' : args.platform || 'auto';
            const data = await scanSingleTarget(inputPlatform, inputTarget, args.maxJobs);
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
    if (process.argv.includes('--cli')) {
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
            if (!t.startsWith('{')) continue;
            const res = await handleRpc(JSON.parse(t));
            if (res) process.stdout.write(JSON.stringify(res) + '\n');
        }
    }
}
