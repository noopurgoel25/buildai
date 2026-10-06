import { action } from './_generated/server';
import { v } from 'convex/values';
import { preparePeriod } from './summaries';
import { briefResult, composeBrief } from './lib/doctorBrief';

export const generate=action({
  args:{patientId:v.id('people'),start:v.string(),end:v.string()},
  returns:briefResult,
  handler:async(ctx,args)=>composeBrief(await preparePeriod(ctx,args),args.start,args.end),
});
