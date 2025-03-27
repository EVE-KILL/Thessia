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
  updatedAt?: Date;
  createdAt?: Date;
}
