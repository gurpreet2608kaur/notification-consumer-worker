/**
 * Send notification data to the Durable Object instance
 * @param {Object} env - Worker environment (must contain NOTIFICATION binding)
 * @param {Object} notificationData - The notification object to be sent
 * @returns {Promise<boolean>} Success status
 */
export async function sendToDurableObjectQueue(env, notificationData) {
  try {
    console.log("📤 Sending to Durable Object:", notificationData);

    // Get deterministic DO instance
    const id = env.DURABLEOBJECT.idFromName("notification");
    const stub = env.DURABLEOBJECT.get(id);

    // Call DO /store endpoint
    const response = await stub.fetch("http://do/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationData),
    });

    console.log("🔎 DO response status:", response.status);

    if (!response.ok) {
      throw new Error(`DO responded with ${response.status}`);
    }

    console.log("✅ Stored notification in DO");
    return true;
  } catch (error) {
    console.error("❌ Failed to store notification in DO:", error.message);
    throw error;
  }
}

/**
 * Check if notification data contains schedule time
 */
export function hasScheduleTime(notificationData) {
  return notificationData?.content?.schedule_time !== undefined;
}
