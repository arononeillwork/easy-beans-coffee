import { useCallback, useState } from 'react';

const ORDER_KEY = 'ebc:admin:todo-order';

type UseTodoOrderResult = {
  order: string[];
  saveOrder: (ids: string[]) => void;
};

/** Persists the user's manual drag order (task ids) in localStorage. */
export function useTodoOrder(): UseTodoOrderResult {
  const [order, setOrder] = useState<string[]>(readOrder);

  const saveOrder = useCallback((ids: string[]): void => {
    setOrder(ids);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
    } catch {
      /* ignore storage write errors (private mode, quota, etc.) */
    }
  }, []);

  return { order, saveOrder };
}

function readOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}
