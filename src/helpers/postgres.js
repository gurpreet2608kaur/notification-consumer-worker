// postgres.js
import { getDb } from "../configs/postgres.config.js";
// import { notifications } from "../models/notificationModels.js";
export const createNotification = async (env, notificationData) => {
  try {
    const db = getDb(env);

    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();

    console.log("📥 DB Inserted notification:", notification);
    return { success: true, data: notification };
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    return { success: false, error: "Failed to create notification" };
  }
};

// Fixed postgres helper function




// export const createCampaignNotification = async (env, notificationData) => {
//   try {
//     const db = getDb(env);

//     const [notification] = await db
//       .insert(campaignNotifications)
//       .values(notificationData)
//       .returning();

//     console.log("📥 DB Inserted campaign notification:", notification);
//     return { success: true, data: notification };
//   } catch (error) {
//     console.error("❌ Error creating campaign notification:", error);
//     return { success: false, error: "Failed to create campaign notification" };
//   }
// };