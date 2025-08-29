// src/workflows/sendNotification.js

import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getAccessToken, sendMessage } from "../notificationServices/fcmService.js";

export class NotificationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    console.log("nNotification Workflow triggered with event:", event); 
    const steps = {};

    // Step 1: Normalize incoming data
    steps.parse = await step.do("parse", async () => {
      try {
        return {
          deviceToken: event.deviceToken ?? null,
          payload: event.payload ?? {},
        };
      } catch (err) {
        console.error("❌ Parse step failed:", err);
        throw err;
      }
    });


    // steps.parse = await step.do("parse", async () => {
    //   console.log("Parsing workflow input:", event);
    //   if (!event.deviceToken) throw new Error("❌ Missing deviceToken");
    //   // Handle nested payload structure and provide defaults
    //   const payload = event.payload?.payload || event.payload || {};
    //   return {
    //     deviceToken: event.deviceToken,
    //     payload: {
    //       title: payload.title,
    //       body: payload.body
    //     }
    //   };
    // },);

    console.log("Parsed workflow input:", steps.parse);

    // Step 2: Get Access Token
    steps.getAccessToken = await step.do("getAccessToken", async () => {
      return await getAccessToken(this.env); // Pass this.env
    });

    console.log("Access token retrieved:", steps.getAccessToken, steps.parse.deviceToken, steps.parse.payload);

    // Step 3: Send Notification
    steps.sendNotification = await step.do("sendNotification", async () => {

      console.log("Access token retrieved:11", steps.getAccessToken,);
      console.log("Access token retrieved:22", steps.parse.payload.deviceToken,);
      console.log("Access token retrieved:33", steps.parse.payload);

      try {
        const result = await sendMessage(
          steps.getAccessToken,
          steps.parse.payload.deviceToken,
          steps.parse.payload,
          this.env
        );
        return result;
      } catch (err) {
        console.error("❌ FCM send failed:1212", err);
        throw err;
      }
    });

    // steps.sendNotification = await step.do("sendNotification", async () => {
    //   return await sendMessage(
    //     steps.getAccessToken,
    //     steps.parse.deviceToken,
    //     steps.parse.payload,
    //     this.env // Pass this.env
    //   );
    // });

    console.log("Notification sent result:", steps.sendNotification);

    return {
      status: "success",
      steps
    };
  }
}