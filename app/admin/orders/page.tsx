'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { ORDERS_REFRESH_EVENT, ORDERS_REFRESH_STORAGE_KEY } from '@/components/OrderRefreshNotifier';
import Pagination from '@/components/Pagination';
import RowActions from '@/components/RowActions';
import { api } from '@/lib/api-client';
import type { Order, OrderStatus } from '@/lib/types';
import { formatVnd } from '@/lib/utils/format';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | OrderStatus | 'other';
type ProviderFilter =
  | 'all'
  | 'appotapay'
  | 'appotapay_sandbox_topup'
  | 'sandbox_admin_approve'
  | 'momo'
  | 'momo_qr'
  | 'zalopay_qr'
  | 'other';

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string; tone: 'idle' | 'warn' | 'ok' | 'danger' }> = [
  { value: 'created', label: 'Mới tạo', tone: 'idle' },
  { value: 'pending', label: 'Chờ thanh toán', tone: 'warn' },
  { value: 'processing', label: 'Đang xử lý', tone: 'warn' },
  { value: 'awaiting_transfer', label: 'Chờ đối soát QR', tone: 'warn' },
  { value: 'paid', label: 'Đã thanh toán', tone: 'ok' },
  { value: 'failed', label: 'Thất bại', tone: 'danger' },
  { value: 'cancelled', label: 'Đã hủy', tone: 'danger' },
  { value: 'amount_mismatch', label: 'Lệch tiền', tone: 'danger' },
];

const STATUS_MAP = new Map(STATUS_OPTIONS.map((item) => [item.value, item]));

const PROVIDER_LABELS: Record<string, string> = {
  appotapay: 'AppotaPay',
  appotapay_sandbox_topup: 'AppotaPay Sandbox',
  sandbox_admin_approve: 'Admin duyệt (test)',
  momo: 'MoMo Merchant',
  momo_qr: 'MoMo QR',
  zalopay_qr: 'ZaloPay QR',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  });
}

function statusMeta(status: string) {
  return STATUS_MAP.get(status as OrderStatus) ?? { label: status, tone: 'idle' as const };
}

function providerLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? provider;
}

function gatewayMessage(order: Order): string | null {
  if (order.payment_provider === 'momo') return order.momo_message;
  if (order.payment_provider === 'appotapay') return order.appotapay_error_message;
  return null;
}

function gatewayPayload(order: Order): unknown {
  if (order.payment_provider === 'momo') return order.momo_payload;
  if (order.payment_provider === 'appotapay') return order.appotapay_payload;
  return null;
}

function orderProductName(order: Order) {
  return order.product_snapshot?.name ?? 'Đơn hàng PURE';
}

function matchesProviderFilter(order: Order, filter: ProviderFilter) {
  if (filter === 'all') return true;
  if (filter === 'other') {
    return ![
      'appotapay',
      'appotapay_sandbox_topup',
      'sandbox_admin_approve',
      'momo',
      'momo_qr',
      'zalopay_qr',
    ].includes(order.payment_provider);
  }
  return order.payment_provider === filter;
}

function matchesStatusFilter(order: Order, filter: StatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'other') return !STATUS_MAP.has(order.status as OrderStatus);
  return order.status === filter;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [page, setPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
  const [editTransactionId, setEditTransactionId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    setError(null);
    try {
      const data = await api.listOrders();
      setOrders(data);
      setLastRefreshedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng');
      if (!options.silent) setOrders([]);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh({ silent: true });
      }
    }, 3000);

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        refresh({ silent: true });
      }
    }

    function onFocus() {
      refresh({ silent: true });
    }

    function onStorage(event: StorageEvent) {
      if (event.key === ORDERS_REFRESH_STORAGE_KEY) {
        refresh({ silent: true });
      }
    }

    function onOrdersRefresh() {
      refresh({ silent: true });
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    window.addEventListener(ORDERS_REFRESH_EVENT, onOrdersRefresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(ORDERS_REFRESH_EVENT, onOrdersRefresh);
    };
  }, [refresh]);

  const stats = useMemo(() => {
    let needsAction = 0;
    let paid = 0;
    let failed = 0;
    for (const order of orders) {
      if (order.status === 'paid') paid++;
      else if (order.status === 'failed' || order.status === 'cancelled') failed++;
      else needsAction++;
    }
    return { total: orders.length, needsAction, paid, failed };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesStatusFilter(order, statusFilter)) return false;
      if (!matchesProviderFilter(order, providerFilter)) return false;
      if (!q) return true;
      const haystack = [
        order.order_code,
        order.customer_name,
        order.customer_phone,
        order.customer_email ?? '',
        orderProductName(order),
        order.provider_transaction_id ?? '',
        order.admin_note ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, providerFilter, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);
  const showPagination = filtered.length > PAGE_SIZE;
  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    setPage(1);
  }, [providerFilter, search, statusFilter]);

  function openEdit(order: Order) {
    const normalized = STATUS_MAP.has(order.status as OrderStatus)
      ? (order.status as OrderStatus)
      : 'pending';
    setEditingOrder(order);
    setEditStatus(normalized);
    setEditTransactionId(order.provider_transaction_id ?? '');
    setEditNote(order.admin_note ?? '');
  }

  async function onEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingOrder || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.updateOrder(editingOrder.id, {
        status: editStatus,
        provider_transaction_id: editTransactionId,
        admin_note: editNote,
      });
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setDetailOrder((prev) => (prev?.id === updated.id ? updated : prev));
      setEditingOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật đơn hàng');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(order: Order) {
    if (!confirm(`Xóa đơn "${order.order_code}"? Thao tác này chỉ nên dùng cho đơn test/spam.`)) return;
    try {
      await api.deleteOrder(order.id);
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      setDetailOrder((prev) => (prev?.id === order.id ? null : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xóa đơn hàng thất bại');
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
  }

  return (
    <div className="admin-page admin-orders-page">
      <div className="admin-page-header">
        <div>
          <h1>Đơn hàng</h1>
          <p>Quản lý đơn thanh toán AppotaPay, MoMo Merchant và QR thủ công.</p>
          {lastRefreshedAt && (
            <p className="admin-refresh-meta">
              Tự động cập nhật mỗi 3 giây · Lần cuối {lastRefreshedAt.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </p>
          )}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => refresh()} disabled={loading}>
          Tải lại
        </button>
      </div>

      <div className="order-stats">
        <div className="order-stat">
          <div className="order-stat-value">{stats.total}</div>
          <div className="order-stat-label">Tổng đơn</div>
        </div>
        <div className="order-stat is-warn">
          <div className="order-stat-value">{stats.needsAction}</div>
          <div className="order-stat-label">Cần theo dõi</div>
        </div>
        <div className="order-stat is-ok">
          <div className="order-stat-value">{stats.paid}</div>
          <div className="order-stat-label">Đã thanh toán</div>
        </div>
        <div className="order-stat is-danger">
          <div className="order-stat-value">{stats.failed}</div>
          <div className="order-stat-label">Lỗi / hủy</div>
        </div>
      </div>

      <div className="toolbar order-toolbar">
        <form onSubmit={onSearchSubmit} className="toolbar-search">
          <input
            type="search"
            placeholder="Tìm mã đơn, khách, SĐT, sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-ghost btn-sm">Tìm</button>
        </form>
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
          <option value="other">Khác</option>
        </select>
        <select
          className="select"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value as ProviderFilter)}
        >
          <option value="all">Tất cả kênh</option>
          <option value="appotapay">AppotaPay</option>
          <option value="appotapay_sandbox_topup">AppotaPay Sandbox</option>
          <option value="sandbox_admin_approve">Admin duyệt (test)</option>
          <option value="momo">MoMo Merchant</option>
          <option value="momo_qr">MoMo QR</option>
          <option value="zalopay_qr">ZaloPay QR</option>
          <option value="other">Khác</option>
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}

      {!loading && filtered.length > 0 && (
        <div className="orders-result-bar">
          <span>
            Hiển thị <strong>{pageStart}</strong>-<strong>{pageEnd}</strong> trong tổng <strong>{filtered.length}</strong> đơn
          </span>
          {showPagination && (
            <div className="orders-page-jump">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage <= 1}
              >
                Trước
              </button>
              <label>
                <span>Trang</span>
                <select
                  value={safePage}
                  onChange={(event) => setPage(Number(event.target.value))}
                  aria-label="Chọn trang đơn hàng"
                >
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <option key={pageNumber} value={pageNumber}>
                      {pageNumber} / {totalPages}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage >= totalPages}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="empty-state">Đang tải đơn hàng...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {orders.length === 0 ? 'Chưa có đơn hàng nào.' : 'Không có đơn hàng phù hợp với bộ lọc.'}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table data-table--orders">
            <thead>
              <tr>
                <th style={{ width: 150 }}>Mã đơn</th>
                <th style={{ width: 190 }}>Khách hàng</th>
                <th style={{ width: 220 }}>Sản phẩm</th>
                <th style={{ width: 170 }}>Thanh toán</th>
                <th style={{ width: 150 }}>Trạng thái</th>
                <th style={{ width: 140 }}>Ngày tạo</th>
                <th style={{ width: 112 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((order) => {
                const meta = statusMeta(order.status);
                return (
                  <tr key={order.id}>
                    <td>
                      <button
                        type="button"
                        className="order-code-btn"
                        onClick={() => copy(order.order_code)}
                        title="Click để copy mã đơn"
                      >
                        {order.order_code}
                      </button>
                      <div className="cell-muted">#{order.id}</div>
                    </td>
                    <td>
                      <div className="cell-strong">{order.customer_name}</div>
                      <button type="button" className="phone-cell" onClick={() => copy(order.customer_phone)}>
                        {order.customer_phone}
                      </button>
                      {order.customer_email && <div className="cell-muted">{order.customer_email}</div>}
                    </td>
                    <td>
                      <div className="cell-strong">{orderProductName(order)}</div>
                      <div className="cell-muted">
                        SL {order.quantity}
                        {order.selected_color ? ` · ${order.selected_color}` : ''}
                      </div>
                    </td>
                    <td>
                      <div className="order-amount">{formatVnd(order.amount)}</div>
                      <div className="cell-muted">{providerLabel(order.payment_provider)}</div>
                      {order.provider_transaction_id && (
                        <code className="order-transaction">{order.provider_transaction_id}</code>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill order-status is-${meta.tone}`}>
                        {meta.label}
                      </span>
                      {gatewayMessage(order) && (
                        <div className="cell-muted order-message">{gatewayMessage(order)}</div>
                      )}
                    </td>
                    <td>
                      <span className="order-date">{formatDateTime(order.created_at)}</span>
                      {order.paid_at && <small className="status-time">Paid {formatDateTime(order.paid_at)}</small>}
                    </td>
                    <td>
                      <RowActions
                        actions={[
                          { label: 'Chi tiết', onClick: () => setDetailOrder(order) },
                          { label: 'Cập nhật', onClick: () => openEdit(order) },
                          { label: 'Xóa', onClick: () => onDelete(order), variant: 'danger' },
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

      <Modal
        open={Boolean(detailOrder)}
        title={detailOrder ? `Chi tiết ${detailOrder.order_code}` : 'Chi tiết đơn hàng'}
        onClose={() => setDetailOrder(null)}
        footer={
          detailOrder ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setDetailOrder(null)}>Đóng</button>
              <button type="button" className="btn btn-primary" onClick={() => openEdit(detailOrder)}>
                Cập nhật
              </button>
            </>
          ) : null
        }
        size="wide"
      >
        {detailOrder && (
          <div className="order-detail">
            <section>
              <h4>Khách hàng</h4>
              <dl>
                <div><dt>Họ tên</dt><dd>{detailOrder.customer_name}</dd></div>
                <div><dt>SĐT</dt><dd>{detailOrder.customer_phone}</dd></div>
                <div><dt>Email</dt><dd>{detailOrder.customer_email ?? '-'}</dd></div>
                <div><dt>Ghi chú khách</dt><dd>{detailOrder.customer_note ?? '-'}</dd></div>
              </dl>
            </section>

            <section>
              <h4>Sản phẩm</h4>
              <dl>
                <div><dt>Tên</dt><dd>{orderProductName(detailOrder)}</dd></div>
                <div><dt>Số lượng</dt><dd>{detailOrder.quantity}</dd></div>
                <div><dt>Màu sắc</dt><dd>{detailOrder.selected_color ?? '-'}</dd></div>
                <div><dt>Tổng tiền</dt><dd>{formatVnd(detailOrder.amount)}</dd></div>
              </dl>
            </section>

            <section>
              <h4>Thanh toán</h4>
              <dl>
                <div><dt>Kênh</dt><dd>{providerLabel(detailOrder.payment_provider)}</dd></div>
                <div><dt>Phương thức</dt><dd>{detailOrder.payment_method}</dd></div>
                <div><dt>Trạng thái</dt><dd>{statusMeta(detailOrder.status).label}</dd></div>
                <div><dt>Mã giao dịch</dt><dd>{detailOrder.provider_transaction_id ?? '-'}</dd></div>
                <div><dt>Ngày tạo</dt><dd>{formatDateTime(detailOrder.created_at)}</dd></div>
                <div><dt>Ngày thanh toán</dt><dd>{formatDateTime(detailOrder.paid_at)}</dd></div>
              </dl>
            </section>

            <section>
              <h4>Ghi chú admin</h4>
              <p className="order-detail-note">{detailOrder.admin_note || 'Chưa có ghi chú.'}</p>
            </section>

            {gatewayPayload(detailOrder) ? (
              <details className="order-payload">
                <summary>Payload cổng thanh toán</summary>
                <pre>{JSON.stringify(gatewayPayload(detailOrder), null, 2)}</pre>
              </details>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(editingOrder)}
        title={editingOrder ? `Cập nhật ${editingOrder.order_code}` : 'Cập nhật đơn hàng'}
        onClose={() => setEditingOrder(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditingOrder(null)} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" form="order-edit-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        {editingOrder && (
          <form id="order-edit-form" className="form" onSubmit={onEditSubmit}>
            <label className="field">
              <span>Trạng thái</span>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as OrderStatus)}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Mã giao dịch</span>
              <input
                value={editTransactionId}
                maxLength={120}
                placeholder="Mã MoMo/AppotaPay hoặc mã giao dịch ví thủ công"
                onChange={(e) => setEditTransactionId(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Ghi chú admin</span>
              <textarea
                rows={4}
                value={editNote}
                maxLength={1000}
                placeholder="Ví dụ: đã đối soát ví MoMo lúc 10:30"
                onChange={(e) => setEditNote(e.target.value)}
              />
            </label>
            {editStatus === 'paid' && (
              <p className="field-hint">
                Khi lưu trạng thái đã thanh toán, hệ thống sẽ tự set thời gian thanh toán nếu đơn chưa có.
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
