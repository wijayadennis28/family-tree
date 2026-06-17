import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import Card from '../ui/Card';

export default function StatsOverview() {
  const api = useApi();
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

  if (loading) return <p>Loading stats…</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!stats) return <p>No data.</p>;

  return (
    <div className="stats-dashboard">
      <h2>Family Tree Statistics</h2>
      <div className="stats-grid">
        <Card title="Total Members" value={stats.total_members} />
        <Card title="Living" value={stats.living_members} />
        <Card title="Deceased" value={stats.deceased_members} />
        <Card title="Generations" value={stats.generations} />
        <Card title="Largest Branch" value={stats.largest_branch_name} />
      </div>
    </div>
  );
}
