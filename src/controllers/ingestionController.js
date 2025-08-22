// ingestionController.js
import { createNotification } from "../helpers/postgres.js";
import { sendToDurableObjectQueue, hasScheduleTime } from "../helpers/durable.js";

export async function queueConsumer(batch, env) {
  console.log(`🔄 Processing ${batch.messages.length} messages from queue`);

  for (const msg of batch.messages) {
    try {
      const notificationData = msg.body;
      console.log("📥 Processing message:", notificationData);

      // 1. Save into PostgreSQL
      const dbResult = await createNotification(env, notificationData);
      console.log("📥 Queue -> DB response:", dbResult);

      // 2. If scheduled → also store in Durable Object
      if (hasScheduleTime(notificationData)) {
        console.log("⏰ Scheduled notification detected, sending to Durable Object first");
        await sendToDurableObjectQueue(env, notificationData);
        console.log("✅ Notification stored in DO and DB:", msg.id);
      } else {
        // No schedule_time → leave empty
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
