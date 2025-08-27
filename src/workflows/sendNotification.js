import { WorkflowEntrypoint } from "cloudflare:workers";
import { getAccessToken, sendMessage } from "../notificationServices/fcmService.js";

export class NotificationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    console.log("Workflow triggered with event:", event);
    const steps = {};

    steps.parse = await step.do("parse", async () => {
      if (!event.deviceToken) throw new Error("❌ Missing deviceToken");
      return {
        deviceToken: event.deviceToken,
        payload: event.payload || { title: "Default Title", body: "Default body" },
      };
    });

    steps.getAccessToken = await step.do("getAccessToken", async () => {
      return await getAccessToken();
    });

    steps.sendNotification = await step.do("sendNotification", async () => {
      return await sendMessage(
        steps.getAccessToken,
        steps.parse.deviceToken,
        steps.parse.payload
      );
    });

    return { status: "success", steps };
  }
}
