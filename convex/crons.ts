import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';
const crons=cronJobs();
crons.interval('retry analytics profile deletion',{hours:1},internal.analytics.retryCleanup,{});
crons.interval('expire anonymous analytics preferences',{hours:24},internal.analytics.expireAnonymous,{});
export default crons;
