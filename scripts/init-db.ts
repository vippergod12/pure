import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL chưa được cấu hình. Hãy copy .env.example thành .env và điền giá trị.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const schemaPath = join(__dirname, '..', 'db', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf8');

  const stripped = schema
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Đang tạo bảng (${statements.length} statement)...`);
  for (const stmt of statements) {
    await pool.query(stmt);
  }
  await pool.end();
  console.log('Đã khởi tạo schema xong.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
