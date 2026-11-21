import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectAtsTarget } from '../bin/b2b-hiring-intent-mcp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bin = path.resolve(__dirname, '..', 'bin', 'b2b-hiring-intent-mcp.mjs');

console.log('[1/4] Testing 9-ATS URL auto-detection...');
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

console.log('[2/4] Testing Open-Core MCP stdio server (v1.3.0, 5 tools)...');
const proc = spawn(process.execPath, [bin], { stdio: ['pipe', 'pipe', 'inherit'] });
const replies = new Map();
let buf = '';
proc.stdout.on('data', (c) => {
    buf += c.toString('utf8');
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (line) {
            const msg = JSON.parse(line);
            if (msg.id !== undefined) replies.set(msg.id, msg);
        }
    }
});

const waitId = async (id) => {
    const start = Date.now();
    while (!replies.has(id)) {
        if (Date.now() - start > 20000) throw new Error(`Timeout on id=${id}`);
        await new Promise((r) => setTimeout(r, 40));
    }
    return replies.get(id);
};

proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
const r1 = await waitId(1);
assert.equal(r1.result.serverInfo.name, 'b2b-hiring-intent-mcp');
assert.equal(r1.result.serverInfo.version, '1.3.0');

proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'tools/list', params: {} }) + '\n');
const rTools = await waitId(10);
assert.equal(rTools.result.tools.length, 5);

proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_cloud_b2b_lead_apis', arguments: {} } }) + '\n');
const r2 = await waitId(2);
const catalog = JSON.parse(r2.result.content[0].text);
assert.equal(Object.keys(catalog.actors).length, 16);
assert.equal(Object.keys(catalog.endpoints).length, 16);
assert.equal(catalog.actors.multi_ats, 'yan0lovesha~multi-ats-jobs-hiring-intent');
assert.equal(catalog.actors.us_contractor_licenses, 'yan0lovesha~us-contractor-licenses-leads');
assert.equal(catalog.actors.greenhouse, 'yan0lovesha~greenhouse-jobs-hiring-intent');
assert.equal(catalog.actors.lever, 'yan0lovesha~lever-jobs-hiring-intent');
assert.ok(catalog.agensiFreeHiringRadarSkill.includes('agensi.io/skills/'));
assert.ok(catalog.agensiOutboundAutopilotSkill.includes('agensi.io/skills/'));

proc.stdin.write(
    JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
            name: 'detect_company_ats_board',
            arguments: { input: 'https://boards.greenhouse.io/figma', probeLive: false },
        },
    }) + '\n',
);
const r3 = await waitId(3);
const detectedBoard = JSON.parse(r3.result.content[0].text);
assert.equal(detectedBoard.detected, true);
assert.equal(detectedBoard.boards[0].platform, 'greenhouse');

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
                valueProposition: 'cut dbt + Snowflake warehouse spend by 32%',
            },
        },
    }) + '\n',
);
const r4 = await waitId(4);
const seq = JSON.parse(r4.result.content[0].text);
assert.equal(seq.touches.length, 3);
assert.ok(seq.touches.every((t) => t.wordCount <= 80));

proc.stdin.write(
    JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
            name: 'compare_companies_hiring_intent',
            arguments: { targets: ['https://boards.greenhouse.io/figma', 'https://jobs.ashbyhq.com/ramp'], maxJobsPerCompany: 2 },
        },
    }) + '\n',
);
const r5 = await waitId(5);
const cmp = JSON.parse(r5.result.content[0].text);
assert.equal(cmp.comparedCount, 2);
assert.equal(cmp.rankedDossiers.length, 2);
proc.stdin.end();

console.log('[3/4] Testing --help, --version & CLI --url auto-detection on Greenhouse (figma) & Lever (zoox)...');
const helpOut = execFileSync(process.execPath, [bin, '--help'], { encoding: 'utf8' });
assert.ok(helpOut.includes('npx -y github:yan0lovesha/hiring-intent-mcp') && helpOut.includes('mcp.apify.com'));
const verOut = execFileSync(process.execPath, [bin, '--version'], { encoding: 'utf8' }).trim();
assert.equal(verOut, '1.3.0');
const ghOut = JSON.parse(execFileSync(process.execPath, [bin, '--cli', '--url', 'https://boards.greenhouse.io/figma', '--max', '2'], { encoding: 'utf8' }));
assert.ok(ghOut.length > 0 && ghOut[0].atsPlatform === 'greenhouse');
console.log(`  -> Live Greenhouse URL scan OK: ${ghOut[0].companyName} | ${ghOut[0].title} | Comp=${ghOut[0].intent.disclosedSalary}`);

const lvOut = JSON.parse(execFileSync(process.execPath, [bin, '--cli', '--url', 'https://jobs.lever.co/zoox', '--max', '2'], { encoding: 'utf8' }));
assert.ok(lvOut.length > 0 && lvOut[0].atsPlatform === 'lever');
console.log(`  -> Live Lever URL scan OK: ${lvOut[0].companyName} | ${lvOut[0].title} | Comp=${lvOut[0].intent.disclosedSalary}`);

console.log('[4/4] Testing Open-Core CLI live Ashby scan (ramp)...');
const out = JSON.parse(execFileSync(process.execPath, [bin, '--cli', '--platform', 'ashby', '--target', 'ramp', '--max', '2'], { encoding: 'utf8' }));
assert.ok(out.length > 0);
console.log(`  -> Live Ashby scan OK: ${out[0].companyName} | ${out[0].title} | Comp=${out[0].intent.disclosedSalary}`);
console.log('OPEN-CORE REPO v1.3.0 SMOKE TESTS PASSED!');
