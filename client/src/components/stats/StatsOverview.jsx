import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../ui/Card';

export default function StatsOverview() {
  const api = useApi();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [data, err] = await api.get('/stats');
      if (err) setError(err);
      else setStats(data);
      setLoading(false);
    };
    load();
  }, [api]);

  if (loading) return <p>{t('common.loading')}</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!stats) return <p>{t('common.noData')}</p>;

  return (
    <div className="stats-dashboard">
      <h2>{t('stats.title')}</h2>
      <div className="stats-grid">
        <Card title={t('stats.totalMembers')} value={stats.total_members} />
        <Card title={t('stats.living')} value={stats.living_members} />
        <Card title={t('stats.deceased')} value={stats.deceased_members} />
        <Card title={t('stats.generations')} value={stats.generations} />
        <Card title={t('stats.largestBranch')} value={stats.largest_branch_name} />
      </div>
    </div>
  );
}
