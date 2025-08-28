
import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getAccessToken, sendMessage } from "../notificationServices/fcmService.js";

export class NotificationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    console.log("Workflow triggered with event:", event);
const steps = {};
   
    // Step 1: Normalize incoming data
    steps.parse = await step.do("parse", async () => {
      if (!event.deviceToken) throw new Error("❌ Missing deviceToken");
      return {
        deviceToken: event.deviceToken,
        payload: event.payload || {
          title: "Default Title",
          body: "Default body",
        },
      };
    });

  // Step 2: Get Access Token
    steps.getAccessToken = await step.do("getAccessToken", async () => {
      return await getAccessToken();
    });

      // Step 3: Send Notification
    steps.sendNotification = await step.do("sendNotification", async () => {
      return await sendMessage(
        steps.getAccessToken,
        steps.parse.deviceToken,
        steps.parse.payload
      );
    });

   return {
      status: "success",
      steps,
    };
  }
}
