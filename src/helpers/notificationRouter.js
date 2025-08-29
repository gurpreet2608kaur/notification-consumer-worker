// NotificationRouter.js
export class NotificationRouter {
    constructor(env) {
        this.env = env;
        this.maxAttempts = 30;
        this.pollInterval = 1000;
    }

    async routeNotification(requestBody) {
        const { content } = requestBody;

        console.log("STEP 2 IN ROUTE NOTIFICATION");

        if (!content) {
            throw new Error("No content found in request body");
        }

        const availableChannels = this.getAvailableChannels(content);
        console.log(" Available channels:", availableChannels);

        const results = { whatsapp: null, fcm: null, errors: [] };
        const hasWhatsApp = availableChannels.includes('whatsapp');
        const hasMobile = availableChannels.includes('mobile');

        if (!hasWhatsApp && !hasMobile) {
            throw new Error("No valid notification channels found in request");
        }

        const workflows = [];

        if (hasWhatsApp) {
            workflows.push(
                this.executeWhatsappWorkflow(content.whatsapp)
                    .then(result => { results.whatsapp = result; })
                    .catch(error => { results.errors.push({ channel: 'whatsapp', error: error.message }); })
            );
        }

        if (hasMobile) {
            workflows.push(
                this.executeFcmWorkflow(content.mobile, requestBody)
                    .then(result => { results.fcm = result; })
                    .catch(error => { results.errors.push({ channel: 'fcm', error: error.message }); })
            );
        }

        console.log(`🔄 Running ${workflows.length} workflow(s)`);
        await Promise.all(workflows);

        return results;
    }

    getAvailableChannels(content) {
        const channels = [];

        if (content.whatsapp && this.isValidWhatsappContent(content.whatsapp)) {
            channels.push('whatsapp');
        }

        if (content.mobile && this.isValidMobileContent(content.mobile)) {
            channels.push('mobile');
        }

        return channels;
    }
    isValidWhatsappContent(whatsappContent) {
        return true; // Always allow whatsapp
    }


    // isValidWhatsappContent(whatsappContent) {
    //     return whatsappContent &&
    //         whatsappContent.recipient_phone &&
    //         whatsappContent.message &&
    //         whatsappContent.agent_id &&
    //         whatsappContent.waba_phone_number &&
    //         whatsappContent.company_id;
    // }

    isValidMobileContent(mobileContent) {
        return mobileContent && mobileContent.fcm_token?.length > 0;
    }

    // ✅ Only forward WhatsApp fields required by API
    async executeWhatsappWorkflow(whatsappContent) {
        console.log("🚀 Starting WhatsApp workflow", whatsappContent);

        // Minimal data, as static payload is used in sendWhatsapp.js
        const whatsappData = {
            recipient_phone: whatsappContent.recipient_phone?.[0],
            message: whatsappContent.body || "this is a test message app",
            agent_id: whatsappContent.agent_id || "45678",
            waba_phone_number: whatsappContent.business_number || "+918941999555",
            company_id: whatsappContent.company_id || "A",
            message_type: whatsappContent.message_type || "text"
        };

        const workflowId = this.generateWorkflowId('whatsapp');
        const workflowInstance = await this.env.WHATSAPP_NOTIFICATION_WORKFLOW.create({
            id: workflowId,
            params: whatsappData
        });

        return this.pollWorkflowCompletion(workflowInstance, 'WhatsApp');
    }

    async executeFcmWorkflow(mobileContent, fullRequest) {
        console.log("Starting FCM workflow", JSON.stringify(mobileContent, null, 2));

        const deviceToken = mobileContent.fcm_token?.[0];
        if (!deviceToken) {
            throw new Error("No FCM token found");
        }

        const workflowInput = {
            deviceToken,
            payload: {
                title: mobileContent.title || "Default Title",
                body: mobileContent.body || "Default Body"
            },
            company_id: fullRequest.company_id,
            employee_id: fullRequest.employee_id
        };

        console.log("FCM workflow input:", JSON.stringify(workflowInput, null, 2));

        const workflowId = this.generateWorkflowId('fcm');
        console.log("Generated workflow ID:", workflowId);

        let workflowInstance;
        try {
            workflowInstance = await this.env.NOTIFICATION_WORKFLOW.create({
                id: workflowId,
                params: workflowInput
            });
            console.log("Workflow instance created:", workflowId);
        } catch (error) {
            console.error("Failed to create workflow instance:", error.message, error.stack);
            throw new Error(`Workflow creation failed: ${error.message}`);
        }

        // Use pollWorkflowCompletion instead of workflowInstance.run()
        return this.pollWorkflowCompletion(workflowInstance, 'FCM');
    }



    async pollWorkflowCompletion(workflowInstance, workflowType) {
        const maxAttempts = 60; // Increased to 60 seconds
        const pollInterval = 1000;
        let status = await workflowInstance.status();
        let attempts = 0;

        while (this.isWorkflowRunning(status.status) && attempts < maxAttempts) {
            console.log(`⏳ ${workflowType} workflow status: ${status.status}, attempt ${attempts + 1}/${maxAttempts}`);
            await this.sleep(pollInterval);
            status = await workflowInstance.status();
            attempts++;
        }

        if (status.status === "complete") {
            console.log(`🎉 ${workflowType} Workflow completed:`, status.output);
            return { status: 'success', output: status.output };
        }

        if (status.status === "errored") {
            console.error(`❌ ${workflowType} Workflow failed:`, status.error);
            throw new Error(`${workflowType} workflow failed: ${status.error}`);
        }

        console.error(`⏰ ${workflowType} workflow timeout after ${maxAttempts} attempts`);
        throw new Error(`${workflowType} workflow timed out after ${maxAttempts} seconds`);
    }


    generateWorkflowId(prefix) {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 10);
        return `${prefix}-${timestamp}-${randomStr}`;
    }

    isWorkflowRunning(status) {
        return ["running", "queued", "waiting"].includes(status);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
