import{test,expect,request}from '@playwright/test' ;
import { EventChecklistApi } from '../src/api/EventcheklistApi.js';
   
test('API only: Create Event Checklist', async () => {

  const apiContext = await request.newContext();
  const eventChecklistApi = new EventChecklistApi(apiContext);

  const payload = {
    
    "eventchecklist_num": "00000000000",
    "custom": {
        "eventchecklist_name": "Event 08_2026/Operational Readiness Verification",
        "related_event": 309,
        "related_checklistmaster": 9,
        "eventchecklist_type": "801",
        "eventchecklist_duedatetime": "2026-04-10 18:25",
        "eventchecklist_status": 819,
        "eventchecklist_completedon": "2026-04-11 18:26",
        "ownerid": 18,
        "createtime": "2026-04-10 18:26:35",
        "modifiedtime": "2026-04-10 18:26:35",
        "assign_to": "Sonam Burbure"
    },
    "source": "web",
    "status": "1"
};
  const responseBody = await eventChecklistApi.createEventChecklist(payload);

  console.log('📩 Response:', responseBody);

  expect(responseBody).toBeTruthy();

});