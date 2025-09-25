// sendWhatsapp.js
import { WorkflowEntrypoint } from "cloudflare:workers";

export class WhatsappNotificationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    console.log("WhatsApp notification workflow triggered with event:", event);
    try {
      const steps = {};

      // Validate dynamic payload
      steps.validatePayload = await step.do("validatePayload", async () => {
        console.log("Validating payload:", JSON.stringify(event.payload, null, 2));
        const payload = event.payload || {};
        if (!payload.recipient_phone) throw new Error("❌ Missing recipient_phone");
        if (!payload.message) throw new Error("❌ Missing message");
        if (!payload.agent_id) throw new Error("❌ Missing agent_id");
        if (!payload.waba_phone_number) throw new Error("❌ Missing waba_phone_number");
        if (!payload.company_id) throw new Error("❌ Missing company_id");
        if (!payload.message_type) throw new Error("❌ Missing message_type");
        return payload;
      });

      console.log("Payload validated:", JSON.stringify(steps.validatePayload, null, 2));
      steps.sendWhatsappMessage = await step.do("sendWhatsappMessage", async () => {
        const maxRetries = 3;
        let attempt = 1;

        while (attempt <= maxRetries) {
          try {
            console.log(`Attempt ${attempt} to send WhatsApp message with payload:`, steps.validatePayload);
            const response = await fetch(
              "https://Whatsapp-webhook-worker.amiltusgroup.workers.dev/send-message",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(steps.validatePayload),
              }
            );

            console.log(`WhatsApp API response status: ${response.status}`);
            console.log(`WhatsApp API response headers:`, Object.fromEntries(response.headers));

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`WhatsApp API error response: ${errorText}`);
              throw new Error(`WhatsApp API request failed: ${response.status} - ${errorText}`);
            }

            const jsonResponse = await response.json();
            console.log("WhatsApp API response body:", jsonResponse);
            return jsonResponse;
          } catch (error) {
            console.error(`Attempt ${attempt} failed: ${error.message}`);
            if (attempt === maxRetries) {
              throw new Error(`Failed to send WhatsApp message after ${maxRetries} attempts: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            attempt++;
          }
        }
      });

      return {
        status: "success",
        steps,
        whatsappResponse: steps.sendWhatsappMessage
      };
    } catch (error) {
      console.error("❌ Workflow error:", error.message);
      return {
        status: "error",
        message: error.message
      };
    }
  }
}


// import { WorkflowEntrypoint } from "cloudflare:workers";

// export class WhatsappNotificationWorkflow extends WorkflowEntrypoint {
//   async run(event, step) {
//     console.log("WhatsApp notification workflow triggered with event:", event);
//     try {
//     //   const staticPayload = {
//     //     recipient_phone: "+918264281425",
//     //     message: "this is a test message from app",
//     //     agent_id: "45678",
//     //     waba_phone_number: "+918941999555",
//     //     company_id: "A",
//     //     message_type: "text"
//     //   };

//       const steps = {};

//      steps.sendWhatsappMessage = await step.do("sendWhatsappMessage", async () => {
//   const maxRetries = 3;
//   let attempt = 1;

//   while (attempt <= maxRetries) {
//     try {
//       console.log(`Attempt ${attempt} to send WhatsApp message with payload:`, staticPayload);
//       const response = await fetch(
//         "https://Whatsapp-webhook-worker.amiltusgroup.workers.dev/send-message",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(payload),
//         }
//       );

//       console.log(`WhatsApp API response status: ${response.status}`);
//       console.log(`WhatsApp API response headers:`, Object.fromEntries(response.headers));

//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error(`WhatsApp API error response: ${errorText}`);
//         throw new Error(`WhatsApp API request failed: ${response.status} - ${errorText}`);
//       }

//       const jsonResponse = await response.json();
//       console.log("WhatsApp API response body:", jsonResponse);
//       return jsonResponse;
//     } catch (error) {
//       console.error(`Attempt ${attempt} failed: ${error.message}`);
//       if (attempt === maxRetries) {
//         throw new Error(`Failed to send WhatsApp message after ${maxRetries} attempts: ${error.message}`);
//       }
//       await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
//       attempt++;
//     }
//   }
// });

//       return {
//         status: "success",
//         steps,
//         whatsappResponse: steps.sendWhatsappMessage
//       };
//     } catch (error) {
//       console.error("❌ Workflow error:", error.message);
//       return {
//         status: "error",
//         message: error.message
//       };
//     }
//   }
// }