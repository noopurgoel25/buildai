import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

// Credentials remain in memory and go directly to Convex; never print or save them.
const cli = fileURLToPath(new URL('../node_modules/convex/bin/main.js', import.meta.url));
const production = process.argv.includes('--prod');
const target = production ? ['--prod'] : [];
function convex(args, input) {
  const result = spawnSync(process.execPath, [cli, ...args, ...target], { encoding: 'utf8', timeout: 60_000, input });
  if (result.status !== 0) throw new Error('Could not reach or configure Convex. No credentials were printed.');
  return result.stdout;
}
try {
  const envText = production ? '' : readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const site = production ? convex(['env', 'get', 'CONVEX_SITE_URL']).trim() : envText.match(/^CONVEX_SITE_URL\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
  if (!site || !/^https:\/\/[a-z0-9-]+\.convex\.site$/.test(site)) throw new Error('The Convex site address is missing from .env.local.');
  const names = new Set(convex(['env', 'list', '--names-only']).split(/\r?\n/).map(line => line.trim()));
  if (names.has('JWT_PRIVATE_KEY') !== names.has('JWKS')) throw new Error('Only one signing key is configured. Check both JWT_PRIVATE_KEY and JWKS before continuing.');
  if (!names.has('JWT_PRIVATE_KEY')) {
    const pair = await generateKeyPair('RS256', { extractable: true });
    const privateKey = (await exportPKCS8(pair.privateKey)).trimEnd().replace(/\n/g, ' ');
    const publicKey = await exportJWK(pair.publicKey);
    convex(['env', 'set', 'JWT_PRIVATE_KEY'], privateKey);
    convex(['env', 'set', 'JWKS'], JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] }));
  }
  convex(['env', 'set', 'SITE_URL'], site);
  console.log(`Convex ${production ? 'production' : 'development'} sign-in keys and site address are configured.`);
  const missing = ['AUTH_RESEND_KEY', 'AUTH_EMAIL_FROM'].filter(name => !names.has(name));
  if (missing.length) console.log(`Email delivery still needs these Convex environment variables: ${missing.join(', ')}. Add them in the Convex dashboard; never paste a key into chat.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
