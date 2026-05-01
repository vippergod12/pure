'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Category, Product } from '@/lib/types';
import Modal from '@/components/Modal';
import ImagePicker from '@/components/ImagePicker';
import TagInput from '@/components/TagInput';
import Switch from '@/components/Switch';
import Pagination from '@/components/Pagination';
import RowActions from '@/components/RowActions';
import { formatVnd } from '@/lib/utils/format';
import { fromDatetimeLocalValue, getSaleInfo, toDatetimeLocalValue } from '@/lib/utils/sale';

interface FormState {
  id?: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  sale_price: string;
  sale_end_at: string;
  image_url: string;
  category_id: string;
  is_active: boolean;
  colors: string[];
}

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  price: '',
  sale_price: '',
  sale_end_at: '',
  image_url: '',
  category_id: '',
  is_active: true,
  colors: [],
};

const COLOR_SUGGESTIONS = ['Đen', 'Trắng', 'Xám', 'Be', 'Hồng', 'Đỏ', 'Xanh navy', 'Xanh dương', 'Nâu', 'Vàng'];

const PAGE_SIZE = 10;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  async function refresh() {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        api.listProducts({ category: filterCategory || undefined, q: search || undefined }),
        api.listCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory]);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return products.slice(start, start + PAGE_SIZE);
  }, [products, safePage]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    setPage(1);
  }, [filterCategory]);

  function openCreate() {
    setForm({ ...emptyForm, category_id: categories[0]?.id ? String(categories[0].id) : '' });
    setError(null);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? '',
      price: String(p.price ?? 0),
      sale_price: p.sale_price != null ? String(p.sale_price) : '',
      sale_end_at: toDatetimeLocalValue(p.sale_end_at),
      image_url: p.image_url ?? '',
      category_id: String(p.category_id),
      is_active: p.is_active,
      colors: Array.isArray(p.colors) ? p.colors : [],
    });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload: Partial<Product> = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || null,
      price: Number(form.price || 0),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      sale_end_at: form.sale_end_at ? fromDatetimeLocalValue(form.sale_end_at) : null,
      image_url: form.image_url || null,
      category_id: Number(form.category_id),
      is_active: form.is_active,
      colors: form.colors,
    };
    try {
      if (form.id) {
        await api.updateProduct(form.id, payload);
      } else {
        await api.createProduct(payload);
      }
      setOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(p: Product) {
    setProducts((prev) =>
      prev.map((it) => (it.id === p.id ? { ...it, is_active: !p.is_active } : it)),
    );
    try {
      await api.setProductActive(p.id, !p.is_active);
    } catch (err) {
      setProducts((prev) =>
        prev.map((it) => (it.id === p.id ? { ...it, is_active: p.is_active } : it)),
      );
      alert(err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại');
    }
  }

  async function onDelete(p: Product) {
    if (!confirm(`Xoá sản phẩm "${p.name}"?`)) return;
    try {
      await api.deleteProduct(p.id);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xoá thất bại');
    }
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    refresh();
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Sản phẩm</h1>
          <p>Quản lý kho sản phẩm cho website.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate} disabled={categories.length === 0}>
          + Thêm sản phẩm
        </button>
      </div>

      {categories.length === 0 && (
        <div className="empty-state">Bạn cần tạo ít nhất 1 danh mục trước khi thêm sản phẩm.</div>
      )}

      <div className="toolbar">
        <form onSubmit={onSearchSubmit} className="toolbar-search">
          <input
            type="search"
            placeholder="Tìm theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-ghost btn-sm">Tìm</button>
        </form>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="select"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="empty-state">Đang tải...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">Không có sản phẩm phù hợp.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>#</th>
                <th style={{ width: '9%' }}>Ảnh</th>
                <th style={{ width: '22%' }}>Tên</th>
                <th style={{ width: '14%' }}>Danh mục</th>
                <th style={{ width: '13%' }}>Giá</th>
                <th style={{ width: '14%' }}>Màu sắc</th>
                <th style={{ width: '8%' }}>Còn hàng</th>
                <th style={{ width: '15%' }}></th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="table-thumb" />
                    ) : (
                      <div className="table-thumb empty">—</div>
                    )}
                  </td>
                  <td>
                    <div className="cell-strong">{p.name}</div>
                    <code className="cell-muted">{p.slug}</code>
                  </td>
                  <td>{p.category_name ?? categoryMap.get(p.category_id)?.name ?? '—'}</td>
                  <td className="price-cell">
                    {(() => {
                      const info = getSaleInfo(p);
                      if (!info.isOnSale) return formatVnd(p.price);
                      return (
                        <div className="price-cell-stack">
                          <span className="price-sale">{formatVnd(info.effectivePrice)}</span>
                          <span className="price-original">{formatVnd(info.originalPrice)}</span>
                          <span className="price-sale-tag">SALE {info.saleRatio}%</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    {p.colors && p.colors.length > 0 ? (
                      <div className="cell-colors">
                        {p.colors.slice(0, 3).map((c) => (
                          <span key={c} className="color-pill">{c}</span>
                        ))}
                        {p.colors.length > 3 && (
                          <span className="color-pill more">+{p.colors.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="cell-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="status-cell">
                      <Switch
                        checked={p.is_active}
                        onChange={() => toggleActive(p)}
                        ariaLabel={p.is_active ? 'Tắt còn hàng' : 'Bật còn hàng'}
                      />
                    </div>
                  </td>
                  <td>
                    <RowActions
                      actions={[
                        { label: 'Sửa', onClick: () => openEdit(p) },
                        { label: 'Xoá', onClick: () => onDelete(p), variant: 'danger' },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && products.length > 0 && totalPages > 1 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={products.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}

      <Modal
        open={open}
        title={form.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={submitting}>Huỷ</button>
            <button type="submit" form="product-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <form id="product-form" className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>Tên sản phẩm *</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Slug (để trống sẽ tự sinh)</span>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Giá gốc (VND) *</span>
              <input
                required
                type="number"
                min={0}
                step="1000"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
          </div>
          <fieldset className="field-group">
            <legend>Khuyến mãi (tuỳ chọn)</legend>
            <div className="form-row">
              <label className="field">
                <span>Giá sale (VND)</span>
                <input
                  type="number"
                  min={0}
                  step="1000"
                  placeholder="Để trống nếu không có sale"
                  value={form.sale_price}
                  onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Kết thúc sale</span>
                <input
                  type="datetime-local"
                  value={form.sale_end_at}
                  onChange={(e) => setForm({ ...form, sale_end_at: e.target.value })}
                />
              </label>
            </div>
            {form.sale_price && form.price && Number(form.sale_price) > 0 && Number(form.sale_price) < Number(form.price) && (
              <p className="field-hint">
                Giảm: <strong>{Math.round((1 - Number(form.sale_price) / Number(form.price)) * 100)}%</strong>
                {' · '}Hiển thị badge: <strong>SALE {Math.round((Number(form.sale_price) * 100) / Number(form.price))}%</strong>
              </p>
            )}
          </fieldset>
          <label className="field">
            <span>Danh mục *</span>
            <select
              required
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="" disabled>Chọn danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <ImagePicker
            label="Ảnh sản phẩm"
            value={form.image_url}
            onChange={(v) => setForm({ ...form, image_url: v })}
            disabled={submitting}
          />
          <TagInput
            label="Màu sắc"
            value={form.colors}
            onChange={(next) => setForm({ ...form, colors: next })}
            placeholder="Nhập màu rồi nhấn Enter (vd: Hồng, Đen)"
            hint="Khách hàng sẽ chọn 1 màu khi liên hệ qua Zalo. Để trống nếu sản phẩm không có biến thể màu."
            suggestions={COLOR_SUGGESTIONS}
          />
          <label className="field">
            <span>Mô tả</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="field-inline switch-row">
            <Switch
              checked={form.is_active}
              onChange={(next) => setForm({ ...form, is_active: next })}
              ariaLabel="Trạng thái còn hàng"
            />
            <div className="switch-label">
              <strong>{form.is_active ? 'Đang còn hàng' : 'Hết hàng'}</strong>
              <small>
                {form.is_active
                  ? 'Khách có thể đặt mua qua Zalo.'
                  : 'Sản phẩm vẫn hiển thị nhưng có nhãn "Hết hàng" và ẩn nút mua.'}
              </small>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
        </form>
      </Modal>
    </div>
  );
}
