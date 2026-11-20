#!/usr/bin/env node
/**
 * b2b-hiring-intent-mcp v1.3.0 — Open-Core Zero-Dependency 9-ATS MCP Server & CLI
 *
 * Inspect, fingerprint, compare, and activate B2B hiring-intent signals across 9 ATS platforms
 * (Greenhouse, Lever, Ashby, Personio, Teamtailor, SmartRecruiters, Workable, Recruitee, Pinpoint)
 * locally over stdio MCP (`Claude Desktop`, `Cursor`, `VS Code Copilot`), or scale to 100–10,000+ targets
 * on schedule via our 16 hosted Cloud Pay-Per-Event APIs:
 *   https://apify.com/yan0lovesha
 */

import fs from 'node:fs';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const SERVER_INFO = {
    name: 'b2b-hiring-intent-mcp',
    version: '1.3.0',
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

const CLOUD_CATALOG_CATEGORIES = {
    ats_hiring_intent: [
        'multi_ats',
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
    us_permits_contractors: ['us_permits', 'us_contractor_licenses'],
    us_fleet_govcon: ['us_fmcsa_trucking', 'us_federal_contracts'],
    us_healthcare_fda: ['us_npi_clinics', 'fda_510k'],
};

export async function detectCompanyAtsBoard(rawInput = '', probeLive = true) {
    const cleaned = String(rawInput || '').trim();
    if (!cleaned) return { input: rawInput, detected: false, boards: [] };

    const direct = detectAtsTarget(cleaned);
    if (direct) {
        const sample = probeLive ? await scanSingleTarget(direct.platform, direct.target, 3) : [];
        return {
            input: cleaned,
            detected: true,
            mode: 'url_pattern',
            boards: [
                {
                    platform: direct.platform,
                    target: direct.target,
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

    const candidates = ['greenhouse', 'lever', 'ashby', 'workable', 'recruitee', 'pinpoint', 'personio', 'teamtailor', 'smartrecruiters'];
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

export function generateSignalOutreachSequence({
    companyName = 'Acme Corp',
    roleTitle = 'Senior Platform Engineer',
    techStack = [],
    disclosedSalary = '',
    buyerPersona = 'vp_engineering',
    valueProposition = 'cut onboarding & tooling ramp time by 40%',
} = {}) {
    const cleanCompany = String(companyName || 'your team').trim();
    const cleanRole = String(roleTitle || 'new engineering role').trim();
    const stackList = (Array.isArray(techStack) ? techStack : String(techStack || '').split(','))
        .map((s) => String(s || '').trim())
        .filter(Boolean)
        .slice(0, 3);
    const stackPhrase = stackList.length ? stackList.join(' + ') : 'your core stack';
    const cleanValue = String(valueProposition || 'ship faster without adding headcount').trim();
    const salaryNote = disclosedSalary ? ` (especially at the ${disclosedSalary} band)` : '';

    const personaAngles = {
        vp_engineering: {
            subject1: `${cleanCompany}'s ${cleanRole} search`,
            touch1: `Saw ${cleanCompany} opened a ${cleanRole} role working across ${stackPhrase}. While that seat fills, teams usually hit delivery bottlenecks on the exact workflows that hire will own. We help engineering orgs ${cleanValue} before new hires even finish onboarding. Worth a 10-minute sanity check next week?`,
            touch2: `Quick follow-up on the ${cleanRole} req — are you prioritizing ${stackPhrase} throughput this quarter, or keeping capacity flat until the role is filled? Happy to share a 2-minute teardown tailored to ${cleanCompany}.`,
            touch3: `Closing the loop so I don't clutter your inbox. If scaling ${stackPhrase} velocity comes back to the top of ${cleanCompany}'s roadmap, let me know and I'll send over the benchmark notes.`,
        },
        cfo_finance: {
            subject1: ` hiring ROI / ${cleanRole} at ${cleanCompany}`,
            touch1: `Noticed ${cleanCompany} is budgeting for a ${cleanRole}${salaryNote}. Most finance leaders we work with look to automate the manual ${stackPhrase} workload alongside new headcount so OPEX scales sub-linearly. We help teams ${cleanValue}. Open to a brief cost-comparison note?`,
            touch2: `Following up briefly — even trimming 30 days of ramp friction around your ${stackPhrase} workflow typically pays back within a quarter. Happy to send the unit-economics breakdown if helpful.`,
            touch3: `Last note from me. Whenever headcount efficiency around ${cleanCompany}'s ${stackPhrase} stack becomes a focus, feel free to reply here.`,
        },
        revops_gtm: {
            subject1: `${cleanCompany} GTM signal (${cleanRole})`,
            touch1: `Spotted ${cleanCompany} hiring a ${cleanRole} with ${stackPhrase} in the stack. Usually that signals a pipeline or operational push this quarter. We help GTM and RevOps teams ${cleanValue} without rebuilding existing workflows. Open to seeing how similar teams wire this up?`,
            touch2: `Quick bump on ${cleanCompany}'s ${cleanRole} buildout — happy to share the exact workflow template teams use on top of ${stackPhrase} if that saves your team setup hours.`,
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

const TOOLS = [
    {
        name: 'scan_company_hiring_intent',
        description:
            'Scan a single company career board across 9 ATS platforms (greenhouse, lever, ashby, personio, teamtailor, smartrecruiters, workable, recruitee, pinpoint) via career URL (`url`) or (`platform` + `target`) to extract open jobs, tech stack, disclosed salaries, and B2B buying intent scores.',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description:
                        'Full career board URL (auto-detects boards.greenhouse.io/*, job-boards.greenhouse.io/*, jobs.lever.co/*, jobs.ashbyhq.com/*, *.jobs.personio.de/*, *.teamtailor.com/*, careers.smartrecruiters.com/*, apply.workable.com/*, *.recruitee.com/*, *.pinpointhq.com/*).',
                },
                platform: {
                    type: 'string',
                    enum: ['auto', 'greenhouse', 'lever', 'ashby', 'personio', 'teamtailor', 'smartrecruiters', 'workable', 'recruitee', 'pinpoint'],
                    description: 'ATS platform identifier (defaults to auto when url is passed).',
                },
                target: {
                    type: 'string',
                    description: 'Company ATS board slug or career URL (e.g. figma, zoox, ramp, adsquare, puzzel, viva, channable, smartthings, Canva).',
                },
                maxJobs: { type: 'number', default: 5, minimum: 1, maximum: 10, description: 'Maximum open roles to enrich (1-10).' },
            },
        },
    },
    {
        name: 'compare_companies_hiring_intent',
        description:
            'Scan and rank up to 5 company career URLs or slugs in parallel across all 9 ATS platforms, returning prioritized Account Buying Dossiers with maxIntentScore, hotRoleCount, executive hires, aggregated tech stack, and disclosed salary bands.',
        inputSchema: {
            type: 'object',
            required: ['targets'],
            properties: {
                targets: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 5,
                    description: 'List of 1 to 5 career URLs, platform:slug strings (e.g. "greenhouse:figma", "ashby:ramp"), or company slugs.',
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
            'Identify which of the 9 supported ATS platforms powers a career URL, or probe a company slug live across Greenhouse, Lever, Ashby, Workable, Recruitee, Pinpoint, Personio, Teamtailor, and SmartRecruiters to find active job boards and compensation availability.',
        inputSchema: {
            type: 'object',
            required: ['input'],
            properties: {
                input: {
                    type: 'string',
                    description: 'Company career URL (e.g. https://boards.greenhouse.io/figma) or company slug (e.g. ramp, zoox, figma).',
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
            'List our 16 hosted Cloud Pay-Per-Event B2B Lead & Hiring Intent APIs (9-ATS Unified API, dedicated ATS APIs, US Solar/Building Permits, Licensed Contractors, FMCSA Trucking Fleets, Federal Contract Awards, NPI Medical/Dental Clinics, FDA 510k MedTech) with streamable-http MCP URLs and REST invocation endpoints.',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: ['all', 'ats_hiring_intent', 'us_permits_contractors', 'us_fleet_govcon', 'us_healthcare_fda'],
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
        if (params?.name === 'compare_companies_hiring_intent') {
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
