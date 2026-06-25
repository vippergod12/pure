import crypto from 'node:crypto';
import { absoluteUrl } from '@/lib/seo/siteConfig';

const DEFAULT_GATEWAY_URLS = {
  sandbox: 'https://test-payment.momo.vn',
  production: 'https://payment.momo.vn',
};

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  gatewayUrl: string;
  lang: 'vi' | 'en';
  ipnUrl: string;
  redirectUrl: string;
  storeName: string | null;
  storeId: string | null;
}

export interface MomoCreatePaymentResponse {
  partnerCode?: string;
  orderId?: string;
  requestId?: string;
  amount?: number;
  responseTime?: number;
  message?: string;
  resultCode?: number;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  deeplinkMiniApp?: string;
  signature?: string;
  userFee?: number;
  [key: string]: unknown;
}

export interface MomoPaymentResultPayload {
  partnerCode?: string;
  orderId?: string;
  requestId?: string;
  amount?: number | string;
  partnerUserId?: string;
  storeId?: string;
  orderInfo?: string;
  orderType?: string;
  transId?: number | string;
  resultCode?: number | string;
  message?: string;
  payType?: string;
  responseTime?: number | string;
  extraData?: string;
  signature?: string;
  paymentOption?: string;
  userFee?: number | string;
  promotionInfo?: unknown;
  [key: string]: unknown;
}

export class MomoConfigError extends Error {
  constructor(message = 'MoMo chua duoc cau hinh') {
    super(message);
    this.name = 'MomoConfigError';
  }
}

export class MomoGatewayError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'MomoGatewayError';
    this.status = status;
    this.details = details;
  }
}

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function normalizeGatewayUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function sign(rawSignature: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
}

function timingSafeEqualHex(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected.toLowerCase(), 'utf8');
  const actualBuffer = Buffer.from(actual.toLowerCase(), 'utf8');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function payloadValue(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

export function getMomoConfig(): MomoConfig {
  const environment = env('MOMO_ENV').toLowerCase() === 'production' ? 'production' : 'sandbox';
  const partnerCode = env('MOMO_PARTNER_CODE');
  const accessKey = env('MOMO_ACCESS_KEY');
  const secretKey = env('MOMO_SECRET_KEY');

  if (!partnerCode || !accessKey || !secretKey) {
    throw new MomoConfigError('Thieu MOMO_PARTNER_CODE, MOMO_ACCESS_KEY hoac MOMO_SECRET_KEY');
  }

  const gatewayUrl = normalizeGatewayUrl(env('MOMO_GATEWAY_URL') || DEFAULT_GATEWAY_URLS[environment]);

  return {
    partnerCode,
    accessKey,
    secretKey,
    gatewayUrl,
    lang: env('MOMO_LANG').toLowerCase() === 'en' ? 'en' : 'vi',
    ipnUrl: env('MOMO_IPN_URL') || absoluteUrl('/api/payments/momo/ipn'),
    redirectUrl: env('MOMO_REDIRECT_URL') || absoluteUrl('/api/payments/momo/return'),
    storeName: env('MOMO_STORE_NAME') || null,
    storeId: env('MOMO_STORE_ID') || null,
  };
}

export function createMomoRequestId(orderCode: string): string {
  return `${orderCode}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export function encodeMomoExtraData(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
}

export function signMomoCreateRequest(input: {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
  secretKey: string;
}): string {
  const rawSignature =
    `accessKey=${input.accessKey}` +
    `&amount=${input.amount}` +
    `&extraData=${input.extraData}` +
    `&ipnUrl=${input.ipnUrl}` +
    `&orderId=${input.orderId}` +
    `&orderInfo=${input.orderInfo}` +
    `&partnerCode=${input.partnerCode}` +
    `&redirectUrl=${input.redirectUrl}` +
    `&requestId=${input.requestId}` +
    `&requestType=${input.requestType}`;
  return sign(rawSignature, input.secretKey);
}

export function signMomoResultPayload(
  payload: MomoPaymentResultPayload,
  config = getMomoConfig(),
): string {
  const rawSignature =
    `accessKey=${config.accessKey}` +
    `&amount=${payloadValue(payload.amount)}` +
    `&extraData=${payloadValue(payload.extraData)}` +
    `&message=${payloadValue(payload.message)}` +
    `&orderId=${payloadValue(payload.orderId)}` +
    `&orderInfo=${payloadValue(payload.orderInfo)}` +
    `&orderType=${payloadValue(payload.orderType)}` +
    `&partnerCode=${payloadValue(payload.partnerCode)}` +
    `&payType=${payloadValue(payload.payType)}` +
    `&requestId=${payloadValue(payload.requestId)}` +
    `&responseTime=${payloadValue(payload.responseTime)}` +
    `&resultCode=${payloadValue(payload.resultCode)}` +
    `&transId=${payloadValue(payload.transId)}`;
  return sign(rawSignature, config.secretKey);
}

export function verifyMomoResultSignature(payload: MomoPaymentResultPayload): boolean {
  const signature = typeof payload.signature === 'string' ? payload.signature.trim() : '';
  if (!signature) return false;
  const expected = signMomoResultPayload(payload);
  return timingSafeEqualHex(expected, signature);
}

export async function createMomoPayment(input: {
  orderCode: string;
  amount: number;
  orderInfo: string;
  extraData?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
}): Promise<MomoCreatePaymentResponse> {
  const config = getMomoConfig();
  const requestType = 'captureWallet';
  const requestId = createMomoRequestId(input.orderCode);
  const extraData = input.extraData ?? '';
  const orderInfo = input.orderInfo.slice(0, 255);
  const signature = signMomoCreateRequest({
    accessKey: config.accessKey,
    amount: input.amount,
    extraData,
    ipnUrl: config.ipnUrl,
    orderId: input.orderCode,
    orderInfo,
    partnerCode: config.partnerCode,
    redirectUrl: config.redirectUrl,
    requestId,
    requestType,
    secretKey: config.secretKey,
  });

  const body = {
    partnerCode: config.partnerCode,
    ...(config.storeName ? { storeName: config.storeName } : {}),
    ...(config.storeId ? { storeId: config.storeId } : {}),
    requestId,
    amount: input.amount,
    orderId: input.orderCode,
    orderInfo,
    redirectUrl: config.redirectUrl,
    ipnUrl: config.ipnUrl,
    requestType,
    extraData,
    autoCapture: true,
    lang: config.lang,
    signature,
    userInfo: {
      name: input.customerName ?? '',
      phoneNumber: input.customerPhone ?? '',
      email: input.customerEmail ?? '',
    },
  };

  const res = await fetch(`${config.gatewayUrl}/v2/gateway/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
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
        : `MoMo tra HTTP ${res.status}`;
    throw new MomoGatewayError(message, res.status, data);
  }

  const payload = data as MomoCreatePaymentResponse;
  if (payload.resultCode !== 0) {
    throw new MomoGatewayError(payload.message || 'MoMo tu choi tao thanh toan', res.status, data);
  }
  if (!payload.payUrl && !payload.deeplink) {
    throw new MomoGatewayError('MoMo khong tra ve payUrl/deeplink', res.status, data);
  }

  return payload;
}

export function mapMomoPaymentStatus(resultCode: unknown): 'pending' | 'processing' | 'paid' | 'failed' {
  const code = Number(resultCode);
  if (code === 0) return 'paid';
  if (code === 1000 || code === 7000 || code === 7002 || code === 9000) return 'processing';
  return 'failed';
}
