import { useEffect, useState, useContext, useCallback } from 'react';
import { Users, Plus, Trash, Spinner, Check, X } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

const ROLES = ['Admin', 'Editor', 'Member', 'Viewer'];

function Badge({ children, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    accent: 'bg-ft-accent-light text-ft-accent border-ft-accent/20',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
}

export default function RoleManager() {
  const api = useApi();
  const toast = useToast();
  const { t } = useLanguage();
  const { user: currentUser } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [usersData, branchesData] = await Promise.all([
      api.get('/users'),
      api.get('/branches'),
    ]);

    if (usersData[1]) toast.addToast(t('roleManager.loadUsersError'), 'error');
    else setUsers(usersData[0]?.data ?? []);

    if (branchesData[1]) toast.addToast(t('roleManager.loadFamiliesError'), 'error');
    else setBranches(branchesData[0] ?? []);

    setLoading(false);
  }, [api, toast, t]);

  const isSuperAdmin = currentUser?.role === 'Super Admin';
  // Super admins can manage all families; this flag can be used later
  // to show additional UI hints or bypass branch filtering.
  void isSuperAdmin;

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = users.filter(
    u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveAssignments = async (user, assignments) => {
    setSaving(true);
    const familyRoles = assignments
      .filter(a => a.branchId)
      .map(a => ({
        branch_id: Number(a.branchId),
        role: a.role,
        is_primary: a.isPrimary,
      }));

    const [, err] = await api.put(`/users/${user.id}`, {
      family_roles: familyRoles,
      primary_branch_id: assignments.find(a => a.isPrimary)?.branchId || null,
    });

    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('roleManager.saveError'), 'error');
    } else {
      toast.addToast(t('roleManager.saved'), 'success');
      await loadData();
    }
    setSaving(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">{t('roleManager.title')}</h1>
        <p className="text-sm text-ft-text-3 mt-1">
          {t('roleManager.subtitle')}
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder={t('roleManager.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-sm outline-none transition-all duration-200 focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 focus:bg-white bg-white text-ft-text-1 placeholder:text-ft-text-3"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4 text-ft-text-2">
          <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-ft-accent animate-spin" />
          <p className="text-sm">{t('roleManager.loadingUsers')}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-ft-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-ft-surface-2 text-ft-text-2 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('roleManager.user')}</th>
                <th className="px-4 py-3 font-semibold">{t('roleManager.globalRole')}</th>
                <th className="px-4 py-3 font-semibold">{t('roleManager.familyAssignments')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-ft-surface-2/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ft-text-1">{user.name}</div>
                    <div className="text-xs text-ft-text-3">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={user.role === 'Super Admin' ? 'red' : 'slate'}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {user.family_access?.length ? (
                        user.family_access.map(access => (
                          <Badge key={access.branch_id} color={access.is_primary ? 'accent' : 'slate'}>
                            {access.branch?.name || 'Family'} · {access.role}
                            {access.is_primary && <span className="ml-1 text-[10px]">★</span>}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-ft-text-3 text-xs italic">{t('roleManager.noFamiliesAssigned')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ft-accent text-white text-xs font-bold hover:bg-ft-accent-hover transition-colors"
                    >
                      <Users /> {t('roleManager.manage')}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ft-text-3 text-sm">
                    {t('roleManager.noUsers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && (
        <UserAssignmentModal
          user={selectedUser}
          branches={branches}
          onClose={() => setSelectedUser(null)}
          onSave={handleSaveAssignments}
          saving={saving}
        />
      )}
    </div>
  );
}

function UserAssignmentModal({ user, branches, onClose, onSave, saving }) {
  const { t } = useLanguage();
  const initialAssignments =
    user.family_access?.length
      ? user.family_access.map(a => ({
          branchId: a.branch_id,
          role: a.role,
          isPrimary: a.is_primary,
        }))
      : [{ branchId: '', role: 'Member', isPrimary: true }];

  const [assignments, setAssignments] = useState(initialAssignments);

  const addAssignment = () => {
    setAssignments(prev => [...prev, { branchId: '', role: 'Member', isPrimary: false }]);
  };

  const updateAssignment = (index, field, value) => {
    setAssignments(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeAssignment = (index) => {
    setAssignments(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some(a => a.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  };

  const setPrimary = (index) => {
    setAssignments(prev =>
      prev.map((a, i) => ({ ...a, isPrimary: i === index }))
    );
  };

  const handleSave = () => {
    onSave(user, assignments);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-ft-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-extrabold text-ft-text-1">{t('roleManager.manageFamilyAccess')}</h2>
          <button onClick={onClose} className="text-ft-text-3 hover:text-ft-text-1 transition-colors">
            <X />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-ft-text-2">
            <span className="font-semibold text-ft-text-1">{user.name}</span>
            <span className="text-ft-text-3"> · {user.email}</span>
          </div>

          {assignments.map((assignment, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl bg-ft-surface-2/30">
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider">{t('roleManager.family')}</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={assignment.branchId}
                      onChange={e => updateAssignment(index, 'branchId', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-ft-text-1 outline-none focus:border-ft-accent"
                    >
                      <option value="">{t('roleManager.selectFamily')}</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setPrimary(index)}
                      title={t('roleManager.setPrimary')}
                      className={`p-2 rounded-lg border transition-colors ${
                        assignment.isPrimary
                          ? 'bg-ft-accent-light border-ft-accent text-ft-accent'
                          : 'border-slate-200 text-ft-text-3 hover:text-ft-accent hover:border-ft-accent'
                      }`}
                    >
                      {assignment.isPrimary ? <Check /> : '★'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider">{t('roleManager.role')}</label>
                  <select
                    value={assignment.role}
                    onChange={e => updateAssignment(index, 'role', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-ft-text-1 outline-none focus:border-ft-accent"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => removeAssignment(index)}
                className="text-red-500 hover:text-red-600 p-1"
                title={t('roleManager.removeAssignment')}
              >
                <Trash />
              </button>
            </div>
          ))}

          <button
            onClick={addAssignment}
            className="w-full py-2 rounded-xl border border-dashed border-slate-300 text-ft-text-2 text-sm font-semibold hover:border-ft-accent hover:text-ft-accent transition-colors flex items-center justify-center gap-2"
          >
            <Plus /> {t('roleManager.addFamilyAssignment')}
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-ft-text-2 text-sm font-bold hover:bg-ft-surface-2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-ft-accent text-white text-sm font-bold hover:bg-ft-accent-hover disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {saving ? <><Spinner className="animate-spin" /> {t('common.saving')}</> : t('roleManager.saveAssignments')}
          </button>
        </div>
      </div>
    </div>
  );
}
