'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Product } from '@/lib/types';
import { formatVnd } from '@/lib/utils/format';

const MAX_FEATURED = 8;

export default function AdminFeaturedPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [featuredIds, setFeaturedIds] = useState<number[]>([]);
  const [initialIds, setInitialIds] = useState<number[]>([]);
  const [heroId, setHeroId] = useState<number | null>(null);
  const [initialHeroId, setInitialHeroId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [heroSearch, setHeroSearch] = useState('');
  const [heroPickerOpen, setHeroPickerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listProducts(), api.listFeaturedProducts(), api.getHeroProduct()])
      .then(([all, featured, hero]) => {
        if (cancelled) return;
        setAllProducts(all);
        const ids = featured
          .filter((p) => p.featured_rank !== null)
          .sort((a, b) => (a.featured_rank ?? 0) - (b.featured_rank ?? 0))
          .map((p) => p.id);
        setFeaturedIds(ids);
        setInitialIds(ids);
        setHeroId(hero?.id ?? null);
        setInitialHeroId(hero?.id ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const productMap = useMemo(() => {
    const m = new Map<number, Product>();
    for (const p of allProducts) m.set(p.id, p);
    return m;
  }, [allProducts]);

  const featuredList = useMemo(
    () => featuredIds.map((id) => productMap.get(id)).filter((p): p is Product => Boolean(p)),
    [featuredIds, productMap]
  );

  const heroProduct = useMemo(
    () => (heroId !== null ? productMap.get(heroId) ?? null : null),
    [heroId, productMap]
  );

  const candidates = useMemo(() => {
    const set = new Set(featuredIds);
    const term = search.trim().toLowerCase();
    return allProducts
      .filter((p) => !set.has(p.id))
      .filter((p) => {
        if (!term) return true;
        return (
          p.name.toLowerCase().includes(term) ||
          (p.category_name ?? '').toLowerCase().includes(term)
        );
      })
      .slice(0, 60);
  }, [allProducts, featuredIds, search]);

  const heroCandidates = useMemo(() => {
    const term = heroSearch.trim().toLowerCase();
    return allProducts
      .filter((p) => p.image_url)
      .filter((p) => p.id !== heroId)
      .filter((p) => {
        if (!term) return true;
        return (
          p.name.toLowerCase().includes(term) ||
          (p.category_name ?? '').toLowerCase().includes(term)
        );
      })
      .slice(0, 80);
  }, [allProducts, heroId, heroSearch]);

  const isDirty = useMemo(() => {
    if (heroId !== initialHeroId) return true;
    if (featuredIds.length !== initialIds.length) return true;
    for (let i = 0; i < featuredIds.length; i++) {
      if (featuredIds[i] !== initialIds[i]) return true;
    }
    return false;
  }, [featuredIds, initialIds, heroId, initialHeroId]);

  function addFeatured(id: number) {
    setError(null);
    setSuccess(null);
    setFeaturedIds((prev) => {
      if (prev.includes(id)) return prev;
      if (prev.length >= MAX_FEATURED) {
        setError(`Tối đa ${MAX_FEATURED} sản phẩm tiêu biểu. Hãy bỏ bớt trước khi thêm.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  function removeFeatured(id: number) {
    setError(null);
    setSuccess(null);
    setFeaturedIds((prev) => prev.filter((x) => x !== id));
  }

  function moveItem(from: number, to: number) {
    setFeaturedIds((prev) => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev;
      if (from === to) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function pickHero(id: number | null) {
    setError(null);
    setSuccess(null);
    setHeroId(id);
    setHeroPickerOpen(false);
    setHeroSearch('');
  }

  function handleDragStart(index: number, e: React.DragEvent<HTMLLIElement>) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {
      /* some browsers throw on file:// — ignore */
    }
  }

  function handleDragOver(index: number, e: React.DragEvent<HTMLLIElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIndex !== index) setOverIndex(index);
  }

  function handleDrop(index: number, e: React.DragEvent<HTMLLIElement>) {
    e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
    if (Number.isFinite(from)) moveItem(from as number, index);
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const tasks: Promise<unknown>[] = [];
      const featuredChanged =
        featuredIds.length !== initialIds.length ||
        featuredIds.some((id, i) => id !== initialIds[i]);
      const heroChanged = heroId !== initialHeroId;

      if (featuredChanged) tasks.push(api.setFeaturedProducts(featuredIds));
      if (heroChanged) tasks.push(api.setHeroProduct(heroId));

      await Promise.all(tasks);
      setInitialIds(featuredIds);
      setInitialHeroId(heroId);
      setSuccess('Đã lưu thay đổi.');
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setFeaturedIds(initialIds);
    setHeroId(initialHeroId);
    setHeroPickerOpen(false);
    setHeroSearch('');
    setError(null);
    setSuccess(null);
  }

  if (loading) {
    return <div className="page-loading">Đang tải...</div>;
  }

  return (
    <div className="admin-featured-page">
      <header className="admin-page-header">
        <div>
          <h1>Sản phẩm tiêu biểu</h1>
          <p className="admin-page-sub">
            Chọn ảnh hero hiển thị ở banner trang chủ và tối đa {MAX_FEATURED} sản phẩm cho mục
            <strong> &quot;Đang được săn đón&quot;</strong>.
          </p>
        </div>
        <div className="admin-featured-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleReset}
            disabled={!isDirty || saving}
          >
            Hoàn tác
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </header>

      {error && <div className="admin-flash admin-flash-error">{error}</div>}
      {success && <div className="admin-flash admin-flash-success">{success}</div>}

      <section className="featured-panel hero-panel">
        <div className="featured-panel-head">
          <h2>Ảnh hero trang chủ</h2>
          <span className="featured-hint">Hiển thị ở banner đầu trang</span>
        </div>

        <div className="hero-pick">
          <div className="hero-pick-preview">
            {heroProduct ? (
              heroProduct.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroProduct.image_url} alt={heroProduct.name} draggable={false} />
              ) : (
                <span className="hero-pick-fallback">
                  {heroProduct.name.charAt(0).toUpperCase()}
                </span>
              )
            ) : (
              <span className="hero-pick-empty">Chưa chọn</span>
            )}
          </div>

          <div className="hero-pick-info">
            {heroProduct ? (
              <>
                <div className="hero-pick-name">{heroProduct.name}</div>
                <div className="featured-sub">
                  <span className="featured-cat">{heroProduct.category_name ?? ''}</span>
                  <span className="featured-price">{formatVnd(heroProduct.price)}</span>
                </div>
                <p className="hero-pick-note">
                  Sản phẩm này đang được dùng làm ảnh hero. Ảnh sẽ luôn xuất hiện ở banner trang
                  chủ, không phụ thuộc vào sản phẩm mới thêm.
                </p>
              </>
            ) : (
              <p className="hero-pick-note">
                Chưa cấu hình. Trang chủ sẽ tự lấy ảnh từ sản phẩm/danh mục mới nhất.
              </p>
            )}
            <div className="hero-pick-actions">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setHeroPickerOpen((v) => !v)}
              >
                {heroPickerOpen ? 'Đóng danh sách' : heroProduct ? 'Đổi sản phẩm' : 'Chọn sản phẩm'}
              </button>
              {heroProduct && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => pickHero(null)}
                >
                  Bỏ chọn
                </button>
              )}
            </div>
          </div>
        </div>

        {heroPickerOpen && (
          <div className="hero-picker">
            <input
              type="text"
              className="featured-search hero-picker-search"
              placeholder="Tìm sản phẩm theo tên / danh mục..."
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              autoFocus
            />
            {heroCandidates.length === 0 ? (
              <div className="featured-empty">
                {heroSearch ? 'Không có sản phẩm phù hợp.' : 'Chưa có sản phẩm nào có ảnh.'}
              </div>
            ) : (
              <ul className="hero-candidate-grid">
                {heroCandidates.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="hero-candidate"
                      onClick={() => pickHero(p.id)}
                      title={`Chọn "${p.name}" làm ảnh hero`}
                    >
                      <span className="hero-candidate-thumb">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.name} draggable={false} />
                        ) : (
                          <span className="hero-pick-fallback">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="hero-candidate-name">{p.name}</span>
                      <span className="hero-candidate-cat">{p.category_name ?? ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <div className="featured-grid">
        <section className="featured-panel">
          <div className="featured-panel-head">
            <h2>Đang được săn đón ({featuredList.length}/{MAX_FEATURED})</h2>
            <span className="featured-hint">Kéo thả ⇅ để sắp xếp</span>
          </div>

          {featuredList.length === 0 ? (
            <div className="featured-empty">
              Chưa chọn sản phẩm nào. Thêm từ danh sách bên phải.
            </div>
          ) : (
            <ol className="featured-list">
              {featuredList.map((p, i) => (
                <li
                  key={p.id}
                  className={[
                    'featured-item',
                    dragIndex === i ? 'is-dragging' : '',
                    overIndex === i && dragIndex !== null && dragIndex !== i ? 'is-over' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  draggable
                  onDragStart={(e) => handleDragStart(i, e)}
                  onDragOver={(e) => handleDragOver(i, e)}
                  onDrop={(e) => handleDrop(i, e)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={() => setOverIndex((cur) => (cur === i ? null : cur))}
                >
                  <span className="featured-handle" aria-hidden>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <circle cx="9" cy="6" r="1.6" />
                      <circle cx="15" cy="6" r="1.6" />
                      <circle cx="9" cy="12" r="1.6" />
                      <circle cx="15" cy="12" r="1.6" />
                      <circle cx="9" cy="18" r="1.6" />
                      <circle cx="15" cy="18" r="1.6" />
                    </svg>
                  </span>
                  <span className="featured-rank">{String(i + 1).padStart(2, '0')}</span>
                  <div className="featured-thumb">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} draggable={false} />
                    ) : (
                      <span className="featured-thumb-fallback">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="featured-meta">
                    <div className="featured-name">{p.name}</div>
                    <div className="featured-sub">
                      <span className="featured-cat">{p.category_name ?? ''}</span>
                      <span className="featured-price">{formatVnd(p.price)}</span>
                    </div>
                  </div>
                  <div className="featured-controls">
                    <button
                      type="button"
                      className="featured-btn"
                      title="Lên"
                      onClick={() => moveItem(i, i - 1)}
                      disabled={i === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="featured-btn"
                      title="Xuống"
                      onClick={() => moveItem(i, i + 1)}
                      disabled={i === featuredList.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="featured-btn featured-btn-remove"
                      title="Bỏ chọn"
                      onClick={() => removeFeatured(p.id)}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="featured-panel">
          <div className="featured-panel-head">
            <h2>Tất cả sản phẩm</h2>
            <input
              type="text"
              className="featured-search"
              placeholder="Tìm theo tên / danh mục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {candidates.length === 0 ? (
            <div className="featured-empty">
              {search ? 'Không tìm thấy sản phẩm phù hợp.' : 'Tất cả sản phẩm đã được thêm.'}
            </div>
          ) : (
            <ul className="candidate-list">
              {candidates.map((p) => {
                const full = featuredIds.length >= MAX_FEATURED;
                return (
                  <li key={p.id} className="candidate-item">
                    <div className="featured-thumb featured-thumb-sm">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt={p.name} draggable={false} />
                      ) : (
                        <span className="featured-thumb-fallback">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="featured-meta">
                      <div className="featured-name">{p.name}</div>
                      <div className="featured-sub">
                        <span className="featured-cat">{p.category_name ?? ''}</span>
                        <span className="featured-price">{formatVnd(p.price)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => addFeatured(p.id)}
                      disabled={full}
                      title={full ? `Đã đạt giới hạn ${MAX_FEATURED} sản phẩm` : 'Thêm vào danh sách'}
                    >
                      + Thêm
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
