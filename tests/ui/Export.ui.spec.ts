import { test } from '@playwright/test';
import { ExportPage } from '../../src/pages/ExportPage.js';

test('Sequential export of modules', async ({ page }, testInfo) => {
  const exportPage = new ExportPage(page);

  // Accounts
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/accounts', 'Export Account');

  // Suppliers
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/suppliers', 'Export Supplier');

  // Contacts
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/contacts', 'Export Contact');

  // Venues
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/venue', 'Export Venue');

  // Comments
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/comment', 'Export Comment');
//opportunities
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/opportunities', 'Export Opportunity');
//salestarget
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/salestarget', 'Export Sales Target');
//event
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/event', 'Export Event');
//supplierorders
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/supplierorders', 'Export Supplier Order');
//supplierorderreceipt
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/supplierorderreceipt', 'Export Supplier Order Receipt');
//supplierorderreturn
  await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/supplierorderreturn', 'Export Supplier Order Return');
//shipmentrequest
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/shipmentrequest', 'Export Shipment Request');
//shipmentreceipt
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/shipmentreceipt', 'Export Shipment Receipt');
//invoice
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/invoice', 'Export Invoices');
//warehouse
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/warehouse', 'Export Warehouse');
//currentstock
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/currentstock', 'Export Current Stocks');
//stockmovement
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/stockmovement', 'Export Stock Movements');
//stocktake
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/stocktake', 'Export Stock Take');
//stocktakeproduct
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/stocktakeproduct', 'Export Stock Take Product');
//seriallotcontrol
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/seriallotcontrol', 'Export Serial Lot Control');
//conversion  
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/conversion', 'Export Conversion');
//conversiondetail 
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/conversiondetail', 'Export Conversion Detail');
//employee
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/employee', 'Export Employee');
//employeedocument
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/employeedocument', 'Export Employee Document');
//employeeavailabilit
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/employeeavailability', 'Export Employee Availability');
//employeerole
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/employeerole', 'Export Employee Role');
//employeetraining
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/employeetraining', 'Export Employee Training');
//training
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/training', 'Export Training Catalogs ');
//trainingtopic
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/trainingtopic', 'Export Training Content ');
//eventnotification
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventnotification', 'Export Event Notification');
//eventtask 
/*await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventtask', 'Export Event Task');
//eventchecklist
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventchecklist', 'Export Event Checklist'); 
//eventchecklistresponse
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventchecklistresponse', 'Export Event Checklist Detail');
//eventforecastedcost
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventforecastedcost', 'Export Event Expense ');
//eventforecastedsale
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventforecastedsale', 'Export  Event Sale ');
//eventdeliverycollection
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventdeliverycollection', 'Export Event Delivery Collection');
//eventdeliverycollectionbar
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventdeliverycollectionbar', 'Export Event Delivery Collection Bar');
//eventdeliverystaff
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventdeliverystaff', 'Export Event Delivery Staff');
//eventbarcard
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventbarcard', 'Export Event Bar Card');
//eventbarcarddate
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventbarcarddate', 'Export Event Bar Card Date');
//eventbarcardmenu
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventbarcardmenu', 'Export Event Bar Card Menu');
//eventpreplanning
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventpreplanning', 'Export Event Pre planning');
//eventproductpreplanning
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventproductpreplanning', 'Export Event Product Pre planning');
//eventequipmentpreplanning
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventequipmentpreplanning', 'Export Event Equipment Pre planning');
//eventstaffpreplanning
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventstaffpreplanning', 'Export Event Staff Pre planning');
//eventmanualoverride
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventmanualoverride', 'Export Event Manual Override');
//eventstaffplanning
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventstaffplanning', 'Export Event Staff Planning');
//equipmentcount
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/equipmentcount', 'Export Equipment Count');
//productconsumption
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/productconsumption', 'Export Product Consumption');
//eventattendance
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventattendance', 'Export Event Attendance');
//reports
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/report', 'Export Reports');
//package
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/package', 'Export Package');
//packageitembar
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/packageitembar', 'Export Package Item Bar');
//packageitem
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/packageitem', 'Export Package Item');
//segment1
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/segment1', 'Export Segment 1');
//segment1tuom
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/segment1tuom', 'Export Segment 1 TUOM');
//segment2
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/segment2', 'Export Segment 2');
//unitofmeasure
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/unitofmeasure', 'Export Unit of Measure');
//unitofmeasureconversion
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/unitofmeasureconversion', 'Export Unit of Measure Conversion');
//steprate
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/steprate', 'Export Step Rate');
//stepratedetail
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/stepratedetail', 'Export Step Rate Detail');
//inventory
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/inventory', 'Export Product');
//productcosting
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/productcosting', 'Export Product Costing');
//equipmentvendor
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/equipmentvendor', 'Export Equipment Vendor');
//equipment
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/equipment', 'Export Equipments');
//equipmentcosting
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/equipmentcosting', 'Export Equipment Costing');
//equipmentvendor
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/equipmentvendor', 'Export Equipment Vendor');
//equipmentbundle
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/equipmentbundle', 'Export Equipment Bundle');
//stafftype
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/stafftype', 'Export Staff Type');
//staffcosting
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/staffcosting', 'Export Staff Costing');
//staffvendor
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/staffvendor', 'Export Staff Vendor');
//staffvendorprice
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/staffvendorprice', 'Export Staff Vendor Price');
//taskmaster
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/taskmaster', 'Export Task Master');
//checklistmaster
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/checklistmaster', 'Export Checklist Master');
//checklistmasterquestion
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/checklistmasterquestion', 'Export Checklist Master Detail');
//eventcheckliststafftype
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventcheckliststafftype', 'Export Checklist Staff Type');
//venuebar
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/venuebar', 'Export Venue Bar');
//barsetup
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/barsetup', 'Export Bar Setup');
//barsetupproduct
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/barsetupproduct', 'Export Bar Setup Product');
//barsetupequipment
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/barsetupequipment', 'Export Bar Setup Equipment');
//barsetupstaff
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/barsetupstaff', 'Export Bar Setup Staffing');
//itemserved
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/itemserved', 'Export Item Served');
//itemproduct
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/itemproduct', 'Export Item Product');
//itemequipment
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/itemequipment', 'Export Item Equipment');
//itemstaff
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/itemstaff', 'Export Item Staff');
//eventmenu
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventmenu', 'Export Event Menu');
//eventmenuitem
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventmenuitem', 'Export Event Menu Items');
//eventemployeefiles
await exportPage.exportModuleByUrl(testInfo, 'https://web.automateevents.com/#/home/eventemployeefiles', 'Export Event Employee Files');*/

});