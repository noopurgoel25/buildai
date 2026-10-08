/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as capture from "../capture.js";
import type * as classification from "../classification.js";
import type * as doctorBriefs from "../doctorBriefs.js";
import type * as http from "../http.js";
import type * as interpretation from "../interpretation.js";
import type * as lib_captureValidation from "../lib/captureValidation.js";
import type * as lib_doctorBrief from "../lib/doctorBrief.js";
import type * as lib_formatSpokenTime from "../lib/formatSpokenTime.js";
import type * as lib_healthEvent from "../lib/healthEvent.js";
import type * as lib_observationTiming from "../lib/observationTiming.js";
import type * as lib_summary from "../lib/summary.js";
import type * as lib_summaryShare from "../lib/summaryShare.js";
import type * as login from "../login.js";
import type * as records from "../records.js";
import type * as summaries from "../summaries.js";
import type * as summarySharing from "../summarySharing.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  capture: typeof capture;
  classification: typeof classification;
  doctorBriefs: typeof doctorBriefs;
  http: typeof http;
  interpretation: typeof interpretation;
  "lib/captureValidation": typeof lib_captureValidation;
  "lib/doctorBrief": typeof lib_doctorBrief;
  "lib/formatSpokenTime": typeof lib_formatSpokenTime;
  "lib/healthEvent": typeof lib_healthEvent;
  "lib/observationTiming": typeof lib_observationTiming;
  "lib/summary": typeof lib_summary;
  "lib/summaryShare": typeof lib_summaryShare;
  login: typeof login;
  records: typeof records;
  summaries: typeof summaries;
  summarySharing: typeof summarySharing;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
