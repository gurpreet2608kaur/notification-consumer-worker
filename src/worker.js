// worker.js
import { Hono } from "hono";
import { createNotification } from "./helpers/postgres.js";
import { queueConsumer } from "./controllers/ingestionController.js";
import { scheduledNotiConsumer } from "./controllers/scheduledNotiController.js";
import { sendToDurableObjectQueue, hasScheduleTime } from "./helpers/durable.js";
const app = new Hono();

app.get("/", (c) => c.text("🚀 Consumer Worker running!"));

// Manual API insert (optional testing)
app.post("/notifications", createNotification);

export default {
  // Handle HTTP requests
   fetch: app.fetch,

  async queue(batch, env, ctx) {
    // Wrangler will deliver both `notification-queues` and `scheduled-notification-queue`
    // We differentiate based on queue name
    console.log("📬 Queue event received from:", batch.queue);
      const notificationQueue = env.NOTIFICATION_QUEUE;
    const scheduledQueue = env.SCHEDULED_NOTIFICATION_QUEUE;
    if (batch.queue === notificationQueue) {
      console.log("📨 Triggered by notification-queues");
      ctx.waitUntil(queueConsumer(batch, env));
    } else if (batch.queue === scheduledQueue) {
      console.log("⏰ Triggered by scheduled-notification-queue");
      ctx.waitUntil(scheduledNotiConsumer(batch, env));
    } else {
      console.warn("⚠️ Unknown queue source:", batch.queue);
    }
  },
};
