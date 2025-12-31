/**
 * Development server entry point
 * Run with: npx tsx server/dev.ts
 */
import "dotenv/config";
import { createServer } from "./index";

const app = createServer();
const port = process.env.API_PORT || 3000;

app.listen(port, () => {
    console.log(`🚀 API Server running on http://localhost:${port}`);
    console.log(`📝 Health check: http://localhost:${port}/api/health`);
});
