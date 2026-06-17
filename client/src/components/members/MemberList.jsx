import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useApi } from '../../hooks/useApi';

export default function MemberList() {
  const api      = useApi();
  const pageRef  = useRef(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [error,   setError]   = useState(null);

  useEffect(() => {
    gsap.fromTo(pageRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter === 'living')   params.set('living', 'true');
      if (filter === 'deceased') params.set('living', 'false');
      const [data, err] = await api.get(`/members?${params}`);
      if (err) setError(typeof err === 'string' ? err : 'Could not load members.');
      else setMembers(data);
      setLoading(false);
    };
    const t = setTimeout(load, 300); // debounce search
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter]);

  const genderColor = { Male: 'var(--male)', Female: 'var(--female)', Other: 'var(--other)' };

  return (
    <div ref={pageRef} style={{ padding: '32px 32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-1)' }}>Family Members</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: 2 }}>{members.length} people</p>
        </div>
        <Link to="/members/new" className="btn-primary" style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
          + Add Member
        </Link>
      </div>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="text" placeholder="Search by name…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }}
        />
        {['all','living','deceased'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '10px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: filter === f ? 'var(--accent)' : 'var(--surface)', color: filter === f ? '#fff' : 'var(--text-2)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Loading */}
      {loading && (
        <div className="ft-loading" style={{ height: '40vh' }}>
          <div className="ft-loading-spinner" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && members.length === 0 && (
        <div className="tree-empty" style={{ height: '40vh' }}>
          <div className="tree-empty-icon">👥</div>
          <h2>No members yet</h2>
          <p>Click <strong>+ Add Member</strong> to add your first family member.</p>
        </div>
      )}

      {/* Member grid */}
      {!loading && members.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {members.map(m => {
            const isDeceased = !!m.dod;
            const initials = m.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
            return (
              <div key={m.id} style={{ background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '20px', borderTop: `3px solid ${genderColor[m.gender] || 'var(--accent)'}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Avatar + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: isDeceased ? '#e2e8f0' : 'var(--accent-light)', border: `3px solid ${isDeceased ? 'var(--deceased)' : 'var(--living)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', color: isDeceased ? 'var(--text-3)' : 'var(--accent)', flexShrink: 0 }}>
                    {m.photo ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)' }}>{m.name}</div>
                    {m.chinese_name && <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{m.chinese_name}</div>}
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '3px 8px', borderRadius: 999, background: isDeceased ? '#f1f5f9' : '#dcfce7', color: isDeceased ? 'var(--text-3)' : '#166534', fontWeight: 600 }}>
                    {isDeceased ? 'Deceased' : 'Living'}
                  </span>
                </div>

                {/* Details */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>{m.gender} {m.dob ? `· b. ${m.dob.slice(0,4)}` : ''} {m.dod ? `· d. ${m.dod.slice(0,4)}` : ''}</span>
                  {m.place_of_birth && <span>📍 {m.place_of_birth}</span>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Link to={`/tree/${m.id}`} style={{ flex: 1, textAlign: 'center', padding: '7px', borderRadius: 7, background: 'var(--accent-light)', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                    🌳 Tree
                  </Link>
                  <Link to={`/members/${m.id}/edit`} style={{ flex: 1, textAlign: 'center', padding: '7px', borderRadius: 7, border: '1.5px solid #e2e8f0', color: 'var(--text-2)', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
