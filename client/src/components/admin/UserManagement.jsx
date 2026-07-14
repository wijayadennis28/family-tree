import { useEffect, useState } from 'react';
import { Plus, Spinner, Trash, Pencil, X, Check } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

const ROLES = ['Super Admin', 'Family Admin', 'Family Member', 'Viewer'];
const FAMILY_ROLES = ['Admin', 'Editor', 'Member', 'Viewer'];

const inputClass = "w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-[0.95rem] text-ft-text-1 bg-ft-surface-2 outline-none transition-all duration-200 focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 focus:bg-white placeholder:text-ft-text-3";
const labelClass = "block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider";

function Field({ label, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function UserManagement() {
  const api = useApi();
  const toast = useToast();
  const { t } = useLanguage();

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const emptyForm = {
    name: '',
    email: '',
    password: '',
    role: 'Family Member',
    family_roles: [],
  };
  const [form, setForm] = useState(emptyForm);

  const loadUsers = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', currentPage);
    if (currentSearch.trim()) params.set('search', currentSearch.trim());
    const [resp] = await api.get(`/users?${params.toString()}`);
    if (resp) {
      setUsers(resp.data || []);
      setLastPage(resp.last_page || 1);
    }
    setLoading(false);
  };

  const loadBranches = async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    const [data, err] = await api.get('/branches');
    if (err) {
      setBranchesError(t('userManagement.loadFamiliesError'));
    } else {
      setBranches(data || []);
    }
    setBranchesLoading(false);
  };

  useEffect(() => {
    loadUsers();
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
    loadUsers(1, e.target.value);
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'Family Member',
      family_roles: ((user.family_access || user.familyAccess || [])).map(a => ({
        branch_id: a.branch_id,
        role: a.role,
        is_primary: a.is_primary,
      })),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addFamilyRole = () => {
    setForm(prev => ({
      ...prev,
      family_roles: [...prev.family_roles, { branch_id: '', role: 'Member', is_primary: prev.family_roles.length === 0 }],
    }));
  };

  const updateFamilyRole = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.family_roles];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'is_primary' && value) {
        updated.forEach((r, i) => { if (i !== index) r.is_primary = false; });
      }
      return { ...prev, family_roles: updated };
    });
  };

  const removeFamilyRole = (index) => {
    setForm(prev => {
      const updated = prev.family_roles.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some(r => r.is_primary)) {
        updated[0].is_primary = true;
      }
      return { ...prev, family_roles: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      family_roles: form.family_roles.filter(r => r.branch_id),
    };
    if (form.password) payload.password = form.password;

    const [, err] = editingUser
      ? await api.put(`/users/${editingUser.id}`, payload)
      : await api.post('/users', payload);

    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('userManagement.saveError'), 'error');
    } else {
      toast.addToast(editingUser ? t('userManagement.updated') : t('userManagement.created'), 'success');
      closeModal();
      loadUsers(page, search);
    }
    setSaving(false);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(t('userManagement.deleteConfirm', { name: user.name }))) return;
    const [, err] = await api.delete(`/users/${user.id}`);
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('userManagement.deleteError'), 'error');
    } else {
      toast.addToast(t('userManagement.deleted'), 'success');
      loadUsers(page, search);
    }
  };

  return (
    <div className="min-h-full bg-ft-bg p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">{t('userManagement.title')}</h1>
            <p className="text-sm text-ft-text-3 mt-0.5">{t('userManagement.subtitle')}</p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ft-accent text-white text-sm font-bold hover:bg-ft-accent-hover active:scale-[0.98] transition-all"
          >
            <Plus /> {t('userManagement.addUser')}
          </button>
        </div>

        {/* Search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-ft-sm mb-6">
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder={t('userManagement.searchPlaceholder')}
            className={inputClass}
          />
        </div>

        {/* Users table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-ft-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-ft-text-2">
              <Spinner className="animate-spin" /> {t('userManagement.loadingUsers')}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-ft-text-3 text-sm">{t('userManagement.noUsers')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-ft-surface-2 text-ft-text-2 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t('userManagement.name')}</th>
                    <th className="px-4 py-3 font-semibold">{t('userManagement.email')}</th>
                    <th className="px-4 py-3 font-semibold">{t('userManagement.role')}</th>
                    <th className="px-4 py-3 font-semibold">{t('userManagement.families')}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-ft-surface-2/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-ft-text-1">{user.name}</td>
                      <td className="px-4 py-3 text-ft-text-2">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-ft-accent-light text-ft-accent text-xs font-bold">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ft-text-2">
                        {user.role === 'Super Admin'
                          ? t('userManagement.allFamilies')
                          : (user.family_access || []).map(a => a.branch?.name || a.branch_name).filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {user.role !== 'Super Admin' && (
                            <>
                              <button
                                onClick={() => openEdit(user)}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ft-text-2 hover:text-ft-accent hover:bg-ft-accent-light transition-colors"
                                title={t('common.edit')}
                              >
                                <Pencil />
                              </button>
                              <button
                                onClick={() => handleDelete(user)}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ft-text-2 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title={t('common.delete')}
                              >
                                <Trash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <button
                onClick={() => { setPage(p => p - 1); loadUsers(page - 1, search); }}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-ft-text-2 text-xs font-semibold hover:bg-ft-surface-2 disabled:opacity-50"
              >
                {t('common.previous')}
              </button>
              <span className="text-xs text-ft-text-3 font-medium">{t('common.pageOf', { page, lastPage })}</span>
              <button
                onClick={() => { setPage(p => p + 1); loadUsers(page + 1, search); }}
                disabled={page >= lastPage}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-ft-text-2 text-xs font-semibold hover:bg-ft-surface-2 disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-ft-text-1">
                {editingUser ? t('userManagement.editUser') : t('userManagement.addUser')}
              </h2>
              <button onClick={closeModal} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-ft-text-3 hover:bg-ft-surface-2">
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={`${t('userManagement.fullName')} *`} htmlFor="name" className="sm:col-span-2">
                  <input id="name" name="name" type="text" value={form.name} onChange={handleChange} required className={inputClass} />
                </Field>
                <Field label={`${t('userManagement.email')} *`} htmlFor="email" className="sm:col-span-2">
                  <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required className={inputClass} />
                </Field>
                <Field label={editingUser ? t('userManagement.newPasswordHint') : `${t('userManagement.password')} *`} htmlFor="password">
                  <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required={!editingUser} className={inputClass} />
                </Field>
                <Field label={`${t('userManagement.globalRole')} *`} htmlFor="role">
                  <select id="role" name="role" value={form.role} onChange={handleChange} className={inputClass}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              </div>

              {/* Family roles */}
              <div className="bg-ft-surface-2/30 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-extrabold text-ft-text-1">{t('userManagement.familyAccess')}</h3>
                  <button
                    type="button"
                    onClick={addFamilyRole}
                    disabled={branchesLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ft-accent text-white text-xs font-bold hover:bg-ft-accent-hover transition-colors disabled:opacity-60"
                  >
                    <Plus /> {t('userManagement.addFamily')}
                  </button>
                </div>

                {branchesError && <div className="text-xs text-red-600 mb-3">{branchesError}</div>}
                {branchesLoading && <div className="text-xs text-ft-text-3 mb-3"><Spinner className="animate-spin inline mr-1" /> {t('userManagement.loadingFamilies')}</div>}

                {form.family_roles.length === 0 ? (
                  <p className="text-xs text-ft-text-3">{t('userManagement.noFamilyAccess')}</p>
                ) : (
                  <div className="space-y-3">
                    {form.family_roles.map((role, idx) => (
                      <div key={idx} className="flex flex-wrap items-end gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                        <div className="flex-1 min-w-[160px]">
                          <label className={labelClass}>{t('userManagement.family')}</label>
                          <select
                            value={role.branch_id}
                            onChange={e => updateFamilyRole(idx, 'branch_id', e.target.value)}
                            disabled={branchesLoading}
                            className={inputClass}
                          >
                            <option value="">{t('userManagement.selectFamily')}</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <div className="w-32">
                          <label className={labelClass}>{t('userManagement.role')}</label>
                          <select
                            value={role.role}
                            onChange={e => updateFamilyRole(idx, 'role', e.target.value)}
                            className={inputClass}
                          >
                            {FAMILY_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateFamilyRole(idx, 'is_primary', true)}
                          className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-colors ${
                            role.is_primary
                              ? 'bg-ft-accent text-white border-ft-accent'
                              : 'bg-white text-ft-text-2 border-slate-200 hover:border-ft-accent'
                          }`}
                        >
                          {role.is_primary ? <><Check /> {t('userManagement.primary')}</> : t('userManagement.setPrimary')}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFamilyRole(idx)}
                          className="px-3 py-2.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-ft-text-2 font-bold text-sm hover:bg-ft-surface-2 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-ft-accent text-white font-bold text-sm hover:bg-ft-accent-hover disabled:opacity-60 transition-colors inline-flex items-center gap-2"
                >
                  {saving ? <><Spinner className="animate-spin" /> {t('common.saving')}</> : (editingUser ? t('common.saveChanges') : t('userManagement.createUser'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
