// durable.js 

// durableObjectController.js

const DURABLE_OBJECT_URL = "https://notification-durable-object.amiltusgroup.workers.dev/notification";

/**
 * Send notification data to durable object worker
 * @param {Object} notificationData - The notification object to be sent
 * @returns {Promise<boolean>} Success status
 */
export async function sendToDurableObjectQueue(notificationData) {
  try {
    console.log("📤 Calling durable object worker for:", notificationData.company_id);
    
    const response = await fetch(DURABLE_OBJECT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notificationData),
    });

    if (!response.ok) {
      throw new Error(`Durable object worker responded with status: ${response.status}`);
    }

    console.log("✅ Successfully called durable object worker");
    return true;
  } catch (error) {
    console.error("❌ Failed to call durable object worker:", error.message);
    throw error;
  }
}

/**
 * Check if notification data contains schedule time
 * @param {Object} notificationData - The notification object to check
 * @returns {boolean} True if contains schedule_time
 */
export function hasScheduleTime(notificationData) {
  return notificationData?.content?.schedule_time !== undefined;
}








/// write controller here to add the notification into the durable object