import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useApi } from '../../hooks/useApi';
import RelationshipManager from './RelationshipManager';

const EMPTY = {
  name: '', chinese_name: '', gender: 'Male',
  dob: '', dod: '', address: '', phone: '',
  email: '', biography: '', place_of_birth: '', place_of_death: '',
  is_active: true,
};

export default function MemberForm() {
  const { id }   = useParams();
  const api      = useApi();
  const navigate = useNavigate();
  const pageRef  = useRef(null);

  const [form,    setForm]    = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('details'); // 'details' | 'relationships'

  useEffect(() => {
    gsap.fromTo(pageRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }, []);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [data, err] = await api.get(`/members/${id}`);
      if (err) setError(typeof err === 'string' ? err : 'Could not load member.');
      else setForm({ ...EMPTY, ...data, dob: data.dob?.slice(0,10) ?? '', dod: data.dod?.slice(0,10) ?? '' });
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const [, err] = id
      ? await api.put(`/members/${id}`, form)
      : await api.post('/members', form);
    if (err) setError(typeof err === 'string' ? err : 'Save failed. Check all fields and try again.');
    else navigate('/members');
    setSaving(false);
  };

  if (loading) return (
    <div className="ft-loading" style={{ height: '60vh' }}>
      <div className="ft-loading-spinner" />
      <p>Loading member…</p>
    </div>
  );

  return (
    <div ref={pageRef} style={{ maxWidth: 680, margin: '32px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-1)' }}>
            {id ? 'Edit Member' : 'Add New Member'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: 2 }}>
            {id ? 'Update this family member\'s details.' : 'Fill in the details to add a new family member.'}
          </p>
        </div>
        <Link to="/members" className="btn-ghost" style={{ textDecoration: 'none', padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', color: 'var(--text-2)', fontSize: '0.875rem', fontWeight: 600 }}>
          ← Back
        </Link>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Tabs — only show when editing an existing member */}
      {id && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e2e8f0' }}>
          {[['details', '📝 Details'], ['relationships', '🔗 Relationships']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `3px solid ${tab === key ? 'var(--accent)' : 'transparent'}`, marginBottom: -2, fontWeight: tab === key ? 700 : 500, color: tab === key ? 'var(--accent)' : 'var(--text-2)', fontSize: '0.9rem', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Relationships tab */}
      {tab === 'relationships' && id && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: 24, marginBottom: 16 }}>
          <RelationshipManager memberId={id} memberName={form.name || 'This member'} />
        </div>
      )}

      {/* Details form — hidden when on relationships tab */}
      {tab === 'details' && (
        <form onSubmit={handleSubmit}>
        {/* Card: Basic Info */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Basic Information</div>

          <div style={rowStyle}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="name">Full Name *</label>
              <input id="name" name="name" type="text" value={form.name}
                onChange={handleChange} placeholder="e.g. John Smith" required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="chinese_name">Chinese Name</label>
              <input id="chinese_name" name="chinese_name" type="text" value={form.chinese_name}
                onChange={handleChange} placeholder="e.g. 陳大文" />
            </div>
          </div>

          <div style={rowStyle}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="gender">Gender *</label>
              <select id="gender" name="gender" value={form.gender} onChange={handleChange}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.95rem', background: 'var(--surface-2)', outline: 'none' }}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="place_of_birth">Place of Birth</label>
              <input id="place_of_birth" name="place_of_birth" type="text" value={form.place_of_birth}
                onChange={handleChange} placeholder="e.g. Hong Kong" />
            </div>
          </div>

          <div style={rowStyle}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="dob">Date of Birth</label>
              <input id="dob" name="dob" type="date" value={form.dob} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="dod">Date of Death <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(leave blank if living)</span></label>
              <input id="dod" name="dod" type="date" value={form.dod} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Card: Contact */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Contact Details</div>

          <div style={rowStyle}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="email@example.com" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" value={form.phone}
                onChange={handleChange} placeholder="+1 234 567 8900" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea id="address" name="address" value={form.address} onChange={handleChange}
              rows={2} placeholder="Street, City, Country"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Card: Biography */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Biography</div>

          <div className="form-group">
            <label htmlFor="biography">Biography / Notes</label>
            <textarea id="biography" name="biography" value={form.biography} onChange={handleChange}
              rows={4} placeholder="Write a brief story about this family member…"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div className="form-group">
            <label htmlFor="place_of_death">Place of Death</label>
            <input id="place_of_death" name="place_of_death" type="text" value={form.place_of_death}
              onChange={handleChange} placeholder="e.g. Toronto, Canada" />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
          <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Saving…' : (id ? 'Save Changes' : 'Add Member')}
          </button>
          <Link to="/members"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '13px', border: '1.5px solid #e2e8f0', borderRadius: 8, textDecoration: 'none', color: 'var(--text-2)', fontWeight: 600, fontSize: '0.95rem', background: 'var(--surface)' }}>
            Cancel
          </Link>
        </div>
      </form>
      )}
    </div>
  );
}

const cardStyle = {
  background: 'var(--surface)',
  borderRadius: 14,
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  padding: '24px',
  marginBottom: 16,
};
const sectionTitle = {
  fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 16,
};
const rowStyle = { display: 'flex', gap: 16 };
