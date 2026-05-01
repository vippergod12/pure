import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL chưa được cấu hình.');
    process.exit(1);
  }

  const sql = neon(url);

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  await sql`
    INSERT INTO admins (username, password_hash)
    VALUES (${username}, ${passwordHash})
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `;
  console.log(`Đã tạo/cập nhật admin: ${username}`);

  // Danh mục cho shop trang sức & phụ kiện đá quý "PURE"
  const categories: { name: string; slug: string; image_url: string; description: string }[] = [
    {
      name: 'Nhẫn đá quý',
      slug: 'nhan-da-quy',
      image_url:
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&auto=format&fit=crop',
      description: 'Nhẫn ngọc lục bảo, ruby, sapphire, kim cương — bạc 925 & vàng 18K',
    },
    {
      name: 'Vòng cổ',
      slug: 'vong-co',
      image_url:
        'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=900&auto=format&fit=crop',
      description: 'Vòng cổ đá quý, kiềng cổ vàng & bạc tinh xảo',
    },
    {
      name: 'Mặt dây chuyền',
      slug: 'mat-day-chuyen',
      image_url:
        'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=900&auto=format&fit=crop',
      description: 'Mặt dây chuyền đá quý tự nhiên có giấy kiểm định',
    },
    {
      name: 'Hoa tai',
      slug: 'hoa-tai',
      image_url:
        'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=900&auto=format&fit=crop',
      description: 'Hoa tai ngọc trai, kim cương, đá quý các loại',
    },
    {
      name: 'Vòng tay',
      slug: 'vong-tay',
      image_url:
        'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900&auto=format&fit=crop',
      description: 'Vòng tay đá quý, lắc tay bạc 925 & vàng 18K',
    },
    {
      name: 'Bộ trang sức',
      slug: 'bo-trang-suc',
      image_url:
        'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&auto=format&fit=crop',
      description: 'Bộ sưu tập trang sức đồng bộ — vòng cổ, hoa tai, nhẫn',
    },
    {
      name: 'Charm & Phụ kiện',
      slug: 'charm-phu-kien',
      image_url:
        'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=900&auto=format&fit=crop',
      description: 'Charm bạc, hạt đá quý lẻ, phụ kiện trang sức',
    },
  ];

  for (const c of categories) {
    await sql`
      INSERT INTO categories (name, slug, image_url, description)
      VALUES (${c.name}, ${c.slug}, ${c.image_url}, ${c.description})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        image_url = EXCLUDED.image_url,
        description = EXCLUDED.description,
        updated_at = NOW()
    `;
  }
  console.log(`Đã tạo ${categories.length} danh mục mẫu.`);

  const products: {
    slug: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category_slug: string;
    sale_price?: number;
    sale_end_at?: string;
  }[] = [
    // ==================== Nhẫn đá quý ====================
    {
      slug: 'nhan-ngoc-luc-bao-vang-18k',
      name: 'Nhẫn ngọc lục bảo Colombia — Vàng 18K',
      description:
        'Nhẫn nữ đính ngọc lục bảo Colombia tự nhiên 1.2 carat, ổ chấu vàng 18K, viền xung quanh đính kim cương tấm. Đi kèm giấy kiểm định GIA.',
      price: 28900000,
      sale_price: 24500000,
      sale_end_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      image_url:
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&auto=format&fit=crop',
      category_slug: 'nhan-da-quy',
    },
    {
      slug: 'nhan-ruby-myanmar-bac-925',
      name: 'Nhẫn ruby Myanmar — Bạc 925 mạ vàng',
      description:
        'Nhẫn ruby Myanmar đỏ huyết bồ câu 0.8 carat, khung bạc 925 mạ vàng 18K, thiết kế cổ điển sang trọng.',
      price: 8500000,
      image_url:
        'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=900&auto=format&fit=crop',
      category_slug: 'nhan-da-quy',
    },
    {
      slug: 'nhan-sapphire-xanh-vang-18k',
      name: 'Nhẫn sapphire xanh hoàng gia — Vàng 18K',
      description:
        'Sapphire xanh Ceylon 1.5 carat, ổ chấu vàng 18K, viền halo kim cương tấm. Hoàn hảo cho ngày trọng đại.',
      price: 32900000,
      sale_price: 28900000,
      sale_end_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      image_url:
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&auto=format&fit=crop',
      category_slug: 'nhan-da-quy',
    },
    {
      slug: 'nhan-kim-cuong-solitaire-vang-trang',
      name: 'Nhẫn kim cương solitaire — Vàng trắng 18K',
      description:
        'Kim cương trung tâm 0.5 carat (D-VS1), ổ chấu vàng trắng 18K, kiểu solitaire kinh điển. Có giấy GIA.',
      price: 45000000,
      image_url:
        'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?w=900&auto=format&fit=crop',
      category_slug: 'nhan-da-quy',
    },

    // ==================== Vòng cổ ====================
    {
      slug: 'vong-co-ngoc-luc-bao-vang-18k',
      name: 'Vòng cổ ngọc lục bảo — Vàng 18K',
      description:
        'Vòng cổ vàng 18K đính 7 viên ngọc lục bảo tự nhiên cắt oval, dây chuyền dài 42cm. Đi kèm hộp cao cấp.',
      price: 35900000,
      sale_price: 31500000,
      sale_end_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      image_url:
        'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=900&auto=format&fit=crop',
      category_slug: 'vong-co',
    },
    {
      slug: 'kieng-co-ngoc-trai-tahiti',
      name: 'Kiềng cổ ngọc trai Tahiti — Bạc 925',
      description:
        'Chuỗi ngọc trai Tahiti đen ánh xanh 8-10mm, khoá bạc 925 mạ vàng. Dài 45cm, sang trọng cổ điển.',
      price: 12500000,
      image_url:
        'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&auto=format&fit=crop',
      category_slug: 'vong-co',
    },
    {
      slug: 'vong-co-ruby-pendant-vang-18k',
      name: 'Vòng cổ pendant ruby — Vàng 18K',
      description:
        'Pendant ruby tròn 0.6 carat trên dây vàng 18K mảnh, thiết kế tối giản hiện đại.',
      price: 9800000,
      image_url:
        'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=900&auto=format&fit=crop',
      category_slug: 'vong-co',
    },

    // ==================== Mặt dây chuyền ====================
    {
      slug: 'mat-day-sapphire-giot-nuoc',
      name: 'Mặt dây sapphire giọt nước',
      description:
        'Sapphire xanh hình giọt nước 1.0 carat, viền vàng 18K. Đi kèm dây chuyền vàng 18K dài 45cm.',
      price: 14500000,
      image_url:
        'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=900&auto=format&fit=crop',
      category_slug: 'mat-day-chuyen',
    },
    {
      slug: 'mat-day-thach-anh-tim',
      name: 'Mặt dây thạch anh tím',
      description:
        'Thạch anh tím (amethyst) tự nhiên 2.5 carat, mặt dây bạc 925 mạ vàng. Hợp người mệnh Hỏa, Thổ.',
      price: 1890000,
      sale_price: 1490000,
      sale_end_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      image_url:
        'https://images.unsplash.com/photo-1602752250015-52934bc45613?w=900&auto=format&fit=crop',
      category_slug: 'mat-day-chuyen',
    },
    {
      slug: 'mat-day-ngoc-luc-bao-trai-tim',
      name: 'Mặt dây ngọc lục bảo trái tim',
      description:
        'Ngọc lục bảo cắt hình trái tim 0.7 carat, ổ chấu vàng 18K với 12 kim cương tấm bao quanh.',
      price: 18900000,
      image_url:
        'https://images.unsplash.com/photo-1612445481036-23df36c5ee8a?w=900&auto=format&fit=crop',
      category_slug: 'mat-day-chuyen',
    },

    // ==================== Hoa tai ====================
    {
      slug: 'hoa-tai-ngoc-trai-akoya',
      name: 'Hoa tai ngọc trai Akoya — Vàng 18K',
      description:
        'Cặp hoa tai ngọc trai Akoya Nhật Bản 7-8mm, ánh hồng tự nhiên, khung vàng 18K.',
      price: 5800000,
      image_url:
        'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=900&auto=format&fit=crop',
      category_slug: 'hoa-tai',
    },
    {
      slug: 'hoa-tai-ruby-stud',
      name: 'Hoa tai stud ruby — Vàng trắng 18K',
      description:
        'Cặp hoa tai stud ruby Myanmar mỗi viên 0.4 carat, ổ chấu vàng trắng 18K. Đeo hằng ngày sang trọng.',
      price: 11500000,
      sale_price: 9900000,
      sale_end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      image_url:
        'https://images.unsplash.com/photo-1535632066274-94e090b7d7f1?w=900&auto=format&fit=crop',
      category_slug: 'hoa-tai',
    },
    {
      slug: 'hoa-tai-sapphire-tho-sang-trong',
      name: 'Hoa tai sapphire & kim cương tấm',
      description:
        'Cặp hoa tai sapphire xanh kết hợp kim cương tấm halo, khung vàng 18K. Thiết kế tinh xảo cho dạ tiệc.',
      price: 22500000,
      image_url:
        'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?w=900&auto=format&fit=crop',
      category_slug: 'hoa-tai',
    },

    // ==================== Vòng tay ====================
    {
      slug: 'vong-tay-ngoc-bich-myanmar',
      name: 'Vòng tay ngọc bích Myanmar (Jade)',
      description:
        'Vòng tay ngọc bích (jadeite) Myanmar nguyên khối, đường kính trong 56mm, mầu xanh đậm tự nhiên.',
      price: 18900000,
      image_url:
        'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900&auto=format&fit=crop',
      category_slug: 'vong-tay',
    },
    {
      slug: 'lac-tay-kim-cuong-tennis',
      name: 'Lắc tay tennis kim cương — Vàng trắng 18K',
      description:
        'Lắc tay tennis với 50 viên kim cương tấm tổng 2.0 carat, vàng trắng 18K. Sang trọng tinh tế.',
      price: 38500000,
      sale_price: 33000000,
      sale_end_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      image_url:
        'https://images.unsplash.com/photo-1583937443566-6fe1a1c8ef9b?w=900&auto=format&fit=crop',
      category_slug: 'vong-tay',
    },
    {
      slug: 'vong-tay-charm-bac-925',
      name: 'Vòng tay charm bạc 925',
      description:
        'Vòng tay bạc 925 dáng cứng, gắn 5 charm đá quý nhỏ tinh xảo. Có thể tự chọn charm yêu thích.',
      price: 1890000,
      image_url:
        'https://images.unsplash.com/photo-1602752250015-52934bc45613?w=900&auto=format&fit=crop',
      category_slug: 'vong-tay',
    },

    // ==================== Bộ trang sức ====================
    {
      slug: 'bo-trang-suc-ngoc-trai',
      name: 'Bộ trang sức ngọc trai Akoya — 3 món',
      description:
        'Bộ 3 món: vòng cổ, hoa tai, nhẫn ngọc trai Akoya 7-8mm. Khung bạc 925 mạ vàng. Hộp đựng cao cấp.',
      price: 14900000,
      sale_price: 12500000,
      sale_end_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      image_url:
        'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&auto=format&fit=crop',
      category_slug: 'bo-trang-suc',
    },
    {
      slug: 'bo-trang-suc-ngoc-luc-bao',
      name: 'Bộ trang sức ngọc lục bảo cô dâu',
      description:
        'Bộ vòng cổ + hoa tai + nhẫn đính ngọc lục bảo Colombia. Khung vàng 18K, có kim cương tấm điểm xuyết.',
      price: 89000000,
      image_url:
        'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=900&auto=format&fit=crop',
      category_slug: 'bo-trang-suc',
    },

    // ==================== Charm & Phụ kiện ====================
    {
      slug: 'charm-bac-trai-tim',
      name: 'Charm bạc 925 hình trái tim',
      description:
        'Charm bạc 925 hình trái tim đính đá CZ trắng. Phù hợp với mọi loại vòng tay charm.',
      price: 390000,
      image_url:
        'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=900&auto=format&fit=crop',
      category_slug: 'charm-phu-kien',
    },
    {
      slug: 'charm-da-thach-anh-hong',
      name: 'Charm thạch anh hồng',
      description:
        'Charm hạt thạch anh hồng tự nhiên, mài đá tròn 8mm. Mang ý nghĩa tình yêu, kết nối.',
      price: 290000,
      sale_price: 210000,
      sale_end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      image_url:
        'https://images.unsplash.com/photo-1617817547900-3e3e02f64b22?w=900&auto=format&fit=crop',
      category_slug: 'charm-phu-kien',
    },
    {
      slug: 'hop-trang-suc-da-cao-cap',
      name: 'Hộp đựng trang sức da cao cấp',
      description:
        'Hộp đựng trang sức bằng da PU cao cấp, lót nhung, có ngăn riêng cho nhẫn, dây chuyền, hoa tai.',
      price: 690000,
      image_url:
        'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=900&auto=format&fit=crop',
      category_slug: 'charm-phu-kien',
    },
  ];

  for (const p of products) {
    await sql`
      INSERT INTO products (category_id, name, slug, description, price, sale_price, sale_end_at, image_url)
      SELECT c.id, ${p.name}, ${p.slug}, ${p.description}, ${p.price},
             ${p.sale_price ?? null}, ${p.sale_end_at ?? null}, ${p.image_url}
      FROM categories c
      WHERE c.slug = ${p.category_slug}
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        sale_price = EXCLUDED.sale_price,
        sale_end_at = EXCLUDED.sale_end_at,
        image_url = EXCLUDED.image_url,
        updated_at = NOW()
    `;
  }
  console.log(`Đã tạo ${products.length} sản phẩm mẫu.`);
  console.log('Seed hoàn tất.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
