import { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';

const REL_TYPES = ['Parent', 'Child', 'Spouse', 'Sibling', 'Grandparent', 'Grandchild', 'Uncle/Aunt', 'Niece/Nephew'];

const REL_ICON = {
  Parent: '⬆️', Child: '⬇️', Spouse: '💑',
  Sibling: '↔️', Grandparent: '⬆️⬆️', Grandchild: '⬇️⬇️',
  'Uncle/Aunt': '↗️', 'Niece/Nephew': '↘️',
};

export default function RelationshipManager({ memberId, memberName }) {
  const api = useApi();

  // Existing relationships
  const [rels,    setRels]    = useState([]);
  const [relsLoading, setRelsLoading] = useState(true);

  // Add-new form state
  const [adding,  setAdding]  = useState(false);
  const [relType, setRelType] = useState('Child');
  const [search,  setSearch]  = useState('');
  const [results, setResults] = useState([]);
  const [picked,  setPicked]  = useState(null);  // selected member object
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const searchRef = useRef(null);

  // ── Load existing relationships ──────────────────────────
  const loadRels = async () => {
    setRelsLoading(true);
    const [data, err] = await api.get(`/members/${memberId}/relationships`);
    if (!err) setRels(Array.isArray(data) ? data : []);
    setRelsLoading(false);
  };

  useEffect(() => {
    if (memberId) loadRels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  // ── Live member search ───────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const [data] = await api.get(`/members?search=${encodeURIComponent(search)}`);
      if (data) setResults(data.filter(m => String(m.id) !== String(memberId)));
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, memberId]);

  // ── Create relationship ──────────────────────────────────
  const handleAdd = async () => {
    if (!picked) return;
    setSaving(true);
    setError(null);
    const [, err] = await api.post(`/members/${memberId}/relationships`, {
      member2_id: picked.id,
      relationship_type: relType,
    });
    if (err) {
      setError(typeof err === 'string' ? err : 'Could not save. This link may already exist.');
    } else {
      setAdding(false);
      setSearch('');
      setResults([]);
      setPicked(null);
      loadRels();
    }
    setSaving(false);
  };

  // ── Delete relationship ──────────────────────────────────
  const handleDelete = async (relId) => {
    if (!window.confirm('Remove this relationship?')) return;
    const [, err] = await api.delete(`/members/${memberId}/relationships/${relId}`);
    if (!err) loadRels();
  };

  // ── Helpers ──────────────────────────────────────────────
  const getOtherMember = (rel) =>
    String(rel.member1_id) === String(memberId) ? rel.member2 : rel.member1;

  // ── Render ───────────────────────────────────────────────
  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
          Showing all connections for <strong>{memberName}</strong>.
        </p>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setTimeout(() => searchRef.current?.focus(), 50); }}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            + Add Relationship
          </button>
        )}
      </div>

      {/* Add-new form */}
      {adding && (
        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: 14 }}>
            New Relationship
          </div>

          {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

          {/* Relationship type pills */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {memberName} is the…
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {REL_TYPES.map(t => (
                <button key={t} onClick={() => setRelType(t)}
                  style={{ padding: '6px 12px', borderRadius: 999, border: '1.5px solid', borderColor: relType === t ? 'var(--accent)' : '#e2e8f0', background: relType === t ? 'var(--accent)' : 'var(--surface)', color: relType === t ? '#fff' : 'var(--text-2)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  {REL_ICON[t]} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Member search */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              …of which family member?
            </div>
            {picked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#eef2ff', borderRadius: 8, border: '1.5px solid var(--accent)' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)', flex: 1 }}>
                  {picked.name} {picked.chinese_name ? `(${picked.chinese_name})` : ''}
                </span>
                <button onClick={() => { setPicked(null); setSearch(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1rem' }}>✕</button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchRef}
                  type="text" value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Type a name to search…"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }}
                />
                {results.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                    {results.map(m => (
                      <div key={m.id} onClick={() => { setPicked(m); setSearch(''); setResults([]); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.875rem' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <span style={{ fontWeight: 600 }}>{m.name}</span>
                        {m.chinese_name && <span style={{ color: 'var(--text-2)', marginLeft: 6 }}>{m.chinese_name}</span>}
                        <span style={{ color: 'var(--text-3)', marginLeft: 6, fontSize: '0.8rem' }}>
                          {m.gender} {m.dob ? `· b.${m.dob.slice(0,4)}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary + actions */}
          {picked && (
            <div style={{ background: '#eef2ff', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600 }}>
              {memberName} is the <strong>{relType}</strong> of <strong>{picked.name}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={!picked || saving}
              style={{ padding: '9px 20px', background: picked ? 'var(--accent)' : '#e2e8f0', color: picked ? '#fff' : 'var(--text-3)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', cursor: picked ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Saving…' : 'Save Link'}
            </button>
            <button onClick={() => { setAdding(false); setSearch(''); setResults([]); setPicked(null); setError(null); }}
              style={{ padding: '9px 20px', background: 'transparent', color: 'var(--text-2)', border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing relationships list */}
      {relsLoading ? (
        <div style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Loading…</div>
      ) : rels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔗</div>
          <div style={{ fontSize: '0.9rem' }}>No relationships yet. Click <strong>+ Add Relationship</strong> above.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rels.map(rel => {
            const other = getOtherMember(rel);
            if (!other) return null;
            const isDeceased = !!other.dod;
            const initials = other.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
            return (
              <div key={rel.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1.5px solid #f1f5f9', borderRadius: 10, padding: '12px 14px' }}>
                {/* Avatar */}
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-light)', border: `2px solid ${isDeceased ? 'var(--deceased)' : 'var(--living)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent)', flexShrink: 0 }}>
                  {initials}
                </div>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-1)' }}>{other.name}</div>
                  {other.chinese_name && <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{other.chinese_name}</div>}
                </div>
                {/* Relationship type badge */}
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700 }}>
                  {REL_ICON[rel.relationship_type]} {rel.relationship_type}
                </span>
                {/* Delete */}
                <button onClick={() => handleDelete(rel.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '1.1rem', padding: '2px 4px', lineHeight: 1 }}
                  title="Remove relationship">
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
