import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { noStoreHeaders, unauthorized } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauthorized();

  const rows = await sql`
    SELECT id, order_code, product_id, product_snapshot, selected_color, quantity,
           amount, currency, customer_name, customer_phone, customer_email,
           customer_note, payment_provider, payment_method, bank_code, payment_url,
           provider_transaction_id, status, appotapay_status, appotapay_error_code,
           appotapay_error_message, appotapay_payload, momo_result_code, momo_message,
           momo_pay_type, momo_request_id, momo_payload, admin_note, paid_at,
           created_at, updated_at
    FROM orders
    ORDER BY created_at DESC
  `;

  return NextResponse.json(rows, {
    headers: {
      ...noStoreHeaders(),
      'X-Admin-Orders-Count': String(rows.length),
      'X-Admin-Orders-Route-Version': 'admin-orders-all-20260625',
    },
  });
}
