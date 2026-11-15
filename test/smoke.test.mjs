import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bin = path.resolve(__dirname, '..', 'bin', 'b2b-hiring-intent-mcp.mjs');

console.log('[1/2] Testing Open-Core MCP stdio server...');
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
        if (Date.now() - start > 15000) throw new Error(`Timeout on id=${id}`);
        await new Promise((r) => setTimeout(r, 40));
    }
    return replies.get(id);
};

proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
const r1 = await waitId(1);
assert.equal(r1.result.serverInfo.name, 'b2b-hiring-intent-mcp');

proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_cloud_b2b_lead_apis', arguments: {} } }) + '\n');
const r2 = await waitId(2);
const catalog = JSON.parse(r2.result.content[0].text);
assert.equal(Object.keys(catalog.actors).length, 10);
proc.stdin.end();

console.log('[2/2] Testing Open-Core CLI live Ashby scan (ramp)...');
const out = JSON.parse(execFileSync(process.execPath, [bin, '--cli', '--platform', 'ashby', '--target', 'ramp', '--max', '3'], { encoding: 'utf8' }));
assert.ok(out.length > 0);
console.log(`  -> Live Ashby scan OK: ${out[0].companyName} | ${out[0].title} | Comp=${out[0].intent.disclosedSalary}`);
console.log('OPEN-CORE REPO SMOKE TESTS PASSED!');
