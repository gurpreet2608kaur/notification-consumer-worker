// worker.js
import { Hono } from "hono";
import { createNotification } from "./helpers/postgres.js";
import { queueConsumer } from "./controllers/ingestionController.js";
import { scheduledNotiConsumer } from "./controllers/scheduledNotiController.js";
import { sendToDurableObjectQueue, hasScheduleTime } from "./helpers/durable.js";
import { sendMessage } from "./notificationServices/fcmService.js";
import { NotificationWorkflow } from "./workflows/sendNotification.js";
import { WhatsappNotificationWorkflow } from "./workflows/sendWhatsapp.js";

const app = new Hono();
app.get("/", (c) => c.text("Consumer Worker running!"));
app.post("/notifications", createNotification);

async function handleNotificationQueue(batch, env, ctx) {
  console.log("📨 Processing notification queue");

  for (const msg of batch.messages) {
    const body = typeof msg.body === "string" ? JSON.parse(msg.body) : msg.body;
    console.log("📌 Message body:", body);

    try {
     
      // -----------------------------whatsapp workflow start-----------------------------
      //   const whatsappData = {
      //   recipient_phone: "+918264281425",
      //   message: "this is a test message",
      //   agent_id: "45678",
      //   waba_phone_number: "+918941999555",
      //   company_id: "A",
      // };

      // console.log("🚀 Starting WhatsApp workflow with:", whatsappData);

      // // Generate a unique workflow ID
      // const workflowId = `whatsapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // // Create and start the workflow instance
      // console.log("📝 Creating workflow instance with ID:", workflowId);
      // const whatsappWorkflowInstance = await env.WHATSAPP_NOTIFICATION_WORKFLOW.create({
      //   id: workflowId,
      //   params: whatsappData
      // });

      // console.log("✅ Workflow created, checking status...");

      // // Get the initial status
      // let status = await whatsappWorkflowInstance.status();
      // console.log("📊 Initial workflow status:", status);

      // // Poll for completion if workflow is still running
      // let attempts = 0;
      // const maxAttempts = 30; // Maximum 30 attempts (30 seconds with 1-second intervals)
      // const pollInterval = 1000; // 1 second

      // while (status.status === "running" || status.status === "queued" || status.status === "waiting") {
      //   if (attempts >= maxAttempts) {
      //     console.log("⏰ Workflow still running after maximum wait time");
      //     break;
      //   }

      //   console.log(`⏳ Workflow status: ${status.status}, attempt ${attempts + 1}/${maxAttempts}`);
      //   await new Promise(resolve => setTimeout(resolve, pollInterval));

      //   status = await whatsappWorkflowInstance.status();
      //   attempts++;
      // }

      // if (status.status === "complete") {
      //   console.log("🎉 WhatsApp Workflow completed successfully:", status.output);
      // } else if (status.status === "errored") {
      //   console.error("❌ WhatsApp Workflow failed:", status.error);
      // } else {
      //   console.log("📊 Final WhatsApp Workflow status:", status);
      // }

      // -----------------------------whatsapp workflow end-----------------------------

      //-----------------------------fcm workflow start----------------------------- 
      // const deviceToken = body.content?.mobile?.fcm_token?.[0];

      //  if (!deviceToken) {
      //     console.warn("⚠️ No device token found, skipping message");
      //     continue;
      //   }

      // const workflowInput = {
      //   deviceToken: deviceToken,
      //   payload: {
      //     title: body.content?.mobile?.title || "Notification",
      //     body: body.content?.mobile?.body || "You have a new notification"
      //   }
      // };

      // console.log("🚀 Starting FCM workflow with:", workflowInput);

      // // Create FCM workflow instance
      // const fcmWorkflowId = `fcm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // const fcmWorkflowInstance = await env.NOTIFICATION_WORKFLOW.create({
      //   id: fcmWorkflowId,
      //   params: workflowInput
      // });

      // const fcmResult = await fcmWorkflowInstance.result();
      // console.log("🎉 FCM Workflow result:", fcmResult);
      // -----------------------------fcm workflow end-----------------------------

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
     // await handleNotificationQueue(batch, env, ctx);
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
export { WhatsappNotificationWorkflow };