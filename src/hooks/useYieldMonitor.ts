import { useState, useEffect } from 'react';
import yieldMonitorService from '@/services/vaultService';
import { DailyMetric, DailyMetricsResponse } from '@/services/config';

export const useYieldMonitor = () => {
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response: DailyMetricsResponse = await yieldMonitorService.getDailyMetrics();
      setDailyMetrics(response.daily_data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch daily metrics');
      console.error('Error fetching daily metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyMetrics();
  }, []);

  return {
    dailyMetrics,
    isLoading,
    error,
    refetch: fetchDailyMetrics,
  };
};