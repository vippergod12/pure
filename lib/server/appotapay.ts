import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { absoluteUrl } from '@/lib/seo/siteConfig';

export type AppotaPayPaymentMethod = 'ATM' | 'CC' | 'EWALLET' | 'ALL';

const PAYMENT_METHODS = new Set<AppotaPayPaymentMethod>(['ATM', 'CC', 'EWALLET', 'ALL']);
const DEFAULT_GATEWAY_URLS = {
  sandbox: 'https://gateway.dev.appotapay.com',
  production: 'https://gateway.appotapay.com',
};

export interface AppotaPayConfig {
  partnerCode: string;
  apiKey: string;
  secretKey: string;
  gatewayUrl: string;
  language: 'vi' | 'en';
  accountRefId: string | null;
  notifyUrl: string;
  redirectUrl: string;
}

export interface AppotaPayPaymentResponse {
  transaction?: {
    transactionId?: string;
    status?: string;
    errorCode?: number;
    errorMessage?: string;
    partnerCode?: string;
    orderAmount?: number;
    currency?: string;
    bankCode?: string;
    paymentMethod?: string;
    action?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  payment?: {
    url?: string;
    qrCode?: {
      url?: string;
      content?: string;
      expiry?: string;
    } | null;
    deepLinkUrl?: string;
  };
}

export interface AppotaPayCallbackData {
  transaction?: {
    transactionId?: string;
    appotapayTransId?: string;
    reconciliationId?: string;
    partnerCode?: string;
    status?: string;
    errorCode?: number;
    errorMessage?: string;
    message?: string;
    orderAmount?: number;
    amount?: number;
    discountAmount?: number;
    currency?: string;
    bankCode?: string;
    paymentMethod?: string;
    action?: string;
    orderId?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
  };
  partnerReference?: {
    order?: {
      id?: string;
      info?: string;
      extraData?: string;
    };
  };
  tokenResult?: unknown;
  [key: string]: unknown;
}

export class AppotaPayConfigError extends Error {
  constructor(message = 'AppotaPay chưa được cấu hình') {
    super(message);
    this.name = 'AppotaPayConfigError';
  }
}

export class AppotaPayGatewayError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'AppotaPayGatewayError';
    this.status = status;
    this.details = details;
  }
}

function normalizeGatewayUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

export function getAppotaPayConfig(): AppotaPayConfig {
  const environment = env('APPOTAPAY_ENV').toLowerCase() === 'production' ? 'production' : 'sandbox';
  const partnerCode = env('APPOTAPAY_PARTNER_CODE');
  const apiKey = env('APPOTAPAY_API_KEY');
  const secretKey = env('APPOTAPAY_SECRET_KEY');

  if (!partnerCode || !apiKey || !secretKey) {
    throw new AppotaPayConfigError(
      'Thiếu APPOTAPAY_PARTNER_CODE, APPOTAPAY_API_KEY hoặc APPOTAPAY_SECRET_KEY',
    );
  }

  const gatewayUrl = normalizeGatewayUrl(
    env('APPOTAPAY_GATEWAY_URL') || DEFAULT_GATEWAY_URLS[environment],
  );
  const language = env('APPOTAPAY_LANGUAGE').toLowerCase() === 'en' ? 'en' : 'vi';

  return {
    partnerCode,
    apiKey,
    secretKey,
    gatewayUrl,
    language,
    accountRefId: env('APPOTAPAY_ACCOUNT_REF_ID') || null,
    notifyUrl: env('APPOTAPAY_NOTIFY_URL') || absoluteUrl('/api/payments/appotapay/ipn'),
    redirectUrl: env('APPOTAPAY_REDIRECT_URL') || absoluteUrl('/thanh-toan/ket-qua'),
  };
}

export function normalizeAppotaPayPaymentMethod(value: unknown): AppotaPayPaymentMethod {
  const method = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return PAYMENT_METHODS.has(method as AppotaPayPaymentMethod)
    ? (method as AppotaPayPaymentMethod)
    : 'ALL';
}

export function createAppotaPayJwt(config = getAppotaPayConfig()): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: config.partnerCode,
      jti: `${config.apiKey}-${now}`,
      api_key: config.apiKey,
      exp: now + 5 * 60,
    },
    config.secretKey,
    {
      algorithm: 'HS256',
      header: {
        typ: 'JWT',
        alg: 'HS256',
        cty: 'appotapay-api;v=1',
      },
    },
  );
}

export async function createAppotaPayPayment(input: {
  orderCode: string;
  amount: number;
  orderInfo: string;
  extraData?: string;
  paymentMethod: AppotaPayPaymentMethod;
  bankCode?: string | null;
}): Promise<AppotaPayPaymentResponse> {
  const config = getAppotaPayConfig();
  const token = createAppotaPayJwt(config);
  const headers: Record<string, string> = {
    'X-APPOTAPAY-AUTH': token,
    'Content-Type': 'application/json',
    'X-Request-ID': crypto.randomUUID(),
    'X-Language': config.language,
  };
  if (config.accountRefId) headers['X-Account-Ref-ID'] = config.accountRefId;

  const body = {
    transaction: {
      amount: input.amount,
      currency: 'VND',
      ...(input.bankCode ? { bankCode: input.bankCode } : {}),
      paymentMethod: input.paymentMethod,
      action: 'PAY',
    },
    partnerReference: {
      order: {
        id: input.orderCode,
        info: input.orderInfo.slice(0, 150),
        extraData: (input.extraData ?? '').slice(0, 200),
      },
      notificationConfig: {
        notifyUrl: config.notifyUrl,
        redirectUrl: config.redirectUrl,
      },
    },
  };

  const res = await fetch(`${config.gatewayUrl}/api/v2/orders/payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message?: unknown }).message)
        : `AppotaPay trả HTTP ${res.status}`;
    throw new AppotaPayGatewayError(message, res.status, data);
  }

  const payload = data as AppotaPayPaymentResponse;
  if (!payload.payment?.url) {
    throw new AppotaPayGatewayError('AppotaPay không trả về payment.url', res.status, data);
  }

  return payload;
}

export function signAppotaPayData(data: string, secretKey = getAppotaPayConfig().secretKey): string {
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}

export function verifyAppotaPaySignature(data: string, signature: string): boolean {
  const expected = signAppotaPayData(data).toLowerCase();
  const actual = signature.trim().toLowerCase();
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(actual, 'utf8');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function decodeAppotaPayData(data: string): AppotaPayCallbackData {
  const json = Buffer.from(data, 'base64').toString('utf8');
  return JSON.parse(json) as AppotaPayCallbackData;
}

export function getAppotaPayOrderCode(payload: AppotaPayCallbackData): string | null {
  const fromPartner = payload.partnerReference?.order?.id;
  if (fromPartner) return String(fromPartner);
  const fromTransaction = payload.transaction?.orderId;
  return fromTransaction ? String(fromTransaction) : null;
}

export function getAppotaPayTransactionId(payload: AppotaPayCallbackData): string | null {
  const value =
    payload.transaction?.transactionId ||
    payload.transaction?.appotapayTransId ||
    payload.transaction?.reconciliationId;
  return value ? String(value) : null;
}

export function mapAppotaPayStatus(status: unknown): 'pending' | 'processing' | 'paid' | 'failed' {
  const value = typeof status === 'string' ? status.toLowerCase().trim() : '';
  if (value === 'success') return 'paid';
  if (value === 'processing') return 'processing';
  if (value === 'pending') return 'pending';
  return 'failed';
}
