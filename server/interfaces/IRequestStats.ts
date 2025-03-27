export interface IRequestStats {
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  url: string;
  method: string;
  statusCode: number;
  referer: string;
  timestamp: Date;
  isApi: boolean;  // Flag to distinguish API requests from regular web requests
  updatedAt?: Date;
  createdAt?: Date;
}
