require("dotenv").config();
const { initMongo } = require("./src/config/database");
const { runAnalyticsAggregation } = require("./src/jobs/analyticsJob");

async function run() {
  try {
    await initMongo();
    const start = Date.now();
    const data = await runAnalyticsAggregation();
    console.log("Analytics data:", JSON.stringify(data, null, 2));
    console.log(`Execution time: ${Date.now() - start}ms`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to run aggregation", error);
    process.exit(1);
  }
}
run();
