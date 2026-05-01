'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Consultation, ConsultationStatus } from '@/lib/types';
import Switch from '@/components/Switch';
import Pagination from '@/components/Pagination';
import RowActions from '@/components/RowActions';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | ConsultationStatus;

const GENDER_LABEL: Record<string, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

/**
 * Format thời gian theo timezone máy admin (vi-VN).
 * DB lưu UTC → Date object tự convert.
 */
function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    });
  } catch {
    return '—';
  }
}

export default function AdminConsultationsPage() {
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  // ID đang gọi PATCH → disable Switch tránh double-click
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listConsultations();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải dữ liệu thất bại');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    let neww = 0;
    let contacted = 0;
    for (const it of items) {
      if (it.status === 'contacted') contacted++;
      else neww++;
    }
    return { total: items.length, new: neww, contacted };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        it.name ?? '',
        it.phone,
        it.note ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  async function toggleContacted(item: Consultation) {
    const next: ConsultationStatus = item.status === 'contacted' ? 'new' : 'contacted';
    setBusyId(item.id);
    // Optimistic update
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? {
              ...it,
              status: next,
              // Optimistic: nếu bật → stamp giờ máy client; nếu tắt → null
              // Server sẽ trả lại giá trị chuẩn → ghi đè ở step kế.
              contacted_at:
                next === 'contacted'
                  ? it.contacted_at ?? new Date().toISOString()
                  : null,
            }
          : it,
      ),
    );
    try {
      const updated = await api.setConsultationStatus(item.id, next);
      setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)));
    } catch (err) {
      // Rollback
      setItems((prev) => prev.map((it) => (it.id === item.id ? item : it)));
      alert(err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại');
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(item: Consultation) {
    const label = item.name?.trim() || item.phone;
    if (!confirm(`Xoá yêu cầu tư vấn của "${label}"?`)) return;
    try {
      await api.deleteConsultation(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xoá thất bại');
    }
  }

  function copyPhone(phone: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(phone).catch(() => {});
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Yêu cầu tư vấn</h1>
          <p>Danh sách khách hàng gửi form từ trang đặt hàng / tư vấn.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={refresh} disabled={loading}>
          ↻ Tải lại
        </button>
      </div>

      <div className="consult-stats">
        <div className="consult-stat">
          <div className="consult-stat-value">{stats.total}</div>
          <div className="consult-stat-label">Tổng số</div>
        </div>
        <div className="consult-stat is-warn">
          <div className="consult-stat-value">{stats.new}</div>
          <div className="consult-stat-label">Chưa liên hệ</div>
        </div>
        <div className="consult-stat is-ok">
          <div className="consult-stat-value">{stats.contacted}</div>
          <div className="consult-stat-label">Đã liên hệ</div>
        </div>
      </div>

      <div className="toolbar">
        <form onSubmit={onSearchSubmit} className="toolbar-search">
          <input
            type="search"
            placeholder="Tìm theo tên / SĐT / ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-ghost btn-sm">Tìm</button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="select"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="new">Chưa liên hệ</option>
          <option value="contacted">Đã liên hệ</option>
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {items.length === 0
            ? 'Chưa có yêu cầu tư vấn nào.'
            : 'Không có kết quả phù hợp với bộ lọc.'}
        </div>
      ) : (
        <div className="table-wrapper">
          {/* `data-table--consult` áp width cố định / nowrap / status stack
              dọc — xem CSS .data-table--consult trong globals.css */}
          <table className="data-table data-table--consult">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th style={{ width: 140 }}>Ngày gửi</th>
                <th style={{ width: 140 }}>Tên</th>
                <th style={{ width: 80 }}>Giới tính</th>
                <th style={{ width: 130 }}>SĐT</th>
                <th style={{ width: 220 }}>Ghi chú</th>
                <th style={{ width: 150 }}>Trạng thái</th>
                <th style={{ width: 96 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((it) => {
                const isContacted = it.status === 'contacted';
                return (
                  <tr key={it.id}>
                    <td className="cell-muted">{it.id}</td>
                    <td>
                      <div className="cell-strong">{formatDateTime(it.created_at)}</div>
                    </td>
                    <td>
                      {it.name ? (
                        <span className="cell-strong">{it.name}</span>
                      ) : (
                        <span className="cell-muted">— Không tên —</span>
                      )}
                    </td>
                    <td>
                      {it.gender ? (
                        <span className="gender-pill">
                          {GENDER_LABEL[it.gender] ?? it.gender}
                        </span>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="phone-cell"
                        onClick={() => copyPhone(it.phone)}
                        title="Click để copy số"
                      >
                        {it.phone}
                      </button>
                    </td>
                    <td>
                      {it.note ? (
                        <div className="note-cell" title={it.note}>{it.note}</div>
                      ) : (
                        <span className="cell-muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="status-toggle">
                        <Switch
                          checked={isContacted}
                          disabled={busyId === it.id}
                          onChange={() => toggleContacted(it)}
                          ariaLabel={isContacted ? 'Đánh dấu chưa liên hệ' : 'Đánh dấu đã liên hệ'}
                        />
                        <div className="status-toggle-label">
                          <span
                            className={`status-pill ${isContacted ? 'is-ok' : 'is-warn'}`}
                          >
                            {isContacted ? 'Đã liên hệ' : 'Chưa liên hệ'}
                          </span>
                          {isContacted && it.contacted_at && (
                            <small className="status-time">
                              lúc {formatDateTime(it.contacted_at)}
                            </small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <RowActions
                        actions={[
                          {
                            label: 'Zalo',
                            onClick: () => {
                              const num = it.phone.replace(/[^\d]/g, '');
                              window.open(`https://zalo.me/${num}`, '_blank', 'noopener');
                            },
                          },
                          {
                            label: 'Xoá',
                            onClick: () => onDelete(it),
                            variant: 'danger',
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && totalPages > 1 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}
    </div>
  );
}
