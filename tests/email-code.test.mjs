import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(readFileSync(new URL('../convex/auth.ts',import.meta.url),'utf8'))
 .replace(/import \{ convexAuth \} from "@convex-dev\/auth\/server";/,'const convexAuth=config=>({auth:config});')
 .replace(/import \{ Email \} from "@convex-dev\/auth\/providers\/Email";/,'const Email=config=>config;')
 .replace('"@oslojs/crypto/random"',JSON.stringify(import.meta.resolve('@oslojs/crypto/random')))
 .replace(/import \{ internal \} from "\.\/_generated\/api";/,'const internal={};');
const {auth}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('email sign-in generates six numeric digits while keeping expiry and attempt limits',async()=>{
 const provider=auth.providers[0];assert.equal(provider.maxAge,15*60);assert.equal(auth.signIn.maxFailedAttempsPerHour,5);
 for(let i=0;i<10;i++)assert.match(await provider.generateVerificationToken(),/^\d{6}$/);
});
