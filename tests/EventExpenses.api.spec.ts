import{test,expect,request}from '@playwright/test' ;
import { EventExpenseAPI } from '../src/api/EventExpensesApi.js';
   test('API only: Create Event Expense', async () => {
  const apiContext = await request.newContext();
  const eventExpenseAPI = new EventExpenseAPI(apiContext);
const Expensesname=[
    'Food and Beverage',
    'Venue Rental',
    'Entertainment',
    'Decorations',
    'Transportation',
    'Staffing',
    'Marketing and Promotion',
    'Miscellaneous',
'Catering Service',
  'Decoration Arrangement',
  'Logistics Planning',
  'Entertainment Management',
  'Staff Coordination',
  'Equipment Handling'
]
const expensesname=Expensesname[Math.floor(Math.random() * Expensesname.length)];

 const payload = {
  eventforecastedcost_num: "00000000000",
  custom: {
    eventforecastedcost_name: expensesname, // dynamic name
    related_event: 254,
    eventforecastedcost_category: 662,
    eventforecastedcost_type: 664,
    eventforecastedcost_status: 698,
    eventforecastedcost_description: `Cost allocated for ${expensesname.toLowerCase()} activities`,
    eventforecastedcost_amount: "50000.00",
    ownerid: 18,
    createtime: "2026-04-15 16:43:33",
    modifiedtime: "2026-04-15 16:43:33",
    assign_to: "Sonam Burbure"
  },
  source: "web",
  status: "1"
};
const responseBody = await eventExpenseAPI.createEventExpense(payload);

  console.log('📩 Response:', responseBody);
 expect(responseBody).toBeTruthy();
});