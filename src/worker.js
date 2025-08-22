// worker.js
import { Hono } from "hono";
import { createNotification } from "./helpers/postgres.js";
import { queueConsumer } from "./controllers/ingestionController.js";
import { sendToDurableObjectQueue, hasScheduleTime } from "./helpers/durable.js";
const app = new Hono();

app.get("/", (c) => c.text("🚀 Consumer Worker running!"));

// Manual API insert (optional testing)
app.post("/notifications", createNotification);

export default {
  // Handle HTTP requests
  fetch: app.fetch,

  // Handle queue messages (push-based consumption)
  async queue(batch, env, ctx) {
    console.log("📨 Queue consumer triggered with", batch.messages.length, "messages");
    ctx.waitUntil(queueConsumer(batch, env));
  },
};
