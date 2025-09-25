// src/fireworker/fireworkerService.js
import { get, query, set, update } from 'fireworkers';
import { getFirestore } from '../fireworker/fireworkerConfig.js';
export class DataHelper {
    constructor() {
        this.db = null;
    }

    unwrap(fields) {
        const result = {};
        for (const key in fields) {
            const value = fields[key];
            const valueType = Object.keys(value)[0];
            const raw = value[valueType];

            if (valueType === 'mapValue') {
                result[key] = this.unwrap(raw.fields || {});
            } else if (valueType === 'arrayValue') {
                result[key] = (raw.values || []).map((v) => this.unwrap({ temp: v }).temp);
            } else {
                result[key] = raw;
            }
        }
        return result;
    }
  async getSingleCustomerDetail(userId, company_id) {
  console.log('🚀 getSingleCustomerDetail called with:', { company_id, userId });
  await this.ensureInit();
  if (!this.db) throw new Error('Firestore not initialized');

  try {
  
    const path = `Companies/${company_id}/customers/${userId}`;
    console.log('📍 Firestore collection path:', path);
 
     const customer= await this.getAll(path);

    console.log('🔍 Found customer:', customer);

    return customer || null;
  } catch (error) {
    console.error('❌ Error in getSingleCustomerDetail:', error);
    console.error('📚 Error stack:', error.stack);
    return null;
  }
}
 // SINGLE CUSTOMER DATA

    async init() {
        try {
            console.log('Initializing Firestore connection...');
            this.db = await getFirestore();
            console.log('Firestore initialized successfully:', !!this.db);
            return this.db;
        } catch (error) {
            console.error('Error initializing Firestore:', error);
            throw error;
        }
    }

    async ensureInit() {
        if (!this.db) {
            console.log('Firestore not initialized, initializing now...');
            await this.init();
            console.log('Firestore initialization completed:', !!this.db);
        }
    }
    async initializeQuota(companyId, businessPhoneNumber, config = {}) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        const { totalRateLimit = '1000', remainingRateLimit = '1000', windowDurationHours = 24 } = config;

        const now = new Date();
        const windowReopenTime = new Date(now.getTime() + windowDurationHours * 60 * 60 * 1000);

        const quotaData = {
            last_message_timestamp: now,
            remaining_rate_limit: remainingRateLimit,
            total_rate_limit: totalRateLimit,
            window_reopen_time: windowReopenTime,
        };

        const path = `Companies/${companyId}/notifications_channels_quotas/whatsapp`;

        try {
            const existingData = (await this.getDocument(path)) || {};

            existingData[businessPhoneNumber] = quotaData;
            existingData.id = 'whatsapp'; // Maintain the id field

            await this.setDoc({ path, data: existingData, merge: true });
            console.log(`✅ Quota initialized for business phone: ${businessPhoneNumber}`);
            return { success: true, data: quotaData };
        } catch (error) {
            console.error(`Error initializing quota for ${businessPhoneNumber}:`, error);
            throw error;
        }
    }

    /**
    * Get quota for a specific business phone number
    */
    async getQuota(companyId, businessPhoneNumber) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        const path = `Companies/${companyId}/notifications_channels_quotas/whatsapp`;

        try {
            const quotaDoc = await this.getDocument(path);

            if (!quotaDoc || !quotaDoc[businessPhoneNumber]) {
                console.warn(`No quota found for business phone: ${businessPhoneNumber}`);
                return null;
            }

            const phoneQuota = quotaDoc[businessPhoneNumber];
            const now = new Date();
            const windowReopenTime = new Date(phoneQuota.window_reopen_time);

            let needsUpdate = false;
            const updatedQuota = { ...phoneQuota };

            // Reset quota if window has reopened
            if (now >= windowReopenTime) {
                updatedQuota.remaining_rate_limit = updatedQuota.total_rate_limit;
                updatedQuota.window_reopen_time = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                needsUpdate = true;
            }

            if (needsUpdate) {
                // Update the document
                const fullDoc = { ...quotaDoc };
                fullDoc[businessPhoneNumber] = updatedQuota;
                await this.setDoc({ path, data: fullDoc, merge: true });
                console.log(`🔄 Quota reset for business phone: ${businessPhoneNumber}`);
            }

            return updatedQuota;
        } catch (error) {
            console.error(`Error getting quota for ${businessPhoneNumber}:`, error);
            throw error;
        }
    }

    /**
    * Check if a message can be sent (quota check)
    */
    async canSendMessage(companyId, businessPhoneNumber) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        try {
            const quota = await this.getQuota(companyId, businessPhoneNumber);

            if (!quota) {
                return {
                    canSend: false,
                    reason: 'QUOTA_NOT_INITIALIZED',
                    message: 'Quota not found. Please initialize quota first.',
                };
            }

            const remainingLimit = parseInt(quota.remaining_rate_limit);

            if (remainingLimit <= 0) {
                return {
                    canSend: false,
                    reason: 'QUOTA_EXCEEDED',
                    message: `Rate limit exceeded. Resets at: ${quota.window_reopen_time}`,
                    resetTime: quota.window_reopen_time,
                };
            }

            return {
                canSend: true,
                remaining: remainingLimit,
                resetTime: quota.window_reopen_time,
            };
        } catch (error) {
            console.error(`Error checking send permission for ${businessPhoneNumber}:`, error);
            return {
                canSend: false,
                reason: 'ERROR',
                message: error.message,
            };
        }
    }

    /**
    * Consume quota after successfully sending a message
    */
    async consumeQuota(companyId, businessPhoneNumber, count = 1) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        const path = `Companies/${companyId}/notifications_channels_quotas/whatsapp`;

        try {
            const quotaDoc = await this.getDocument(path);

            if (!quotaDoc || !quotaDoc[businessPhoneNumber]) {
                throw new Error(`Quota not found for business phone: ${businessPhoneNumber}`);
            }

            const phoneQuota = quotaDoc[businessPhoneNumber];
            const now = new Date();

            // Update quota consumption
            const newRemainingLimit = Math.max(0, parseInt(phoneQuota.remaining_rate_limit) - count);

            const updatedQuota = {
                ...phoneQuota,
                last_message_timestamp: now,
                remaining_rate_limit: newRemainingLimit.toString(),
            };

            // Update the full document
            const fullDoc = { ...quotaDoc };
            fullDoc[businessPhoneNumber] = updatedQuota;

            await this.setDoc({ path, data: fullDoc, merge: true });

            console.log(`📉 Quota consumed for ${businessPhoneNumber}: ${count} message(s). Remaining: ${newRemainingLimit}`);

            return {
                success: true,
                remaining: newRemainingLimit,
            };
        } catch (error) {
            console.error(`Error consuming quota for ${businessPhoneNumber}:`, error);
            throw error;
        }
    }

    /**
    * Update quota limits for a business phone number
    */
    async updateQuotaLimits(companyId, businessPhoneNumber, newTotalLimit) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        const path = `Companies/${companyId}/notifications_channels_quotas/whatsapp`;

        try {
            const quotaDoc = await this.getDocument(path);

            if (!quotaDoc || !quotaDoc[businessPhoneNumber]) {
                throw new Error(`Quota not found for business phone: ${businessPhoneNumber}`);
            }

            const phoneQuota = quotaDoc[businessPhoneNumber];
            const now = new Date();

            // Update limits
            const updatedQuota = {
                ...phoneQuota,
                total_rate_limit: newTotalLimit.toString(),
                remaining_rate_limit: newTotalLimit.toString(), // Reset remaining to new total
                window_reopen_time: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                last_message_timestamp: now,
            };

            // Update the full document
            const fullDoc = { ...quotaDoc };
            fullDoc[businessPhoneNumber] = updatedQuota;

            await this.setDoc({ path, data: fullDoc, merge: true });

            console.log(`📈 Quota limits updated for ${businessPhoneNumber}: ${newTotalLimit}`);

            return { success: true, data: updatedQuota };
        } catch (error) {
            console.error(`Error updating quota limits for ${businessPhoneNumber}:`, error);
            throw error;
        }
    }

    /**
    * Get quota status for all business phone numbers in a company
    */
    async getAllQuotaStatus(companyId) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        const path = `Companies/${companyId}/notifications_channels_quotas/whatsapp`;

        try {
            const quotaDoc = await this.getDocument(path);

            if (!quotaDoc) {
                return [];
            }

            const quotaStatuses = [];
            const now = new Date();

            // Process each phone number (excluding the 'id' field)
            for (const [phoneNumber, quotaData] of Object.entries(quotaDoc)) {
                if (phoneNumber === 'id') continue; // Skip the id field

                const windowReopenTime = new Date(quotaData.window_reopen_time);
                const hoursUntilReset = Math.max(0, Math.ceil((windowReopenTime - now) / (1000 * 60 * 60)));

                quotaStatuses.push({
                    phoneNumber,
                    remaining: parseInt(quotaData.remaining_rate_limit),
                    total: parseInt(quotaData.total_rate_limit),
                    lastMessageTime: quotaData.last_message_timestamp,
                    hoursUntilReset,
                    status: parseInt(quotaData.remaining_rate_limit) > 0 ? 'ACTIVE' : 'QUOTA_EXCEEDED',
                });
            }

            return quotaStatuses;
        } catch (error) {
            console.error('Error getting all quota status:', error);
            throw error;
        }
    }

    /**
    * Reset quota for a business phone number
    */
    async resetQuota(companyId, businessPhoneNumber) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        const path = `Companies/${companyId}/notifications_channels_quotas/whatsapp`;

        try {
            const quotaDoc = await this.getDocument(path);

            if (!quotaDoc || !quotaDoc[businessPhoneNumber]) {
                throw new Error(`Quota not found for business phone: ${businessPhoneNumber}`);
            }

            const phoneQuota = quotaDoc[businessPhoneNumber];
            const now = new Date();
            const resetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            const updatedQuota = {
                ...phoneQuota,
                remaining_rate_limit: phoneQuota.total_rate_limit,
                window_reopen_time: resetTime,
                last_message_timestamp: now,
            };

            // Update the full document
            const fullDoc = { ...quotaDoc };
            fullDoc[businessPhoneNumber] = updatedQuota;

            await this.setDoc({ path, data: fullDoc, merge: true });

            console.log(`🔄 Quota reset for ${businessPhoneNumber}`);

            return { success: true, data: updatedQuota };
        } catch (error) {
            console.error(`Error resetting quota for ${businessPhoneNumber}:`, error);
            throw error;
        }
    }

    async getAll(collectionPath) {
        await this.ensureInit();
        console.log(`collectionPath: ${collectionPath}`);
        const snapshot = await get(this.db, collectionPath);
        const fields = snapshot.fields || {};
        return Object.entries(fields);
    }

    async getAllPhoneNumbers() {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        try {
            const phoneData = await this.getAll('masterCollection/waba/waba/phoneNumbers');
            return phoneData;
        } catch (error) {
            console.error('Error fetching phone numbers:', error);
            return [];
        }
    }
    async getAllTemplates() {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        try {
            const templatesData = await this.getAll('masterCollection/waba/waba/templates');
            return templatesData;
        } catch (error) {
            console.error('Error fetching templates:', error);
            return [];
        }
    }

    async getLeadsByPhone(companyId, phone) {
        await this.ensureInit();
        if (!this.db) {
            throw new Error('Firestore not initialized');
        }

        try {
            const collectionPath = `Companies/${companyId}/leads`;
            console.log(`Querying collection: ${collectionPath}`);

            const mobileWhereClauses = [
                { field: 'leadState', op: '==', value: 'active' },
                { field: 'personalDetails.mobileNo', op: '==', value: phone },
            ];

            console.log(`Querying by mobileNo: ${phone}`);
            let mainSnapshot = await query(this.db, collectionPath, ...mobileWhereClauses);

            let leads = (mainSnapshot.documents || []).map((doc) => ({
                id: doc.id,
                ...this.unwrap(doc.fields),
            }));

            if (leads.length === 0) {
                console.log(`No leads found with mobileNo, trying phone field`);
                const phoneWhereClauses = [
                    { field: 'leadState', op: '==', value: 'active' },
                    { field: 'personalDetails.phone', op: '==', value: phone },
                ];

                const fallbackSnapshot = await query(this.db, collectionPath, ...phoneWhereClauses);
                leads = (fallbackSnapshot.documents || []).map((doc) => ({
                    id: doc.id,
                    ...this.unwrap(doc.fields),
                }));
            }

            if (leads.length === 0) {
                console.log(`No leads found with personalDetails prefix, trying direct fields`);
                const directMobileWhereClauses = [
                    { field: 'leadState', op: '==', value: 'active' },
                    { field: 'mobileNo', op: '==', value: phone },
                ];

                const directSnapshot = await query(this.db, collectionPath, ...directMobileWhereClauses);
                leads = (directSnapshot.documents || []).map((doc) => ({
                    id: doc.id,
                    ...this.unwrap(doc.fields),
                }));
            }

            console.log(`🔍 Found ${leads.length} lead(s) for phone: ${phone}`);
            return leads;
        } catch (error) {
            console.error(`Error fetching leads for phone ${phone}:`, error);
            return [];
        }
    }

    async getLeadAndAgentIdByPhone(companyId, phone) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');
        const normalizePhone = (p) => (p || '').replace(/\D/g, '');
        const inputPhone = normalizePhone(phone);

        try {
            console.log(`🔍 Searching for lead with phone: ${phone} in Companies/${companyId}/leads`);

            const allLeads = await this.getAllLeads(companyId);

            if (allLeads.length === 0) {
                console.warn(`No leads found for company ${companyId}`);
                return { leadId: null, agentId: null };
            }

            // Prepare phone number variations
            const phoneWithPlus = phone.startsWith('+') ? phone : `+${phone}`;
            const phoneWithoutPlus = phone.startsWith('+') ? phone.substring(1) : phone;

            // Filter leads by phone number with detailed logging
            const matchedLeads = [];

            for (const lead of allLeads) {
                const pd = lead.personalDetails || {};
                const mobileNo = pd.mobileNo || '';
                const phoneField = pd.phone || '';

                if (mobileNo === phone || mobileNo === phoneWithPlus || mobileNo === phoneWithoutPlus) {
                    matchedLeads.push(lead);
                    continue;
                }

                if (phoneField === phone || phoneField === phoneWithPlus || phoneField === phoneWithoutPlus) {
                    matchedLeads.push(lead);
                    continue;
                }

                const normalizedMobile = normalizePhone(mobileNo);
                const normalizedPhone = normalizePhone(phoneField);

                if (normalizedMobile === inputPhone) {
                    matchedLeads.push(lead);
                    continue;
                }

                if (normalizedPhone === inputPhone) {
                    matchedLeads.push(lead);
                    continue;
                }
            }

            if (matchedLeads.length === 0) {
                console.warn(`No lead found for phone: ${phone}`);
                return { leadId: null, agentId: null };
            }

            const lead = matchedLeads[0];
            const leadId = lead.id;

            const agentId = lead.owner?.id || null;

            return { leadId, agentId };
        } catch (error) {
            console.error(`Error fetching lead for phone ${phone}:`, error);
            return { leadId: null, agentId: null };
        }
    }

    async getMessageByMessageId(messageId) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        try {
            const message = await get(this.db, `messages/${messageId}`);
            return message;
        } catch (error) {
            console.error('Error fetching message:', error);
            return null;
        }
    }

    async getAllLeads(companyId) {
        await this.ensureInit();
        if (!this.db) throw new Error('Firestore not initialized');

        try {
            const pathFormats = [
                `Companies/${companyId}/leads`,
                `companies/${companyId}/leads`,
                `Companies/${companyId}/Leads`,
                `Companies/${companyId.toUpperCase()}/leads`,
                `Companies/${companyId.toLowerCase()}/leads`,
            ];

            let leads = [];

            try {
                for (const path of pathFormats) {
                    try {
                        const snapshot = await get(this.db, path);
                        if (snapshot && snapshot.documents && snapshot.documents.length > 0) {
                            leads = snapshot.documents.map((doc) => {
                                const docId = doc.name.split('/').pop();
                                const docData = this.unwrap(doc.fields || {});
                                return {
                                    id: docData.id || docId,
                                    ...docData,
                                };
                            });
                            break;
                        }
                    } catch (err) {
                        console.log(`Error with path ${path}:`, err.message);
                    }
                }
            } catch (err) {
                console.log('Error with get approach:', err.message);
            }

            if (leads.length === 0) {
                console.log(`Approach 2: Using query method`);
                for (const path of pathFormats) {
                    const parent = path.substring(0, path.lastIndexOf('/'));
                    const collectionId = path.substring(path.lastIndexOf('/') + 1);

                    try {
                        const snapshot = await query(this.db, {
                            parent: parent,
                            from: [{ collectionId: collectionId }],
                        });

                        if (snapshot && snapshot.documents && snapshot.documents.length > 0) {
                            leads = snapshot.documents.map((doc) => {
                                const docId = doc.name.split('/').pop();
                                const docData = this.unwrap(doc.fields || {});
                                return {
                                    id: docData.id || docId,
                                    ...docData,
                                };
                            });
                            break;
                        }
                    } catch (err) {
                        console.log(`Error with parent ${parent}, collection ${collectionId}:`, err.message);
                    }
                }
            }

            // If still no results, try listing collections to see what's available
            if (leads.length === 0) {
                try {
                    // Try to list collections under the company
                    for (const format of ['Companies', 'companies']) {
                        try {
                            const collections = await get(this.db, `${format}/${companyId}`);
                        } catch (err) { }
                    }
                } catch (err) {
                    console.log('Error listing collections:', err.message);
                }
            }

            return leads;
        } catch (error) {
            console.error(`Error in getAllLeads for company ${companyId}:`, error);
            return [];
        }
    }

    async getCollection(collectionPath) {
        await this.ensureInit();
        console.log(`Getting collection: ${collectionPath}`);
        try {
            const snapshot = await get(this.db, collectionPath);
            const fields = snapshot.fields || {};
            return this.unwrap(fields);
        } catch (error) {
            console.error(`Error getting collection ${collectionPath}:`, error);
            throw error;
        }
    }

    async getDocument(documentPath) {
        await this.ensureInit();
        console.log(`Getting document: ${documentPath}`);
        try {
            const snapshot = await get(this.db, documentPath);
            if (snapshot && snapshot.fields) {
                return this.unwrap(snapshot.fields);
            }
            return null;
        } catch (error) {
            console.error(`Error getting document ${documentPath}:`, error);
            return null;
        }
    }

    async setDoc({ path, data, merge = false }) {
        await this.ensureInit();
        console.log(`Setting document: ${path}`);
        try {
            await set(this.db, path, data, { merge });
            console.log(`Document set successfully: ${path}`);
            return { success: true };
        } catch (error) {
            console.error(`Error setting document ${path}:`, error);
            throw error;
        }
    }

    async updateDoc({ path, data, merge = true }) {
        await this.ensureInit();
        console.log(`Updating document: ${path}`);
        try {
            await update(this.db, path, data, { merge });
            console.log(`Document updated successfully: ${path}`);
            return { success: true };
        } catch (error) {
            console.error(`Error updating document ${path}:`, error);
            throw error;
        }
    }

    // Alias methods for backward compatibility
    async setDocument(documentPath, data) {
        return this.setDoc({ path: documentPath, data: data, merge: false });
    }

    async updateDocument(documentPath, data) {
        return this.updateDoc({ path: documentPath, data: data, merge: true });
    }
}