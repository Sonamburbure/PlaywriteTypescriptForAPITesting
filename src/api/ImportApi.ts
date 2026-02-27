import { APIRequestContext, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { BASE_API_URL } from '../utils/constants.js';

export class ImportApi {
  constructor(private apiContext: APIRequestContext) {}

  async importFile(
    tenantPath: string,
    logonAs: string,
    token: string,
    fileName: string,
    importType: 'customer' | 'supplier' | 'contact' | 'venue' | 'comment'
  ) {
    const filePath = path.resolve('test-data', fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/${importType}import`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        multipart: {
          file: fs.createReadStream(filePath),
        },
      }
    );

    console.log(`🔹 ${importType.toUpperCase()} Import Status:`, response.status());

    expect(response.ok()).toBeTruthy();

    return await response.json();
  }
}