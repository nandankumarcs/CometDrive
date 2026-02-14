export interface SmsModuleOptions {
  isGlobal?: boolean;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  previewMode?: boolean;
}

export interface SmsModuleAsyncOptions {
  isGlobal?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => Promise<SmsModuleOptions> | SmsModuleOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];
}

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
}

export interface SmsResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  previewData?: {
    to: string;
    from: string;
    body: string;
    sentAt: string;
  };
  error?: string;
}
