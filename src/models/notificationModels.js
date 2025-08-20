//notificationmodel.js

import { pgTable, uuid, text, json, timestamp } from "drizzle-orm/pg-core";

export const notifications = pgTable("notifications", {
  uid: uuid("uid").defaultRandom().primaryKey(), // matches your DB
  company_id: text("company_id").notNull(),
  employee_id: text("employee_id").notNull(),
  position_id: text("position_id").notNull(),
  category: text("category").notNull(),
  sub_category: text("sub_category").notNull(),
  content: json("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
