import { pgTable, uuid, text, json, timestamp } from "drizzle-orm/pg-core";

export const notifications = pgTable("notifications", {
  uid: uuid("uid").defaultRandom().primaryKey(),
  company_id: text("company_id").notNull(),
  employee_id: text("employee_id").notNull(),
  position_id: text("position_id").notNull(),

  // channels is array (stored as JSON)
  channels: json("channels").notNull(),
 request_type: text("request_type").notNull(),
  type: text("type").notNull(),
  status: text("status").default("pending"),

  // Full structured JSON content (whatsapp/mobile etc.)
  content: json("content").notNull(),

  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
