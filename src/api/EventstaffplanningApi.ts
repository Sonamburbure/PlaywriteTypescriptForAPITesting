import { getAuthToken,getTenantPath,getLogonAs } from "../utils/tokenStore.js";
import { BASE_API_URL } from "../utils/constants.js";
import type { APIRequestContext } from "@playwright/test";
export class EventStaffPlanningApi{
    private apiContext:APIRequestContext;
    constructor(apiContext:APIRequestContext){
        this.apiContext = apiContext;
    }
    async createEventStaffPlanning(payload:any){
        const token = getAuthToken();
        const tenantPath = getTenantPath();
        const logonAs = getLogonAs();
        if (!token || !tenantPath || !logonAs) {
          throw new Error('❌ Missing authentication token / tenant / logonAs');
        }
        const response = await this.apiContext.post(
            `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventstaffplanning`,
           
            {headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-automate-secret': process.env.AUTOMATE_SECRET!  // ✅ IMPORTANT}
            },
            data: payload,
        });
        const responseBody = await response.json();
        if (!response.ok()) {
            throw new Error(`❌ API request failed with status ${response.status()}`);
        }
        return responseBody;
    }
}