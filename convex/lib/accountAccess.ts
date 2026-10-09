import { getAuthUserId } from '@convex-dev/auth/server';
import type { QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

export async function accountIsActive(ctx:Pick<QueryCtx,'db'>,userId:Id<'users'>) {
  if(!await ctx.db.get(userId))return false;
  const deletion=await ctx.db.query('accountDeletions').withIndex('by_user',q=>q.eq('userId',userId)).unique();
  return !deletion?.deleting;
}
export async function getActiveUserId(ctx:Pick<QueryCtx,'db'|'auth'>) {
  const userId=await getAuthUserId(ctx);
  return userId && await accountIsActive(ctx,userId)?userId:null;
}
