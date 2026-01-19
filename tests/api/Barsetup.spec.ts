import { test } from '@playwright/test';

import { BarSetupApi } from '../../src/apiPages/BarsetupApi';
import { BarSetupProductApi } from '../../src/apiPages/BarsetupproductApi';
import { BarSetupEquipmentApi } from '../../src/apiPages/BarsetupEquipmentApi';
import { BarSetupStaffApi } from '../../src/apiPages/BarsetupSaffApi';

test('Create BarSetup and add Product, Equipment and Staff', async ({ request }) => {
  const barSetupApi = new BarSetupApi(request);
  const productApi = new BarSetupProductApi(request);
  const equipmentApi = new BarSetupEquipmentApi(request);
  const staffApi = new BarSetupStaffApi(request);

  const barsetupId = await barSetupApi.createBarSetup({
    barsetup_num: '00000000000',
    custom: {
      barsetup_name: 'API',
      barsetup_category: 627,
      barsetup_sort_category: 'sort',
      ownerid: 18,
    },
    source: 'web',
    status: '1',
  });

  await productApi.createProduct(barsetupId);
  await equipmentApi.createEquipment(barsetupId);
  await staffApi.createStaff(barsetupId);
});
