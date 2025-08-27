// worker.js
import { Hono } from "hono";
import { createNotification } from "./helpers/postgres.js";
import { queueConsumer } from "./controllers/ingestionController.js";
import { scheduledNotiConsumer } from "./controllers/scheduledNotiController.js";
import { sendToDurableObjectQueue, hasScheduleTime } from "./helpers/durable.js";
import { sendMessage } from "./notificationServices/fcmService.js";
import { NotificationWorkflow } from "./workflows/sendNotification.js";

const app = new Hono();
app.get("/", (c) => c.text("Consumer Worker running!"));
app.post("/notifications", createNotification);

async function handleNotificationQueue(batch, env, ctx) {
  console.log("📨 Processing notification queue");
  
  for (const msg of batch.messages) {
    const body = typeof msg.body === "string" ? JSON.parse(msg.body) : msg.body;
    console.log("📌 Message body:", body);
    
    try {
      // Extract token from your actual message structure
      const deviceToken = body.content?.mobile?.fcm_token?.[0];
      
      if (!deviceToken) {
        console.warn("⚠️ No device token found, skipping message");
        continue;
      }
      
      const workflowInput = {
        deviceToken: deviceToken,
        payload: {
          title: body.content?.mobile?.title || "Notification",
          body: body.content?.mobile?.body || "You have a new notification"
        }
      };
      
      console.log("🚀 Starting workflow with:", workflowInput);
      
      // Try the workflow start
      const workflowInstance = await env.NOTIFICATION_WORKFLOW.start(workflowInput);
      console.log("✅ Workflow started, waiting for result...");
      
      const result = await workflowInstance.result();
      console.log("🎉 Workflow result:", result);
      
    } catch (error) {
      console.error("❌ Error processing message:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}

export default {
  fetch: app.fetch,

  async queue(batch, env, ctx) {
    console.log("📬 Queue event from:", batch.queue);
    console.log("🔍 Env keys:", Object.keys(env));
    
    const notificationQueue = env.NOTIFICATION_QUEUE;
    const scheduledQueue = env.SCHEDULED_NOTIFICATION_QUEUE;
    
    if (batch.queue === notificationQueue) {
      await handleNotificationQueue(batch, env, ctx);
      ctx.waitUntil(queueConsumer(batch, env));
    } else if (batch.queue === scheduledQueue) {
      console.log("⏰ Triggered by scheduled queue");
      ctx.waitUntil(scheduledNotiConsumer(batch, env));
    } else {
      console.warn("⚠️ Unknown queue:", batch.queue);
    }
  },
};

export { NotificationWorkflow };