import type { KiotVietClient } from '../client';
import type { LocationListResponse } from '../types/location';

export class LocationHandler {
  constructor(private client: KiotVietClient) {}

  /**
   * List all locations (khu vực địa lý)
   * Documentation: GET /locations (2.21)
   */
  async list(): Promise<LocationListResponse> {
    const response = await this.client.apiClient.get<LocationListResponse>('/locations');
    return response.data;
  }
}
