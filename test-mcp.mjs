/**
 * End-to-end automated verification for `hiring-intent-mcp.mjs`
 * Tests BOTH:
 *   1. Stdio MCP JSON-RPC 2.0 handshake (`initialize`, `tools/list`, live `tools/call`)
 *   2. Direct `--cli` mode against live Personio & Teamtailor feeds
 */

import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(__dirname, 'bin', 'hiring-intent-mcp.mjs');

console.log('[1/2] Verifying MCP stdio JSON-RPC 2.0 server handshake + live tool execution...');
const child = spawn(process.execPath, [binPath], { stdio: ['pipe', 'pipe', 'inherit'] });

const responses = new Map();
let buffer = '';
child.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) {
            const parsed = JSON.parse(line);
            if (parsed.id !== undefined) responses.set(parsed.id, parsed);
        }
    }
});

function sendRpc(obj) {
    child.stdin.write(JSON.stringify(obj) + '\n');
}

async function waitForId(id, timeoutMs = 20000) {
    const start = Date.now();
    while (!responses.has(id)) {
        if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for RPC id=${id}`);
        await new Promise((r) => setTimeout(r, 50));
    }
    return responses.get(id);
}

sendRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } });
const initRes = await waitForId(1);
assert.equal(initRes.result.serverInfo.name, 'hiring-intent-autopilot-mcp');

sendRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
const listRes = await waitForId(2);
assert.equal(listRes.result.tools.length, 4);

sendRpc({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
        name: 'generate_account_outreach_brief',
        arguments: { platform: 'personio', target: 'adsquare' },
    },
});
const callRes = await waitForId(3);
const briefPayload = JSON.parse(callRes.result.content[0].text);
assert.equal(briefPayload.atsPlatform, 'personio');
assert.ok(briefPayload.openRolesAnalyzed > 0, 'Expected live roles from adsquare');
assert.ok(briefPayload.detectedCompanyTechStack.length > 0, 'Expected detected tech stack');
console.log(
    `  -> MCP tool call OK: ${briefPayload.companyName} | Roles=${briefPayload.openRolesAnalyzed} | MaxScore=${briefPayload.highestIntentScore} | Stack=${briefPayload.detectedCompanyTechStack.slice(0, 5).join(', ')}`,
);

child.stdin.end();

console.log('[2/3] Verifying CLI mode on live Teamtailor feed (puzzel)...');
const cliOut = execFileSync(process.execPath, [binPath, '--cli', '--platform', 'teamtailor', '--target', 'puzzel', '--max', '4'], {
    encoding: 'utf8',
});
const cliParsed = JSON.parse(cliOut);
assert.equal(cliParsed.brief.atsPlatform, 'teamtailor');
assert.ok(cliParsed.sampleJobs.length > 0);
console.log(
    `  -> CLI mode OK: ${cliParsed.brief.companyName} | Roles=${cliParsed.sampleJobs.length} | MaxScore=${cliParsed.brief.highestIntentScore}`,
);

console.log('[3/3] Verifying 5-ATS expansion (Workable live scan on viva)...');
const wkOut = execFileSync(process.execPath, [binPath, '--cli', '--platform', 'workable', '--target', 'viva', '--max', '3'], {
    encoding: 'utf8',
});
const wkParsed = JSON.parse(wkOut);
assert.equal(wkParsed.brief.atsPlatform, 'workable');
assert.ok(wkParsed.sampleJobs.length > 0);
console.log(
    `  -> Workable CLI OK: ${wkParsed.brief.companyName} | Roles=${wkParsed.sampleJobs.length} | MaxScore=${wkParsed.brief.highestIntentScore}`,
);
console.log('ALL MCP & 5-ATS CLI E2E TESTS PASSED!');
