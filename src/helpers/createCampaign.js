import { getDb } from "../configs/postgres.config.js";
import { campaignNotifications } from "../models/campaignModel.js";


export async function createCampaignNotification(env, data) {
  try {
    console.log("📝 Creating campaign notification with data:", data);

    const db = getDb(env); // ✅ FIX: use Drizzle client

    // const recipientList = Array.isArray(data.recipient_list)
    //   ? data.recipient_list
    //   : [data.recipient_list];

    // let scheduleTime = null;
    // if (data.schedule_time) {
    //   if (typeof data.schedule_time === "string") {
    //     try {
    //       scheduleTime = JSON.parse(data.schedule_time);
    //     } catch (parseError) {
    //       console.warn("⚠️ Failed to parse schedule_time string:", data.schedule_time);
    //       scheduleTime = [data.schedule_time];
    //     }
    //   } else if (Array.isArray(data.schedule_time)) {
    //     scheduleTime = data.schedule_time;
    //   }
    // }

    const insertData = {
      company_id: data.company_id,
      employee_id: data.employee_id,
      position_id: data.position_id,
      recipient_list: data.recipient_list,
      channels: data.channels,
      type: data.type,
      status: "pending",
      schedule_time: data.schedule_time,
    };

    console.log("📝 Inserting campaign notification:", insertData);

    const [campaignNotification] = await db
      .insert(campaignNotifications)
      .values(insertData)
      .returning();

    console.log("✅ Campaign notification created:", campaignNotification);
    return { success: true, data: campaignNotification };
  } catch (error) {
    console.error("❌ Error creating campaign notification:", error);
    return {
      success: false,
      error: `Failed to create campaign notification: ${error.message}`,
    };
  }
}