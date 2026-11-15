#!/usr/bin/env node
/**
 * European B2B Hiring Intent Autopilot — Zero-Dependency MCP Server & CLI
 *
 * Modes:
 *   1. MCP Server (default stdio JSON-RPC 2.0 — compatible with Claude Desktop, Cursor, VS Code Copilot):
 *      `node bin/hiring-intent-mcp.mjs`
 *   2. Interactive CLI Mode:
 *      `node bin/hiring-intent-mcp.mjs --cli --platform personio --target adsquare --max 5`
 *      `node bin/hiring-intent-mcp.mjs --cli --platform teamtailor --target puzzel --max 5`
 *
 * Execution Backend:
 *   - If `APIFY_TOKEN` and `APIFY_ACTOR_OWNER` env vars are set, routes batch queries to Apify Cloud PPE Actors.
 *   - Otherwise executes ultra-fast zero-browser HTTP scraping + B2B Tech-Stack & Buying Signal extraction locally!
 */

import readline from 'node:readline';

const SERVER_INFO = {
    name: 'hiring-intent-autopilot-mcp',
    version: '1.0.0',
};

const TECH_PATTERNS = [
    ['Salesforce', 'crm_sales', /\bsalesforce\b|\bsfdc\b/i],
    ['HubSpot', 'crm_sales', /\bhubspot\b/i],
    ['Gong', 'crm_sales', /\bgong\.io\b|\bgong\s+(?:revenue|intelligence)/i],
    ['Salesloft', 'crm_sales', /\bsalesloft\b/i],
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
    ['Apache Spark', 'data_analytics', /\bapache\s+spark\b|\bpyspark\b/i],
    ['PostgreSQL', 'data_analytics', /\bpostgresql\b|\bpostgres\b/i],
    ['MongoDB', 'data_analytics', /\bmongodb\b/i],
    ['Elasticsearch', 'data_analytics', /\belasticsearch\b/i],
    ['OpenAI / GPT', 'ai_llm', /\bopenai\b|\bgpt-4[o]?\b|\bgpt-5\b/i],
    ['Anthropic / Claude', 'ai_llm', /\banthropic\b|\bclaude\s+(?:3|4|sonnet|opus)/i],
    ['LangChain / LangGraph', 'ai_llm', /\blangchain\b|\blanggraph\b/i],
    ['RAG / Agentic AI', 'ai_llm', /\bretrieval[- ]augmented\b|\bllm\s+agents?\b|\bagentic\s+ai\b/i],
    ['TypeScript', 'devtools_engineering', /\btypescript\b/i],
    ['Python', 'devtools_engineering', /\bpython\b/i],
    ['Go (Golang)', 'devtools_engineering', /\bgolang\b/i],
    ['Rust', 'devtools_engineering', /\brust\b(?!\s*(?:free|proof))/i],
    ['C# / .NET', 'devtools_engineering', /(?:^|[\s,/(])c#(?=$|[\s,/.)])|(?:^|[\s,/(])\.net(?:\s*(?:core|framework|8|9))?\b|\basp\.net\b/i],
    ['PHP / Symfony', 'devtools_engineering', /\bphp\b|\bsymfony\b|\blaravel\b/i],
    ['React', 'devtools_engineering', /\breact(?:\.js|js)?\b/i],
    ['Node.js', 'devtools_engineering', /\bnode\.?js\b/i],
    ['GraphQL', 'devtools_engineering', /\bgraphql\b/i],
    ['RabbitMQ', 'devtools_engineering', /\brabbitmq\b/i],
    ['SAP', 'erp_finance', /\bsap\b/i],
    ['NetSuite', 'erp_finance', /\bnetsuite\b/i],
    ['DATEV', 'erp_finance', /\bdatev\b/i],
    ['Stripe', 'erp_finance', /\bstripe\b/i],
    ['Okta / Auth0', 'security_compliance', /\bokta\b|\bauth0\b/i],
    ['ISO 27001', 'security_compliance', /\biso\s*[/-]?\s*27001\b/i],
    ['SOC 2', 'security_compliance', /\bsoc\s*2\b/i],
    ['NIS2 / DORA / CSRD', 'security_compliance', /\bnis\s*2\b|\bdora\s+compliance\b|\bcsrd\b/i],
    ['Zendesk / Intercom', 'marketing_product', /\bzendesk\b|\bintercom\b/i],
];

const SIGNAL_PATTERNS = [
    ['BUDGET_EXPANSION', 22, /\b(?:rapidly\s+growing|scaling\s+rapidly|hyper[- ]?growth|newly\s+created\s+role|expanding\s+(?:our|the)\s+team|growing\s+fast|series\s+[a-d])\b/i],
    ['TECH_MIGRATION_MODERNIZATION', 26, /\b(?:greenfield|from\s+scratch|0\s+to\s+1|cloud\s+migration|migrating|moderniz(?:e|ing)|re-?platform|shared\s+data\s+platform)\b/i],
    ['COMPLIANCE_SECURITY_MANDATE', 20, /\b(?:iso\s*[/-]?\s*27001|soc\s*2|nis\s*2|dora\s+compliance|csrd|regulatory\s+compliance)\b/i],
    ['AI_TRANSFORMATION_INITIATIVE', 22, /\b(?:ai[- ]native|genai|generative\s+ai|conversational\s+intelligence|mlops|llm\s+agent)\b/i],
    ['URGENT_HIRING_VELOCITY', 14, /\b(?:asap|immediate\s+start|ab\s+sofort)\b/i],
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
    const corpus = `${job.title}\n${job.department}\n${job.keywords || ''}\n${job.descriptionText}`;
    const techStackAll = [];
    const techStackByCategory = {};
    for (const [name, cat, re] of TECH_PATTERNS) {
        if (re.test(corpus)) {
            techStackAll.push(name);
            techStackByCategory[cat] = techStackByCategory[cat] || [];
            techStackByCategory[cat].push(name);
        }
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

    let salary = structuredSalary;
    if (!salary) {
        const sm = job.descriptionText.match(/([€£$])\s*(\d{2,3}[.,]\d{3})\s*(?:-|–|to)\s*[€£$]?\s*(\d{2,3}[.,]\d{3})/);
        if (sm) salary = `${sm[1]}${sm[2]} - ${sm[1]}${sm[3]}`;
    }
    if (salary) score += 6;

    const intentScore = Math.min(100, score);
    const intentTier = intentScore >= 70 ? 'HOT' : intentScore >= 45 ? 'WARM' : 'MONITOR';
    const topTools = techStackAll.slice(0, 3).join(', ');
    const outreachHook = `Noticed ${job.companyName} is hiring a ${job.title}${job.location ? ` in ${job.location}` : ''}${topTools ? ` working with ${topTools}` : ''}.`;

    return {
        intentScore,
        intentTier,
        techStackAll,
        techStackByCategory,
        signalCodes,
        disclosedSalary: salary,
        outreachHook,
    };
}

async function fetchSafe(url) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; HiringIntentAutopilotMCP/1.0)',
                Accept: 'application/xml, application/rss+xml, application/json, text/html;q=0.9, */*;q=0.8',
            },
            signal: AbortSignal.timeout(15000),
        });
        return { ok: res.ok, status: res.status, text: await res.text() };
    } catch (err) {
        return { ok: false, status: 0, text: '', error: err.message };
    }
}

async function scanPersonio(target, maxJobs = 8) {
    const owner = process.env.APIFY_ACTOR_OWNER || 'yan0lovesha';
    if (process.env.APIFY_TOKEN) {
        const apiUrl = `https://api.apify.com/v2/acts/${owner}~personio-jobs-hiring-intent/run-sync-get-dataset-items`;
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.APIFY_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ companies: [target], maxJobsPerCompany: maxJobs, enableIntentExtraction: true }),
        });
        if (res.ok) return await res.json();
    }

    const baseUrl = /^https?:\/\//i.test(target)
        ? new URL(target).origin
        : `https://${target.replace(/\.jobs\.personio\.(de|com).*$/i, '')}.jobs.personio.de`;
    const slug = new URL(baseUrl).hostname.split('.')[0];

    const [xmlRes, jsonRes] = await Promise.all([
        fetchSafe(`${baseUrl}/xml?language=en`),
        fetchSafe(`${baseUrl}/search.json`),
    ]);

    const jsonEntries = jsonRes.ok && jsonRes.text.trim().startsWith('[') ? JSON.parse(jsonRes.text) : [];
    const jsonMap = new Map(jsonEntries.map((e) => [String(e.id), e]));

    if (xmlRes.ok && /<position>/i.test(xmlRes.text)) {
        const positions = xmlAllBlocks(xmlRes.text, 'position').slice(0, maxJobs);
        return positions.map((pos) => {
            const id = xmlTag(pos, 'id');
            const je = jsonMap.get(id) || {};
            const companyName = xmlTag(pos, 'subcompany') || je.subcompany || slug;
            const title = xmlTag(pos, 'name') || je.name;
            const department = xmlTag(pos, 'department') || je.department || 'General';
            const location = xmlTag(pos, 'office') || je.office || 'Europe';
            const jdHtml = xmlAllBlocks(pos, 'jobDescription').map((b) => xmlTag(b, 'value')).join('\n');
            const descriptionText = htmlToText(jdHtml);

            let structuredSalary = null;
            if (/<salaryInformation>/i.test(pos)) {
                const sb = xmlAllBlocks(pos, 'salaryInformation')[0] || '';
                const min = xmlTag(sb, 'min');
                const max = xmlTag(sb, 'max');
                const cur = xmlTag(sb, 'currencyCode') || 'EUR';
                if (min && max) structuredSalary = `${cur} ${Math.round(Number(min))} - ${Math.round(Number(max))}`;
            }

            const job = {
                atsPlatform: 'personio',
                companySlug: slug,
                companyName,
                jobId: id,
                title,
                department,
                location,
                jobUrl: `${baseUrl}/job/${id}?language=en`,
                keywords: je.keywords || '',
                descriptionText: descriptionText.slice(0, 1200),
            };
            return { ...job, intent: enrichIntent({ ...job, descriptionText }, structuredSalary) };
        });
    }

    // XML-disabled fallback (e.g. HomeToGo): search.json + HTML JSON-LD
    const results = [];
    for (const entry of jsonEntries.slice(0, maxJobs)) {
        const jobUrl = `${baseUrl}/job/${entry.id}?language=en`;
        const page = await fetchSafe(jobUrl);
        let fullText = '';
        let companyName = entry.subcompany || slug;
        const ldMatch = page.text.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
        if (ldMatch) {
            try {
                const ld = JSON.parse(ldMatch[1]);
                fullText = htmlToText(ld.description || '');
                companyName = ld.hiringOrganization?.name || companyName;
            } catch {
                // ignore
            }
        }
        const job = {
            atsPlatform: 'personio',
            companySlug: slug,
            companyName,
            jobId: String(entry.id),
            title: entry.name,
            department: entry.department || 'General',
            location: entry.office || 'Europe',
            jobUrl,
            keywords: entry.keywords || '',
            descriptionText: fullText.slice(0, 1200),
        };
        results.push({ ...job, intent: enrichIntent({ ...job, descriptionText: fullText }) });
    }
    return results;
}

async function scanTeamtailor(target, maxJobs = 8) {
    const owner = process.env.APIFY_ACTOR_OWNER || 'yan0lovesha';
    if (process.env.APIFY_TOKEN) {
        const apiUrl = `https://api.apify.com/v2/acts/${owner}~teamtailor-jobs-hiring-signal/run-sync-get-dataset-items`;
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.APIFY_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sites: [target], maxJobsPerCompany: maxJobs, enableIntentExtraction: true }),
        });
        if (res.ok) return await res.json();
    }

    const baseUrl = /^https?:\/\//i.test(target)
        ? new URL(target).origin
        : `https://${target.replace(/\.teamtailor\.com.*$/i, '')}.teamtailor.com`;
    const slug = new URL(baseUrl).hostname.split('.')[0];

    const rss = await fetchSafe(`${baseUrl}/jobs.rss`);
    if (!rss.ok || !/<rss\b/i.test(rss.text)) return [];

    const header = rss.text.split('<item>')[0] || '';
    const companyName = xmlTag(header, 'title') || slug;
    const items = xmlAllBlocks(rss.text, 'item').slice(0, maxJobs);

    return items.map((item) => {
        const title = xmlTag(item, 'title');
        const jobUrl = xmlTag(item, 'link');
        const department = xmlTag(item, 'tt:department') || 'General';
        const locBlocks = xmlAllBlocks(item, 'tt:location');
        const location = locBlocks.length > 0 ? xmlTag(locBlocks[0], 'tt:name') || xmlTag(locBlocks[0], 'tt:city') : 'Europe';
        const fullText = htmlToText(xmlTag(item, 'description'));
        const idMatch = jobUrl.match(/\/jobs\/(\d+)/);

        const job = {
            atsPlatform: 'teamtailor',
            companySlug: slug,
            companyName,
            jobId: idMatch ? idMatch[1] : jobUrl,
            title,
            department,
            location,
            workplaceType: xmlTag(item, 'remoteStatus') || 'unspecified',
            jobUrl,
            descriptionText: fullText.slice(0, 1200),
        };
        return { ...job, intent: enrichIntent({ ...job, descriptionText: fullText }) };
    });
}

async function scanSmartRecruiters(target, maxJobs = 8) {
    const slug = /^https?:\/\//i.test(target)
        ? new URL(target).pathname.split('/').filter(Boolean).pop()
        : target.trim();
    const listRes = await fetchSafe(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${maxJobs}`);
    if (!listRes.ok) return [];
    const listJson = JSON.parse(listRes.text);
    const items = (listJson.content || []).slice(0, maxJobs);
    return Promise.all(
        items.map(async (entry) => {
            const detRes = await fetchSafe(
                `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings/${encodeURIComponent(entry.id)}`,
            );
            const det = detRes.ok ? JSON.parse(detRes.text) : entry;
            const sections = det.jobAd?.sections || {};
            const fullHtml = Object.values(sections).map((s) => s?.text || '').join('\n');
            const fullText = htmlToText(fullHtml);
            const loc = det.location || {};
            const location = [loc.city, loc.country?.toUpperCase()].filter(Boolean).join(', ') || 'Global';
            const job = {
                atsPlatform: 'smartrecruiters',
                companySlug: slug,
                companyName: det.company?.name || slug,
                jobId: String(det.id),
                title: det.name,
                department: det.department?.label || 'General',
                location,
                workplaceType: loc.remote ? 'remote' : 'onsite',
                jobUrl: det.postingUrl || `https://jobs.smartrecruiters.com/${slug}/${det.id}`,
                descriptionText: fullText.slice(0, 1200),
            };
            return { ...job, intent: enrichIntent({ ...job, descriptionText: fullText }) };
        }),
    );
}

async function scanWorkable(target, maxJobs = 8) {
    const slug = /^https?:\/\//i.test(target)
        ? new URL(target).pathname.split('/').filter(Boolean)[0]
        : target.trim().toLowerCase();
    const res = await fetchSafe(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}?details=true`);
    if (!res.ok) return [];
    const parsed = JSON.parse(res.text);
    return (parsed.jobs || []).slice(0, maxJobs).map((j) => {
        const fullText = htmlToText(`${j.description || ''}\n${j.requirements || ''}`);
        const location = [j.city, j.country].filter(Boolean).join(', ') || 'Global';
        const job = {
            atsPlatform: 'workable',
            companySlug: slug,
            companyName: parsed.name || slug,
            jobId: j.shortcode || j.code,
            title: j.title,
            department: j.department || j.function || 'General',
            location,
            workplaceType: j.telecommuting ? 'remote' : 'onsite',
            jobUrl: j.url || `https://apply.workable.com/${slug}/j/${j.shortcode}/`,
            descriptionText: fullText.slice(0, 1200),
        };
        return { ...job, intent: enrichIntent({ ...job, descriptionText: fullText }) };
    });
}

async function scanRecruitee(target, maxJobs = 8) {
    const baseUrl = /^https?:\/\//i.test(target)
        ? new URL(target).origin
        : `https://${target.replace(/\.recruitee\.com.*$/i, '').toLowerCase()}.recruitee.com`;
    const slug = new URL(baseUrl).hostname.split('.')[0];
    const res = await fetchSafe(`${baseUrl}/api/offers`);
    if (!res.ok) return [];
    const parsed = JSON.parse(res.text);
    return (parsed.offers || []).slice(0, maxJobs).map((o) => {
        const fullText = htmlToText(`${o.description || ''}\n${o.requirements || ''}`);
        const job = {
            atsPlatform: 'recruitee',
            companySlug: slug,
            companyName: o.company_name || slug,
            jobId: String(o.id),
            title: o.title,
            department: o.department || 'General',
            location: o.location || [o.city, o.country].filter(Boolean).join(', ') || 'Europe',
            workplaceType: o.hybrid ? 'hybrid' : o.remote ? 'remote' : 'onsite',
            jobUrl: o.careers_url || `${baseUrl}/o/${o.slug}`,
            descriptionText: fullText.slice(0, 1200),
        };
        return { ...job, intent: enrichIntent({ ...job, descriptionText: fullText }) };
    });
}

async function dispatchPlatformScan(platform, target, maxJobs = 8) {
    const p = String(platform || 'personio').toLowerCase();
    if (p === 'teamtailor') return scanTeamtailor(target, maxJobs);
    if (p === 'smartrecruiters') return scanSmartRecruiters(target, maxJobs);
    if (p === 'workable') return scanWorkable(target, maxJobs);
    if (p === 'recruitee') return scanRecruitee(target, maxJobs);
    return scanPersonio(target, maxJobs);
}

function buildOutreachBrief(jobs) {
    if (!jobs.length) {
        return { found: false, message: 'No active public jobs found for this target.' };
    }
    const sorted = [...jobs].sort((a, b) => (b.intent?.intentScore || 0) - (a.intent?.intentScore || 0));
    const top = sorted[0];
    const allTools = Array.from(new Set(sorted.flatMap((j) => j.intent?.techStackAll || [])));
    const allSignals = Array.from(new Set(sorted.flatMap((j) => j.intent?.signalCodes || [])));

    return {
        companyName: top.companyName,
        atsPlatform: top.atsPlatform,
        openRolesAnalyzed: jobs.length,
        highestIntentScore: top.intent.intentScore,
        highestIntentTier: top.intent.intentTier,
        flagshipRole: {
            title: top.title,
            department: top.department,
            location: top.location,
            jobUrl: top.jobUrl,
            disclosedSalary: top.intent.disclosedSalary,
        },
        detectedCompanyTechStack: allTools,
        activeBuyingSignals: allSignals,
        coldOutreachAngles: {
            founderConcise: `${top.intent.outreachHook} Teams scaling ${allTools.slice(0, 3).join(' + ') || 'engineering'} usually hit bottlenecks right as new hires ramp — open to a 3-sentence note on how peers cut ramp overhead?`,
            technicalValueAdd: `Saw your ${top.title} opening (${allTools.slice(0, 4).join(', ') || top.department}). Are you standardizing that stack internally this quarter or evaluating tooling around it?`,
            triggerSdrSubject: `${top.companyName}'s ${top.title} req`,
        },
    };
}

const MCP_TOOLS = [
    {
        name: 'scan_personio_hiring_intent',
        description:
            'Scan a European/DACH company on Personio (*.jobs.personio.de/.com) to extract open jobs, B2B tech stack, EU disclosed salary bands, and 0-100 buying intent scores.',
        inputSchema: {
            type: 'object',
            properties: {
                target: {
                    type: 'string',
                    description: "Personio subdomain slug (e.g. 'adsquare', 'hometogo', 'eqs-group') or full Personio URL.",
                },
                maxJobs: {
                    type: 'number',
                    description: 'Max open positions to analyze (default 8).',
                    default: 8,
                },
            },
            required: ['target'],
        },
    },
    {
        name: 'scan_teamtailor_hiring_signals',
        description:
            'Scan a UK/Nordic/European company on Teamtailor (*.teamtailor.com or custom career domain) to extract open jobs, B2B tech stack, and buying intent signals.',
        inputSchema: {
            type: 'object',
            properties: {
                target: {
                    type: 'string',
                    description: "Teamtailor subdomain slug (e.g. 'puzzel', 'rebtel', 'nextlane') or full Teamtailor career URL.",
                },
                maxJobs: {
                    type: 'number',
                    description: 'Max open positions to analyze (default 8).',
                    default: 8,
                },
            },
            required: ['target'],
        },
    },
    {
        name: 'scan_ats_hiring_intent',
        description:
            'Universal 5-ATS Hiring Intent Scanner supporting Personio, Teamtailor, SmartRecruiters, Workable, and Recruitee.',
        inputSchema: {
            type: 'object',
            properties: {
                platform: {
                    type: 'string',
                    enum: ['personio', 'teamtailor', 'smartrecruiters', 'workable', 'recruitee'],
                    description: 'Target ATS platform.',
                },
                target: {
                    type: 'string',
                    description: 'Company ATS subdomain slug or career URL.',
                },
                maxJobs: {
                    type: 'number',
                    description: 'Max open positions to analyze (default 8).',
                    default: 8,
                },
            },
            required: ['platform', 'target'],
        },
    },
    {
        name: 'generate_account_outreach_brief',
        description:
            'Generate an executive B2B Account Dossier and 3 ready-to-send Cold Email angles from live Personio, Teamtailor, SmartRecruiters, Workable, or Recruitee hiring signals.',
        inputSchema: {
            type: 'object',
            properties: {
                platform: {
                    type: 'string',
                    enum: ['personio', 'teamtailor', 'smartrecruiters', 'workable', 'recruitee'],
                    description: 'Target ATS platform.',
                },
                target: {
                    type: 'string',
                    description: 'Company ATS slug or career site URL.',
                },
            },
            required: ['platform', 'target'],
        },
    },
];

async function handleJsonRpc(msg) {
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

    if (method === 'notifications/initialized') {
        return null;
    }

    if (method === 'ping') {
        return { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'tools/list') {
        return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
    }

    if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};
        try {
            let payload;
            if (toolName === 'scan_personio_hiring_intent') {
                payload = await scanPersonio(String(args.target), Number(args.maxJobs || 8));
            } else if (toolName === 'scan_teamtailor_hiring_signals') {
                payload = await scanTeamtailor(String(args.target), Number(args.maxJobs || 8));
            } else if (toolName === 'scan_ats_hiring_intent') {
                payload = await dispatchPlatformScan(args.platform, String(args.target), Number(args.maxJobs || 8));
            } else if (toolName === 'generate_account_outreach_brief') {
                const jobs = await dispatchPlatformScan(args.platform, String(args.target), 10);
                payload = buildOutreachBrief(jobs);
            } else {
                return {
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32601, message: `Unknown tool: ${toolName}` },
                };
            }

            return {
                jsonrpc: '2.0',
                id,
                result: {
                    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
                },
            };
        } catch (err) {
            return {
                jsonrpc: '2.0',
                id,
                result: {
                    isError: true,
                    content: [{ type: 'text', text: `Error executing ${toolName}: ${err.message}` }],
                },
            };
        }
    }

    if (id !== undefined) {
        return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
    return null;
}

async function runCli(argv) {
    const getFlag = (name, fallback = '') => {
        const idx = argv.indexOf(`--${name}`);
        return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : fallback;
    };
    const platform = getFlag('platform', 'personio').toLowerCase();
    const target = getFlag('target', platform === 'teamtailor' ? 'puzzel' : 'adsquare');
    const max = Number(getFlag('max', '5'));

    const jobs = await dispatchPlatformScan(platform, target, max);
    const brief = buildOutreachBrief(jobs);
    process.stdout.write(JSON.stringify({ brief, sampleJobs: jobs }, null, 2) + '\n');
}

if (process.argv.includes('--cli')) {
    await runCli(process.argv);
} else {
    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('{')) continue;
        try {
            const req = JSON.parse(trimmed);
            const res = await handleJsonRpc(req);
            if (res) {
                process.stdout.write(JSON.stringify(res) + '\n');
            }
        } catch (err) {
            process.stdout.write(
                JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32700, message: `Parse error: ${err.message}` },
                }) + '\n',
            );
        }
    }
}
