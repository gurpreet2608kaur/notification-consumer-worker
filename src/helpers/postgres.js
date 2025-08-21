// notificationController.js
import { getDb } from "../configs/postgres.config.js";
import { notifications } from "../models/notificationModels.js";

export const createNotification = async (c) => {
  try {
    const db = getDb(c.env);
    const body = await c.req.json();

    const [notification] = await db
      .insert(notifications)
      .values(body)
      .returning();

    return c.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    return c.json({ success: false, error: "Failed to create notification" }, 500);
  }
};

