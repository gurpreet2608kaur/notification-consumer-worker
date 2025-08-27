// src/controllers/scheduledNotiController.js


export async function scheduledNotiConsumer(batch, env) {
  console.log(`⏰ Processing 📥 scheduled message: ${batch.messages.length} scheduled notifications`);

  for (const msg of batch.messages) {
    try {
      console.log("📌 Scheduled notification received:", msg.body);

      // ✅ Later, you can add logic to store to Postgres, 
      // call Durable Object, or dispatch WebSocket
    } catch (err) {
      console.error("❌ Error handling scheduled notification:", err, msg);
    }
  }
}


// create a new controller for handling scheduled notifications from "scheduled-notification-queue" and console it 
