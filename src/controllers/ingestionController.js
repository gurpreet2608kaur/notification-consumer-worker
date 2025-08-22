// ingestionController.js
import { createNotification } from "../helpers/postgres.js";
import { sendToDurableObjectQueue, hasScheduleTime } from "../helpers/durable.js";
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

     
      // write a if condition here if else condtion here to first move the object into durable object and then save into postgresql and leave else block empty 

      await createNotification(fakeContext);

   if (hasScheduleTime(requestBody)) {
           console.log("⏰ Scheduled notification detected, sending to durable object queue");
        
        // Send to durable object worker via queue
        await sendToDurableObjectQueue(requestBody, env);
        
   
      } else {
        // No schedule_time, leave empty as requested
      }

      console.log("✅ Notification processed from queue:", msg.id);

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
