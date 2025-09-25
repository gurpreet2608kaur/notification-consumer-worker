import { pgTable, uuid, text, json, timestamp } from "drizzle-orm/pg-core";

export const notifications = pgTable("campaign", {
  campaign_id: uuid("campaign_id").defaultRandom().primaryKey(),
  company_id: text("company_id").notNull(),
  employee_id: text("employee_id").notNull(),
  position_id: text("position_id").notNull(),
  recipient_list: text("recipient_list").notNull(),
  channels: json("channels").notNull(),
  type: text("type").notNull(),
  status: text("status").default("pending"),
  content: json("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  schedule_time: json("schedule_time").notNull()
});