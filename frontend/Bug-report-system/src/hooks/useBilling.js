import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

export function useBilling() {
  const [billing, setBilling] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBilling = useCallback(async () => {
    const token = localStorage.getItem('token');
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/billing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load billing info');
      }
      setBilling(data.billing);
    } catch (err) {
      setError(err.message);
      setBilling(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  return {
    billing,
    plan: billing?.plan,
    usage: billing?.usage,
    subscription: billing?.subscription,
    canUpgrade: billing?.canUpgrade ?? false,
    isLoading,
    error,
    refetch: fetchBilling,
  };
}
