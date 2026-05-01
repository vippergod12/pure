'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Category } from '@/lib/types';
import Modal from '@/components/Modal';
import ImagePicker from '@/components/ImagePicker';
import RowActions from '@/components/RowActions';

interface FormState {
  id?: number;
  name: string;
  slug: string;
  image_url: string;
  description: string;
}

const emptyForm: FormState = { name: '', slug: '', image_url: '', description: '' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api.listCategories();
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Category) {
    setForm({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image_url: c.image_url ?? '',
      description: c.description ?? '',
    });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload: Partial<Category> = {
      name: form.name,
      slug: form.slug || undefined,
      image_url: form.image_url || null,
      description: form.description || null,
    };
    try {
      if (form.id) {
        await api.updateCategory(form.id, payload);
      } else {
        await api.createCategory(payload);
      }
      setOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(c: Category) {
    if (!confirm(`Xoá danh mục "${c.name}"? Toàn bộ sản phẩm thuộc danh mục này cũng sẽ bị xoá.`)) return;
    try {
      await api.deleteCategory(c.id);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xoá thất bại');
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Danh mục</h1>
          <p>Tổ chức sản phẩm theo từng danh mục.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>+ Thêm danh mục</button>
      </div>

      {loading ? (
        <div className="empty-state">Đang tải...</div>
      ) : categories.length === 0 ? (
        <div className="empty-state">Chưa có danh mục. Bấm &quot;Thêm danh mục&quot; để tạo mới.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>#</th>
                <th style={{ width: '12%' }}>Ảnh</th>
                <th style={{ width: '32%' }}>Tên</th>
                <th style={{ width: '18%' }}>Slug</th>
                <th style={{ width: '12%' }}>Sản phẩm</th>
                <th style={{ width: '20%' }}></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>
                    {c.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image_url} alt={c.name} className="table-thumb" />
                    ) : (
                      <div className="table-thumb empty">—</div>
                    )}
                  </td>
                  <td>
                    <div className="cell-strong">{c.name}</div>
                    {c.description && <div className="cell-muted">{c.description}</div>}
                  </td>
                  <td><code>{c.slug}</code></td>
                  <td>{c.product_count ?? 0}</td>
                  <td>
                    <RowActions
                      actions={[
                        { label: 'Sửa', onClick: () => openEdit(c) },
                        { label: 'Xoá', onClick: () => onDelete(c), variant: 'danger' },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        title={form.id ? 'Sửa danh mục' : 'Thêm danh mục'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={submitting}>Huỷ</button>
            <button type="submit" form="category-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <form id="category-form" className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>Tên danh mục *</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Slug (để trống sẽ tự sinh)</span>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="vd: ao-thun"
            />
          </label>
          <ImagePicker
            label="Ảnh đại diện"
            value={form.image_url}
            onChange={(v) => setForm({ ...form, image_url: v })}
            disabled={submitting}
          />
          <label className="field">
            <span>Mô tả</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          {error && <div className="form-error">{error}</div>}
        </form>
      </Modal>
    </div>
  );
}
