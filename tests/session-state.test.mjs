import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const script=readFileSync(new URL('../src/session-state.js',import.meta.url),'utf8');
const {sessionStatus}=await import(`data:text/javascript;base64,${Buffer.from(script).toString('base64')}`);
test('credentials awaiting server confirmation are pending, never signed out or granted access',()=>{
  assert.deepEqual(sessionStatus({isLoading:false,isAuthenticated:true},{isLoading:false,isAuthenticated:false}),{isLoading:true,isAuthenticated:false});
  assert.deepEqual(sessionStatus({isLoading:false,isAuthenticated:true},{isLoading:true,isAuthenticated:false}),{isLoading:true,isAuthenticated:false});
  assert.deepEqual(sessionStatus({isLoading:false,isAuthenticated:true},{isLoading:false,isAuthenticated:true}),{isLoading:false,isAuthenticated:true});
  assert.deepEqual(sessionStatus({isLoading:false,isAuthenticated:false},{isLoading:false,isAuthenticated:false}),{isLoading:false,isAuthenticated:false});
  assert.equal(sessionStatus({isLoading:true,isAuthenticated:false},{isLoading:true,isAuthenticated:false}).isLoading,true);
  assert.equal(sessionStatus({isLoading:false,isAuthenticated:false},{isLoading:false,isAuthenticated:true}).isAuthenticated,false);
});
