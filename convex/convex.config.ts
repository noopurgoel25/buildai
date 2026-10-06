import { defineApp } from "convex/server";
import staticHosting from "@convex-dev/static-hosting/convex.config";

// Your own HTTP endpoints (convex/http.ts) are served under /api so the
// static site can own the root.
// Auth discovery needs root URLs; static hosting follows exact app routes.
const app = defineApp();
app.use(staticHosting);

export default app;
