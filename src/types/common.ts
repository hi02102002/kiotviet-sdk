// Common response structure for lists
export interface KiotVietListResponse<T> {
  total: number;
  pageSize?: number;
  currentItem?: number;
  data: T[];
  timestamp?: string;
  removedIds?: number[];
}

// Simple message response returned by write endpoints (batch add/update, activate, ...)
export interface KiotVietMessageResponse {
  message: string;
}

// KiotViet Error structure
export interface KiotVietErrorStatus {
  errorCode: string;
  message: string;
}

export interface KiotVietErrorResponse {
  responseStatus: KiotVietErrorStatus;
}

// Config for the client
export interface KiotVietClientConfig {
  clientId: string;
  clientSecret: string;
  retailerName: string;
  baseUrl?: string;
  tokenUrl?: string;
  apiVersion?: string;
  timeout?: number;
  scope?: string;
}

// Structure of the token response from /connect/token
export interface KiotVietTokenResponse {
  access_token: string;
  expires_in: number; // seconds
  token_type: 'Bearer';
}
