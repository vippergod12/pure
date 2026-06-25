import { sql } from '@/lib/server/db';
import {
  decodeAppotaPayData,
  getAppotaPayOrderCode,
  getAppotaPayTransactionId,
  mapAppotaPayStatus,
  verifyAppotaPaySignature,
  type AppotaPayCallbackData,
} from '@/lib/server/appotapay';
import {
  getMomoConfig,
  mapMomoPaymentStatus,
  verifyMomoResultSignature,
  type MomoPaymentResultPayload,
} from '@/lib/server/momo';

export interface AppotaPayCallbackResult {
  ok: boolean;
  orderCode: string | null;
  status: string | null;
  reason?: string;
  payload?: AppotaPayCallbackData;
}

export interface MomoCallbackResult {
  ok: boolean;
  orderCode: string | null;
  status: string | null;
  reason?: string;
  payload?: MomoPaymentResultPayload;
}

type OrderForPayment = {
  id: number;
  amount: number | string;
};

function callbackAmount(payload: AppotaPayCallbackData): number | null {
  const raw = payload.transaction?.orderAmount ?? payload.transaction?.amount;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.round(value) : null;
}

export async function applyAppotaPayCallback(input: {
  data: string | null;
  signature: string | null;
}): Promise<AppotaPayCallbackResult> {
  if (!input.data || !input.signature) {
    return { ok: false, orderCode: null, status: null, reason: 'Thiếu data hoặc signature' };
  }
  if (!verifyAppotaPaySignature(input.data, input.signature)) {
    return { ok: false, orderCode: null, status: null, reason: 'Signature không hợp lệ' };
  }

  let payload: AppotaPayCallbackData;
  try {
    payload = decodeAppotaPayData(input.data);
  } catch {
    return { ok: false, orderCode: null, status: null, reason: 'Data không đọc được' };
  }

  const orderCode = getAppotaPayOrderCode(payload);
  if (!orderCode) {
    return { ok: false, orderCode: null, status: null, reason: 'Không tìm thấy mã đơn hàng', payload };
  }

  const rows = (await sql`
    SELECT id, amount
    FROM orders
    WHERE order_code = ${orderCode}
    LIMIT 1
  `) as OrderForPayment[];
  const order = rows[0];
  if (!order) {
    return { ok: false, orderCode, status: null, reason: 'Đơn hàng không tồn tại', payload };
  }

  const appotaStatus = payload.transaction?.status ?? null;
  const nextStatus = mapAppotaPayStatus(appotaStatus);
  const amount = callbackAmount(payload);
  const expectedAmount = Math.round(Number(order.amount));
  const amountMatches = nextStatus !== 'paid' || amount === expectedAmount;
  const status = amountMatches ? nextStatus : 'amount_mismatch';
  const transactionId = getAppotaPayTransactionId(payload);
  const errorMessage = payload.transaction?.errorMessage ?? payload.transaction?.message ?? null;

  await sql`
    UPDATE orders
    SET status = ${status},
        provider_transaction_id = COALESCE(${transactionId}, provider_transaction_id),
        appotapay_status = ${appotaStatus},
        appotapay_error_code = ${payload.transaction?.errorCode ?? null},
        appotapay_error_message = ${errorMessage},
        appotapay_payload = ${JSON.stringify(payload)}::jsonb,
        paid_at = CASE
          WHEN ${status} = 'paid' AND paid_at IS NULL THEN NOW()
          ELSE paid_at
        END,
        updated_at = NOW()
    WHERE id = ${order.id}
  `;

  if (!amountMatches) {
    return {
      ok: false,
      orderCode,
      status,
      reason: 'Số tiền AppotaPay trả về không khớp đơn hàng',
      payload,
    };
  }

  return { ok: true, orderCode, status, payload };
}

function momoAmount(payload: MomoPaymentResultPayload): number | null {
  const value = Number(payload.amount);
  return Number.isFinite(value) ? Math.round(value) : null;
}

export async function applyMomoCallback(
  payload: MomoPaymentResultPayload,
): Promise<MomoCallbackResult> {
  const config = getMomoConfig();

  if (!verifyMomoResultSignature(payload)) {
    return { ok: false, orderCode: null, status: null, reason: 'Signature MoMo khong hop le', payload };
  }

  if (payload.partnerCode !== config.partnerCode) {
    return { ok: false, orderCode: null, status: null, reason: 'PartnerCode MoMo khong khop', payload };
  }

  const orderCode = typeof payload.orderId === 'string' ? payload.orderId : null;
  if (!orderCode) {
    return { ok: false, orderCode: null, status: null, reason: 'Khong tim thay ma don hang', payload };
  }

  const rows = (await sql`
    SELECT id, amount
    FROM orders
    WHERE order_code = ${orderCode}
    LIMIT 1
  `) as OrderForPayment[];
  const order = rows[0];
  if (!order) {
    return { ok: false, orderCode, status: null, reason: 'Don hang khong ton tai', payload };
  }

  const nextStatus = mapMomoPaymentStatus(payload.resultCode);
  const amount = momoAmount(payload);
  const expectedAmount = Math.round(Number(order.amount));
  const amountMatches = nextStatus !== 'paid' || amount === expectedAmount;
  const status = amountMatches ? nextStatus : 'amount_mismatch';
  const transactionId = payload.transId == null ? null : String(payload.transId);
  const resultCode = Number(payload.resultCode);
  const safeResultCode = Number.isFinite(resultCode) ? resultCode : null;

  await sql`
    UPDATE orders
    SET status = ${status},
        provider_transaction_id = COALESCE(${transactionId}, provider_transaction_id),
        momo_result_code = ${safeResultCode},
        momo_message = ${payload.message ?? null},
        momo_pay_type = ${payload.payType ?? null},
        momo_request_id = ${payload.requestId ?? null},
        momo_payload = ${JSON.stringify(payload)}::jsonb,
        paid_at = CASE
          WHEN ${status} = 'paid' AND paid_at IS NULL THEN NOW()
          ELSE paid_at
        END,
        updated_at = NOW()
    WHERE id = ${order.id}
  `;

  if (!amountMatches) {
    return {
      ok: false,
      orderCode,
      status,
      reason: 'So tien MoMo tra ve khong khop don hang',
      payload,
    };
  }

  return { ok: true, orderCode, status, payload };
}
