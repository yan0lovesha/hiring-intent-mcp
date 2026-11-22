import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    TECH_RULES,
    detectAtsTarget,
    enrichIntent,
    generateSignalOutreachSequence,
    isEmployerSelfBrand,
    resolveWorkdayBoardTarget,
} from '../bin/b2b-hiring-intent-mcp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bin = path.resolve(__dirname, '..', 'bin', 'b2b-hiring-intent-mcp.mjs');

console.log('[1/6] Testing 10-ATS URL & Workday Fortune 500 auto-detection...');
assert.deepEqual(detectAtsTarget('https://boards.greenhouse.io/figma'), { platform: 'greenhouse', target: 'figma' });
assert.deepEqual(detectAtsTarget('https://job-boards.greenhouse.io/stripe/jobs/123'), { platform: 'greenhouse', target: 'stripe' });
assert.deepEqual(detectAtsTarget('https://jobs.lever.co/zoox'), { platform: 'lever', target: 'zoox' });
assert.deepEqual(detectAtsTarget('https://jobs.eu.lever.co/personio'), { platform: 'lever', target: 'personio', region: 'eu' });
assert.deepEqual(detectAtsTarget('https://jobs.ashbyhq.com/ramp'), { platform: 'ashby', target: 'ramp' });
assert.deepEqual(detectAtsTarget('https://adsquare.jobs.personio.de'), { platform: 'personio', target: 'adsquare' });
assert.deepEqual(detectAtsTarget('https://puzzel.teamtailor.com/jobs'), { platform: 'teamtailor', target: 'https://puzzel.teamtailor.com' });
assert.deepEqual(detectAtsTarget('https://careers.smartrecruiters.com/Canva'), { platform: 'smartrecruiters', target: 'Canva' });
assert.deepEqual(detectAtsTarget('https://apply.workable.com/viva/'), { platform: 'workable', target: 'viva' });
assert.deepEqual(detectAtsTarget('https://channable.recruitee.com/'), { platform: 'recruitee', target: 'channable' });
assert.deepEqual(detectAtsTarget('https://smartthings.pinpointhq.com/postings.json'), { platform: 'pinpoint', target: 'smartthings' });
assert.deepEqual(
    detectAtsTarget('https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site/job/California/Staff-Engineer_JR1'),
    { platform: 'workday', target: 'salesforce' },
);
assert.deepEqual(detectAtsTarget('https://bannerhealth.wd108.myworkdayjobs.com/en-GB/Careers/'), {
    platform: 'workday',
    target: 'https://bannerhealth.wd108.myworkdayjobs.com/Careers',
});
assert.deepEqual(detectAtsTarget('workday:nvidia'), { platform: 'workday', target: 'nvidia' });
assert.equal(resolveWorkdayBoardTarget('nvidia')?.cxsJobsUrl, 'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs');

console.log('[2/6] Testing 125+ TECH_RULES, full-JD post-900-char enrichment, self-brand exclusion, DM seniority & boilerplate stripping...');
assert.ok(TECH_RULES.length >= 125, `Expected >= 125 TECH_RULES, got ${TECH_RULES.length}`);

// Verify promised tools + post-900-char JD enrichment
const longIntro = 'About the role: '.repeat(80); // > 1,200 chars before requirements
const tailRequirements = `
Requirements (past char 900):
- Production experience with Snowflake, dbt, Kubernetes, Cloudflare, ServiceNow, Vanta, Wiz.io, and FedRAMP compliance.
- Familiarity with Outreach.io and Clay.com RevOps workflows alongside Datadog observability.
- Green-field cloud migration (0 to 1) for a newly created role.
- Base salary range: $190,000 - $245,000 USD per year.
Equal Opportunity Employer: Datadog is an equal opportunity employer without regard to race, color, regulatory compliance, or whistleblowing.
`;
const datadogJob = {
    atsPlatform: 'greenhouse',
    companySlug: 'datadog',
    companyName: 'Datadog',
    title: 'Staff Security & Data Engineer',
    department: 'Engineering',
    location: 'New York, NY',
    descriptionText: `${longIntro}\n${tailRequirements}`,
};
const ddIntent = enrichIntent(datadogJob);
assert.ok(!ddIntent.techStackAll.includes('Datadog'), 'Employer self-brand Datadog must be excluded');
assert.ok(!ddIntent.techStackAll.includes('Greenhouse'), 'Host ATS Greenhouse must be excluded');
for (const expectedTool of ['Snowflake', 'dbt', 'Kubernetes', 'Cloudflare', 'ServiceNow', 'Vanta', 'Wiz', 'FedRAMP', 'Outreach', 'Clay']) {
    assert.ok(ddIntent.techStackAll.includes(expectedTool), `Expected "${expectedTool}" to be detected past char 900`);
}
assert.equal(ddIntent.isDecisionMakerHire, false, 'IC Staff Engineer must NOT be flagged as decision-maker hire');
assert.ok(!ddIntent.signalCodes.includes('NEW_LEADERSHIP_DECISION_MAKER'), 'IC Principal/Staff/Lead must not trigger NEW_LEADERSHIP_DECISION_MAKER');
assert.ok(ddIntent.disclosedSalary?.includes('190,000'), 'Inline salary past char 900 must be extracted');

// Verify C-level/VP/Director/Head ARE flagged as decision-makers & self-brand exclusion across Figma, Stripe, Snowflake
const vpJob = enrichIntent({
    atsPlatform: 'greenhouse',
    companySlug: 'figma',
    companyName: 'Figma',
    title: 'VP of Infrastructure Engineering',
    department: 'Engineering',
    location: 'San Francisco, CA',
    descriptionText: 'Figma uses Figma, AWS, Kubernetes, and Stripe to scale design collaboration.',
});
assert.equal(vpJob.isDecisionMakerHire, true);
assert.ok(vpJob.signalCodes.includes('NEW_LEADERSHIP_DECISION_MAKER'));
assert.ok(!vpJob.techStackAll.includes('Figma'), 'Figma self-brand excluded on Figma job');
assert.ok(vpJob.techStackAll.includes('AWS') && vpJob.techStackAll.includes('Stripe'));
assert.ok(vpJob.outreachHook.includes('hiring a VP of Infrastructure Engineering'));

const aiExecJob = enrichIntent({
    atsPlatform: 'ashby',
    companySlug: 'snowflake',
    companyName: 'Snowflake',
    title: 'AI Platform Director',
    department: 'AI',
    location: 'Menlo Park, CA',
    descriptionText: 'Snowflake builds on Snowflake, PyTorch, and AWS.',
});
assert.equal(aiExecJob.isDecisionMakerHire, true);
assert.ok(!aiExecJob.techStackAll.includes('Snowflake'), 'Snowflake self-brand excluded on Snowflake job');
assert.ok(aiExecJob.outreachHook.includes('hiring an AI Platform Director'), 'Expected "an AI Platform Director" grammar');
assert.equal(isEmployerSelfBrand('Stripe', 'Stripe', 'stripe', 'greenhouse'), true);

// Verify empty companyName validation & double-clause grammar fix
const invalidSeq = generateSignalOutreachSequence({});
assert.equal(invalidSeq.isError, true);
assert.ok(!JSON.stringify(invalidSeq).includes('Acme Corp'));

const cleanClauseSeq = generateSignalOutreachSequence({
    companyName: 'Ramp',
    roleTitle: 'AI Infrastructure Lead',
    techStack: ['Snowflake', 'dbt', 'Ramp'],
    valueProposition: 'We cut Snowflake compute spend by 32%.',
});
assert.equal(cleanClauseSeq.isError, undefined);
assert.ok(
    !cleanClauseSeq.touches[0].body.includes('We help engineering orgs We '),
    `Unexpected double-clause in touch1: ${cleanClauseSeq.touches[0].body}`,
);
assert.ok(cleanClauseSeq.touches[0].body.includes('opened an AI Infrastructure Lead role'));

console.log('[3/6] Testing Open-Core MCP stdio server (v1.6.2, 5 annotated tools, 18 Cloud PPE APIs, malformed JSON resilience)...');
const proc = spawn(process.execPath, [bin], { stdio: ['pipe', 'pipe', 'inherit'] });
const replies = new Map();
const parseErrors = [];
let buf = '';
proc.stdout.on('data', (c) => {
    buf += c.toString('utf8');
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (line) {
            const msg = JSON.parse(line);
            if (msg.error?.code === -32700) {
                parseErrors.push(msg);
            } else if (msg.id !== undefined && msg.id !== null) {
                replies.set(msg.id, msg);
            }
        }
    }
});

const waitId = async (id) => {
    const start = Date.now();
    while (!replies.has(id)) {
        if (Date.now() - start > 25000) throw new Error(`Timeout on id=${id}`);
        await new Promise((r) => setTimeout(r, 40));
    }
    return replies.get(id);
};

// Inject malformed JSON lines BEFORE and DURING valid RPC traffic to verify zero crash
proc.stdin.write('{malformed_json_line_without_closing_brace\n');
proc.stdin.write('completely_non_json_garbage_line\n');

proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
const r1 = await waitId(1);
assert.equal(r1.result.serverInfo.name, 'b2b-hiring-intent-mcp');
assert.equal(r1.result.serverInfo.version, '1.6.2');
assert.equal(parseErrors.length, 2, 'Expected 2 JSON-RPC -32700 Parse error responses without crashing');
assert.equal(parseErrors[0].error.code, -32700);

proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'tools/list', params: {} }) + '\n');
const rTools = await waitId(10);
assert.equal(rTools.result.tools.length, 5);
for (const tool of rTools.result.tools) {
    assert.deepEqual(
        tool.annotations,
        { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
        `Tool ${tool.name} missing required read-only MCP annotations`,
    );
}

proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_cloud_b2b_lead_apis', arguments: {} } }) + '\n');
const r2 = await waitId(2);
const catalog = JSON.parse(r2.result.content[0].text);
assert.equal(Object.keys(catalog.actors).length, 18);
assert.equal(Object.keys(catalog.endpoints).length, 18);
assert.equal(catalog.actors.us_permits, undefined, 'Privatized us-building-solar-permits-leads must be removed');
assert.equal(catalog.actors.us_contractor_licenses, undefined, 'Privatized us-contractor-licenses-leads must be removed');
assert.equal(catalog.actors.multi_ats, 'yan0lovesha~multi-ats-jobs-hiring-intent');
assert.equal(catalog.actors.workday, 'yan0lovesha~workday-jobs-scraper');
assert.equal(catalog.actors.google_ads_transparency, 'yan0lovesha~google-ads-transparency-scraper');
assert.equal(catalog.actors.linkedin_ad_library, undefined, 'Privatized linkedin-ad-library-scraper must be removed');
assert.equal(catalog.actors.website_contact_finder, 'yan0lovesha~website-contact-email-finder');
assert.equal(catalog.actors.apple_app_store, 'yan0lovesha~apple-app-store-scraper');
assert.equal(catalog.actors.greenhouse, 'yan0lovesha~greenhouse-jobs-hiring-intent');
assert.equal(catalog.actors.lever, 'yan0lovesha~lever-jobs-hiring-intent');
assert.ok(catalog.agensiFreeHiringRadarSkill.includes('agensi.io/skills/'));
assert.ok(catalog.agensiOutboundAutopilotSkill.includes('agensi.io/skills/'));

proc.stdin.write(
    JSON.stringify({
        jsonrpc: '2.0',
        id: 21,
        method: 'tools/call',
        params: { name: 'list_cloud_b2b_lead_apis', arguments: { category: 'ad_spy_contact_enrichment' } },
    }) + '\n',
);
const r21 = await waitId(21);
const enrichCatalog = JSON.parse(r21.result.content[0].text);
assert.deepEqual(Object.keys(enrichCatalog.endpoints).sort(), [
    'apple_app_store',
    'google_ads_transparency',
    'website_contact_finder',
]);

proc.stdin.write(
    JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
            name: 'detect_company_ats_board',
            arguments: { input: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', probeLive: false },
        },
    }) + '\n',
);
const r3 = await waitId(3);
const detectedBoard = JSON.parse(r3.result.content[0].text);
assert.equal(detectedBoard.detected, true);
assert.equal(detectedBoard.boards[0].platform, 'workday');
assert.equal(detectedBoard.boards[0].target, 'nvidia');

// Empty arguments {} on generate_signal_outreach_sequence must return MCP isError: true
proc.stdin.write(
    JSON.stringify({
        jsonrpc: '2.0',
        id: 40,
        method: 'tools/call',
        params: { name: 'generate_signal_outreach_sequence', arguments: {} },
    }) + '\n',
);
const r40 = await waitId(40);
assert.equal(r40.result.isError, true, 'Empty generate_signal_outreach_sequence({}) must return isError: true');
assert.ok(!r40.result.content[0].text.includes('Acme Corp'));

proc.stdin.write(
    JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
            name: 'generate_signal_outreach_sequence',
            arguments: {
                companyName: 'Ramp',
                roleTitle: 'Staff Data Platform Engineer',
                techStack: ['Snowflake', 'dbt', 'Python'],
                buyerPersona: 'vp_engineering',
                valueProposition: 'We cut dbt + Snowflake warehouse spend by 32%',
            },
        },
    }) + '\n',
);
const r4 = await waitId(4);
assert.equal(r4.result.isError, undefined);
const seq = JSON.parse(r4.result.content[0].text);
assert.equal(seq.touches.length, 3);
assert.ok(seq.touches.every((t) => t.wordCount <= 80));
assert.ok(!seq.touches[0].body.includes('We help engineering orgs We '));

proc.stdin.write(
    JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
            name: 'compare_companies_hiring_intent',
            arguments: { targets: ['https://boards.greenhouse.io/figma', 'https://jobs.ashbyhq.com/ramp'], maxJobsPerCompany: 4 },
        },
    }) + '\n',
);
const r5 = await waitId(5);
const cmp = JSON.parse(r5.result.content[0].text);
assert.equal(cmp.comparedCount, 2);
assert.equal(cmp.rankedDossiers.length, 2);
for (const d of cmp.rankedDossiers) {
    if (d.companyName.toLowerCase().includes('figma')) {
        assert.ok(!d.aggregatedTechStack.includes('Figma'), 'Live Figma scan must exclude self-brand Figma');
    }
    assert.ok(d.aggregatedTechStack.length > 0, `Expected non-empty aggregatedTechStack on full-JD live scan for ${d.companyName}`);
}
proc.stdin.end();

console.log('[4/6] Testing --help, --version & CLI --url full-JD enrichment on Greenhouse (figma) & Lever (zoox)...');
const helpOut = execFileSync(process.execPath, [bin, '--help'], { encoding: 'utf8' });
assert.ok(helpOut.includes('npx -y github:yan0lovesha/hiring-intent-mcp') && helpOut.includes('18 PPE APIs') && helpOut.includes('workday'));
const verOut = execFileSync(process.execPath, [bin, '--version'], { encoding: 'utf8' }).trim();
assert.equal(verOut, '1.6.2');
const ghOut = JSON.parse(execFileSync(process.execPath, [bin, '--cli', '--url', 'https://boards.greenhouse.io/figma', '--max', '5'], { encoding: 'utf8' }));
assert.ok(ghOut.length > 0 && ghOut[0].atsPlatform === 'greenhouse');
assert.ok(ghOut.some((j) => j.intent.techStackAll.length > 0), 'Expected non-empty techStack on full-JD Figma Greenhouse scan');
assert.ok(ghOut.every((j) => !j.intent.techStackAll.includes('Figma')), 'Zero Figma self-brand pollution allowed');
assert.ok(ghOut.every((j) => j.descriptionText.length <= 900), 'Final output descriptionText must remain capped at 900 chars');
console.log(
    `  -> Live Greenhouse URL scan OK: ${ghOut[0].companyName} | ${ghOut[0].title} | Stack=${ghOut.flatMap((j) => j.intent.techStackAll).slice(0, 5).join(', ')} | Comp=${ghOut[0].intent.disclosedSalary}`,
);

const lvOut = JSON.parse(execFileSync(process.execPath, [bin, '--cli', '--url', 'https://jobs.lever.co/zoox', '--max', '4'], { encoding: 'utf8' }));
assert.ok(lvOut.length > 0 && lvOut[0].atsPlatform === 'lever');
assert.ok(lvOut.some((j) => j.intent.techStackAll.length > 0), 'Expected non-empty techStack on full-JD Zoox Lever scan');
console.log(`  -> Live Lever URL scan OK: ${lvOut[0].companyName} | ${lvOut[0].title} | Comp=${lvOut[0].intent.disclosedSalary}`);

console.log('[5/6] Testing Open-Core CLI live Workday scan (salesforce / nvidia fallback)...');
let wdOut = JSON.parse(
    execFileSync(process.execPath, [bin, '--cli', '--url', 'https://salesforce.wd12.myworkdayjobs.com/External_Career_Site', '--max', '4'], {
        encoding: 'utf8',
    }),
);
if (!wdOut.length) {
    wdOut = JSON.parse(
        execFileSync(process.execPath, [bin, '--cli', '--url', 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', '--max', '4'], {
            encoding: 'utf8',
        }),
    );
}
assert.ok(wdOut.length > 0 && wdOut[0].atsPlatform === 'workday');
assert.ok(wdOut.every((j) => !j.intent.techStackAll.includes('Salesforce')), 'Salesforce self-brand must be excluded');
console.log(`  -> Live Workday CXS scan OK: ${wdOut[0].companyName} | ${wdOut[0].title} | Comp=${wdOut[0].intent.disclosedSalary}`);

console.log('[6/6] Testing Open-Core CLI live Ashby scan (ramp)...');
const out = JSON.parse(execFileSync(process.execPath, [bin, '--cli', '--platform', 'ashby', '--target', 'ramp', '--max', '4'], { encoding: 'utf8' }));
assert.ok(out.length > 0);
assert.ok(out.some((j) => j.intent.techStackAll.length > 0), 'Expected non-empty techStack on full-JD Ramp Ashby scan');
console.log(`  -> Live Ashby scan OK: ${out[0].companyName} | ${out[0].title} | Comp=${out[0].intent.disclosedSalary}`);
console.log('OPEN-CORE REPO v1.6.2 SMOKE TESTS PASSED!');
