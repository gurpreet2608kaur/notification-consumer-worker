import { createNotification } from "./notificationController.js";

export async function queueConsumer(batch, env) {
  console.log(`🔄 Processing ${batch.messages.length} messages from queue`);

  for (const msg of batch.messages) {
    try {
      // Fake context to reuse createNotification
      const fakeContext = {
        env,
        req: {
          async json() {
            return msg.body; // message body sent from producer
          },
        },
        json(data, status = 200) {
          console.log("📥 Queue -> DB response:", data, "status:", status);
          return { data, status };
        },
      };

      // Save to Postgres
      await createNotification(fakeContext);

      console.log("✅ Notification saved from queue:", msg.id);

      // Acknowledge the message so it’s removed
      msg.ack();
    } catch (err) {
      console.error("❌ Failed to process message:", err);
      // nack = let queue retry later
      msg.nack();
    }
  }

  console.log("🎉 Finished processing queue batch");
}
