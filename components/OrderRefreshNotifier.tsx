'use client';

import { useEffect } from 'react';

type Props = {
  orderCode: string;
  status: string;
};

const STORAGE_KEY = 'shop:orders-refresh';
export const ORDERS_REFRESH_EVENT = 'shop:orders-refresh';

export default function OrderRefreshNotifier({ orderCode, status }: Props) {
  useEffect(() => {
    const payload = JSON.stringify({
      orderCode,
      status,
      ts: Date.now(),
    });

    try {
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // Ignore storage failures; the custom event below still helps same-tab listeners.
    }

    window.dispatchEvent(new CustomEvent(ORDERS_REFRESH_EVENT, { detail: payload }));
  }, [orderCode, status]);

  return null;
}

export { STORAGE_KEY as ORDERS_REFRESH_STORAGE_KEY };
