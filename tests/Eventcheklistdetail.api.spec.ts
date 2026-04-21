import{test,expect,request}from '@playwright/test' ;
import { EventChecklistdetailApi } from '../src/api/EventcheklistdetailApi.js';
  test('API only: Create Event Checklist Detail', async () => {
  const apiContext = await request.newContext();
  const eventChecklistdetailApi = new EventChecklistdetailApi(apiContext);
const payload = {
    "eventchecklistresponse_num": "00000000000",
    "custom": {
        "eventchecklistresponse_name": "Are all required staff members present and assigned roles?/30march event/Checklist 1",
        "related_checklistmasterquestion": 50,
        "related_eventchecklist": 3,
        "eventchecklistresponse_response": "response",
        "ownerid": 18,
        "createtime": "2026-04-14 17:59:19",
        "modifiedtime": "2026-04-14 17:59:19",
        "assign_to": "Sonam Burbure"
    },
    "source": "web",
    "status": "1"
}
const responseBody = await eventChecklistdetailApi.createEventChecklist(payload);

  console.log('📩 Response:', responseBody);
 expect(responseBody).toBeTruthy();
});