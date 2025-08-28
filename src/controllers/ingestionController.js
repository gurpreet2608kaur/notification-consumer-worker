// ingestionController.js
import { createNotification } from "../helpers/postgres.js";
import { sendToDurableObjectQueue, hasScheduleTime } from "../helpers/durable.js";
import { NotificationRouter } from "../helpers/notificationRouter.js";

export async function queueConsumer(batch, env) {
  console.log(`🔄 Processing ${batch.messages.length} messages from queue`);

  for (const msg of batch.messages) {
      try {
      const notificationData = msg.body;
      console.log("📥 Processing Notification message:", notificationData);

      // 1. Save into PostgreSQL
      const dbResult = await createNotification(env, notificationData);
      console.log("📥 Queue -> DB response:", dbResult);

      // 2. If scheduled → also store in Durable Object
      if (hasScheduleTime(notificationData)) {
        console.log("⏰ Scheduled notification detected, sending to Durable Object first");
        await sendToDurableObjectQueue(env, notificationData);
        console.log("✅ Notification stored in DO and DB:", msg.id);
      } else {
        // No schedule_time → process immediately
        try {
          console.log("STEP 1 IN QUEUE CONSUMER");
          const router = new NotificationRouter(env);

          // Route the notification based on available channels
          const results = await router.routeNotification(notificationData);

          console.log("🎯 Notification routing results:", results);

          // Log any errors that occurred
          if (results.errors && results.errors.length > 0) {
            console.error("⚠️ Some notifications failed:", results.errors);
          }

          // Log successful results
          if (results.whatsapp) {
            console.log("✅ WhatsApp notification processed:", results.whatsapp);
          }

          if (results.fcm) {
            console.log("✅ FCM notification processed:", results.fcm);
          }
        } catch (error) {
          console.error("❌ Failed to route notification:", error.message);
        }
      }
      // Acknowledge the message so it’s removed
      msg.ack();
    } catch (err) {
      console.error("❌ Failed to process message:", err);
      // Optional: msg.nack() to retry later
    }
  }

  console.log("🎉 Finished processing queue batch");
}
