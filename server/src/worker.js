// Standalone cleanup worker — runs the periodic sweep as its own process, in its
// own container, decoupled from the API server. The API server hands this off via
// CLEANUP_ENABLED=false. This is the first service extracted out of the monolith.
import dotenv from "dotenv";
import { runCleanup } from "./services/cleanupService.js";

dotenv.config();

const INTERVAL_MIN = Number(process.env.CLEANUP_INTERVAL_MIN) || 30;
const INTERVAL_MS  = INTERVAL_MIN * 60 * 1000;

console.log(`🧹 Cleanup worker started — sweeping every ${INTERVAL_MIN} min`);

runCleanup();                          // run once on boot
setInterval(runCleanup, INTERVAL_MS);  // then on a schedule
