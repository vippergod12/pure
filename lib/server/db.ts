import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Lazy-init Neon SQL client.
 *
 * Trong môi trường build (vd Vercel collecting page data, hoặc `next build`
 * khi chưa có .env), việc gọi `neon('')` sẽ throw ngay khi import module.
 * Để build không phụ thuộc DATABASE_URL, ta khởi tạo trễ — chỉ tạo client
 * khi tag template thực sự được gọi (lúc đó là runtime, có env đầy đủ).
 *
 * Production runtime (Vercel functions / `next start`): luôn phải có
 * DATABASE_URL — nếu thiếu sẽ throw rõ ràng.
 */

let _client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (_client) return _client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[shop] DATABASE_URL chưa được cấu hình. Hãy thêm vào .env hoặc Environment Variables trên Vercel.',
    );
  }
  _client = neon(url);
  return _client;
}

/**
 * `sql` proxy — sử dụng giống `sql` của @neondatabase/serverless:
 *   await sql`SELECT * FROM products WHERE id = ${id}`
 *
 * Cũng forward tất cả thuộc tính (transaction, query…) qua client thật.
 */
export const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args) {
    const client = getClient();
    return Reflect.apply(client as unknown as Function, undefined, args);
  },
  get(_target, prop, _receiver) {
    const client = getClient();
    return Reflect.get(client as object, prop);
  },
}) as NeonQueryFunction<false, false>;
