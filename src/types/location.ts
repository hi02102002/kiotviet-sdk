import type { KiotVietListResponse } from './common';

// Location (khu vực địa lý), GET /locations
export interface Location {
  id: number;
  name: string;
  normalName: string;
}

export interface LocationListResponse extends KiotVietListResponse<Location> {}
