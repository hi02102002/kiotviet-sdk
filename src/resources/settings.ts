import type { KiotVietClient } from '../client';
import type { Setting } from '../types/setting';

export class SettingsHandler {
  constructor(private client: KiotVietClient) {}

  /**
   * Get settings
   * @returns Current settings
   */
  async get(): Promise<Setting> {
    const response = await this.client.apiClient.get<{ data: Setting }>('/settings');
    return response.data.data;
  }
}
