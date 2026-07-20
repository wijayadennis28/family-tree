import { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Plus, Spinner, TreeStructure, Users, UserPlus, Check,
  Pencil, Trash, X, DotsThreeVertical, House, GitBranch,
  ShareNetwork,
} from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { buildFamilyTreeUrl, buildPublicFamilyTreeUrl } from '../../utils/treeUrl';


// ── Reusable modal shell ─────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-[fade-in_150ms_ease-out]">
      <div className="bg-white rounded-2xl shadow-ft-lg w-full max-w-md overflow-hidden animate-[modal-pop-in_200ms_ease-out]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-extrabold text-ft-text-1">{title}</h2>
          <button onClick={onClose} className="text-ft-text-3 hover:text-ft-text-1 transition-colors p-1 rounded-lg hover:bg-slate-100">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ── Family form modal ────────────────────────────────────────────
function FamilyModal({ family, onSave, onClose, saving }) {
  const { t } = useLanguage();
  const [name, setName] = useState(family?.name || '');
  const [description, setDescription] = useState(family?.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() || null });
  };

  return (
    <Modal title={family ? t('families.editFamily') : t('families.newFamily')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider">{t('families.familyName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('families.placeholderFamilyName')}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-ft-text-1 bg-ft-surface-2 outline-none focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 transition-all"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider">{t('families.description')}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('families.placeholderDescription')}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-ft-text-1 bg-ft-surface-2 outline-none focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 transition-all"
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-ft-text-2 text-sm font-bold hover:bg-ft-surface-2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg bg-ft-accent text-white text-sm font-bold hover:bg-ft-accent-hover disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {saving ? <><Spinner className="animate-spin" /> {t('common.saving')}</> : family ? t('common.saveChanges') : t('families.createFamily')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Branch form modal ──────────────────────────────────────────
function BranchModal({ branch, familyId, families, onSave, onClose, saving }) {
  const { t } = useLanguage();
  const [familyIdState, setFamilyIdState] = useState(branch?.family_id || familyId || '');
  const [name, setName] = useState(branch?.name || '');
  const [description, setDescription] = useState(branch?.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !familyIdState) return;
    onSave({
      family_id: Number(familyIdState),
      name: name.trim(),
      description: description.trim() || null,
    });
  };

  return (
    <Modal title={branch ? t('families.editBranch') : t('families.newBranch')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider">{t('families.family')}</label>
          <select
            value={familyIdState}
            onChange={(e) => setFamilyIdState(e.target.value)}
            disabled={!!branch || !!familyId}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-ft-text-1 bg-ft-surface-2 outline-none focus:border-ft-accent disabled:opacity-60"
          >
            <option value="">{t('families.selectFamily')}</option>
            {families.map(family => (
              <option key={family.id} value={family.id}>{family.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider">{t('families.branchName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('families.placeholderBranchName')}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-ft-text-1 bg-ft-surface-2 outline-none focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 transition-all"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider">{t('families.description')}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('families.placeholderDescription')}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-ft-text-1 bg-ft-surface-2 outline-none focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 transition-all"
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-ft-text-2 text-sm font-bold hover:bg-ft-surface-2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || !familyIdState}
            className="px-4 py-2 rounded-lg bg-ft-accent text-white text-sm font-bold hover:bg-ft-accent-hover disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {saving ? <><Spinner className="animate-spin" /> {t('common.saving')}</> : branch ? t('common.saveChanges') : t('families.createBranch')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete confirmation modal ────────────────────────────────────
function DeleteModal({ title, message, onConfirm, onClose, deleting }) {
  const { t } = useLanguage();
  return (
    <Modal title={title} onClose={onClose}>
      <div className="p-5 space-y-5">
        <p className="text-sm text-ft-text-2">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg border border-slate-200 text-ft-text-2 text-sm font-bold hover:bg-ft-surface-2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {deleting ? <><Spinner className="animate-spin" /> {t('families.deleting')}</> : <><Trash /> {t('common.delete')}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Dropdown menu for family actions ───────────────────────────
function FamilyActionsMenu({ onEdit, onDelete }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-ft-text-3 hover:text-ft-text-1 hover:bg-slate-100 transition-colors"
        aria-label="Family actions"
      >
        <DotsThreeVertical />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-ft-md py-1 z-20 animate-[fade-in_100ms_ease-out]">
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full text-left px-4 py-2 text-sm text-ft-text-2 hover:bg-ft-surface-2 hover:text-ft-accent flex items-center gap-2 transition-colors"
          >
            <Pencil className="text-xs" /> {t('common.edit')}
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
            <Trash className="text-xs" /> {t('common.delete')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function Families() {
  const api = useApi();
  const toast = useToast();
  const { t } = useLanguage();
  const { hasAbility, activeFamily, setActiveFamily, refreshUser } = useContext(AuthContext);

  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);

  const [familyModal, setFamilyModal] = useState(null); // null | { family }
  const [branchModal, setBranchModal] = useState(null); // null | { branch, familyId }
  const [deleteModal, setDeleteModal] = useState(null); // null | { type, item }

  const load = useCallback(async () => {
    setLoading(true);
    const [data, err] = await api.get('/families');
    if (err) {
      toast.addToast(t('families.loadError'), 'error');
      setFamilies([]);
    } else {
      setFamilies(data ?? []);
    }
    setLoading(false);
  }, [api, toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateFamily = async (data) => {
    setSaving(true);
    const [, err] = await api.post('/families', data);
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('families.createError'), 'error');
    } else {
      toast.addToast(t('families.created'), 'success');
      setFamilyModal(null);
      await refreshUser();
      await load();
    }
    setSaving(false);
  };

  const handleUpdateFamily = async (data) => {
    setSaving(true);
    const [, err] = await api.put(`/families/${familyModal.family.id}`, data);
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('families.updateError'), 'error');
    } else {
      toast.addToast(t('families.updated'), 'success');
      setFamilyModal(null);
      await load();
    }
    setSaving(false);
  };

  const handleDeleteFamily = async () => {
    setSaving(true);
    const { item } = deleteModal;
    const [, err] = await api.delete(`/families/${item.id}`);
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('families.deleteError'), 'error');
    } else {
      toast.addToast(t('families.deleted'), 'success');
      if (activeFamily?.id === item.id) {
        setActiveFamily(null);
      }
      setDeleteModal(null);
      await load();
    }
    setSaving(false);
  };

  const handleCreateBranch = async (data) => {
    setSaving(true);
    const [, err] = await api.post('/branches', data);
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('families.branchCreateError'), 'error');
    } else {
      toast.addToast(t('families.branchCreated'), 'success');
      setBranchModal(null);
      await load();
    }
    setSaving(false);
  };

  const handleUpdateBranch = async (data) => {
    setSaving(true);
    const [, err] = await api.put(`/branches/${branchModal.branch.id}`, data);
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('families.branchUpdateError'), 'error');
    } else {
      toast.addToast(t('families.branchUpdated'), 'success');
      setBranchModal(null);
      await load();
    }
    setSaving(false);
  };

  const handleDeleteBranch = async () => {
    setSaving(true);
    const { item } = deleteModal;
    const [, err] = await api.delete(`/branches/${item.id}`);
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('families.branchDeleteError'), 'error');
    } else {
      toast.addToast(t('families.branchDeleted'), 'success');
      setDeleteModal(null);
      await load();
    }
    setSaving(false);
  };

  const handleSelect = (family) => {
    setActiveFamily(family);
    toast.addToast(t('families.activeFamily', { name: family.name }), 'success');
  };

  const isActive = (family) => activeFamily?.id === family.id;

  const canManageFamily = (familyId) => hasAbility('manage_branches', familyId);
  const canEditFamily = (familyId) => hasAbility('edit_family', familyId);
  const canDeleteFamily = (familyId) => hasAbility('delete_family', familyId);
  const canEditBranch = (familyId) => hasAbility('edit_branch', familyId);
  const canDeleteBranch = (familyId) => hasAbility('delete_branch', familyId);

  return (
    <div className="min-h-full bg-ft-bg">
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-pop-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">{t('families.title')}</h1>
            <p className="text-sm text-ft-text-3 mt-0.5">{t('families.subtitle')}</p>
          </div>

          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ft-accent text-white text-sm font-bold hover:bg-ft-accent-hover active:scale-[0.98] transition-all shadow-ft-sm"
            >
              <Plus /> {t('common.create')} <span className="hidden sm:inline">{t('common.new')}</span>
            </button>
            {createMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-ft-md py-1 z-20 animate-[fade-in_100ms_ease-out]">
                <button
                  onClick={() => { setCreateMenuOpen(false); setFamilyModal({ family: null }); }}
                  className="w-full text-left px-4 py-3 text-sm text-ft-text-2 hover:bg-ft-surface-2 hover:text-ft-accent flex items-center gap-3 transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg bg-ft-accent-light text-ft-accent flex items-center justify-center"><House /></span>
                  <span className="font-semibold">{t('families.newFamily')}</span>
                </button>
                <button
                  onClick={() => { setCreateMenuOpen(false); setBranchModal({ branch: null, familyId: null }); }}
                  className="w-full text-left px-4 py-3 text-sm text-ft-text-2 hover:bg-ft-surface-2 hover:text-ft-accent flex items-center gap-3 transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg bg-ft-accent-light text-ft-accent flex items-center justify-center"><GitBranch /></span>
                  <span className="font-semibold">{t('families.newBranch')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-24 lg:pb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-48 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-6" />
                <div className="flex gap-2 mb-6">
                  <div className="h-8 bg-slate-200 rounded w-20" />
                  <div className="h-8 bg-slate-200 rounded w-20" />
                </div>
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : families.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-ft-accent-light text-ft-accent flex items-center justify-center text-2xl mb-4">
              <House />
            </div>
            <h2 className="text-xl font-bold text-ft-text-1 mb-1">{t('families.noFamilies')}</h2>
            <p className="text-sm text-ft-text-3 mb-6 max-w-md">{t('families.noFamiliesHint')}</p>
            <button
              onClick={() => setFamilyModal({ family: null })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ft-accent text-white font-bold text-sm hover:bg-ft-accent-hover transition-colors"
            >
              <Plus /> {t('families.createFamily')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {families.map((family) => (
              <div
                key={family.id}
                className={`relative bg-white border rounded-2xl p-5 transition-all duration-200 hover:shadow-ft-md ${
                  isActive(family)
                    ? 'border-ft-accent bg-ft-accent-light/20'
                    : 'border-slate-200 hover:border-ft-accent/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-ft-text-1 text-lg truncate">{family.name}</h3>
                      {isActive(family) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ft-accent text-white text-xs font-bold">
                          <Check /> {t('families.active')}
                        </span>
                      )}
                    </div>
                    {family.description && <p className="text-xs text-ft-text-3 truncate">{family.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(canEditFamily(family.id) || canDeleteFamily(family.id)) && (
                      <FamilyActionsMenu
                        onEdit={() => setFamilyModal({ family })}
                        onDelete={() => setDeleteModal({ type: 'family', item: family })}
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-ft-text-2 text-xs font-semibold">
                    <Users className="text-ft-accent" />
                    {family.members_count ?? family.members?.length ?? 0} {t('families.membersLabel')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-ft-text-2 text-xs font-semibold">
                    <TreeStructure className="text-ft-accent" />
                    {family.branches?.length || 0} {t('families.branchesLabel')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {!isActive(family) && (
                    <button
                      onClick={() => handleSelect(family)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ft-accent text-white text-xs font-bold hover:bg-ft-accent-hover transition-colors"
                    >
                      <Check /> {t('families.select')}
                    </button>
                  )}
                  <Link
                    to="/people"
                    onClick={() => handleSelect(family)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-ft-text-2 text-xs font-bold no-underline hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-colors"
                  >
                    <Users /> {t('common.people')}
                  </Link>
                  <Link
                    to="/people/new"
                    onClick={() => handleSelect(family)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-ft-text-2 text-xs font-bold no-underline hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-colors"
                  >
                    <UserPlus /> {t('people.addMember')}
                  </Link>
                  <Link
                    to={buildFamilyTreeUrl(family)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-ft-text-2 text-xs font-bold no-underline hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-colors"
                  >
                    <TreeStructure /> {t('families.familyTree')}
                  </Link>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}${buildPublicFamilyTreeUrl(family)}`;
                      navigator.clipboard.writeText(url).then(() => toast.addToast(t('families.publicLinkCopied'), 'success'));
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-ft-text-2 text-xs font-bold hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-colors"
                  >
                    <ShareNetwork /> {t('families.publicLink')}
                  </button>
                  <Link
                    to={`/families/${family.id}/branches`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-ft-text-2 text-xs font-bold no-underline hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-colors"
                  >
                    <GitBranch /> {t('common.branches')}
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-ft-text-3 uppercase tracking-wider">{t('common.branches')}</h4>
                    {canManageFamily(family.id) && (
                      <button
                        onClick={() => setBranchModal({ branch: null, familyId: family.id })}
                        className="text-xs font-bold text-ft-accent hover:text-ft-accent-hover flex items-center gap-1 transition-colors"
                      >
                        <Plus /> {t('families.addBranch')}
                      </button>
                    )}
                  </div>

                  {family.branches?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {family.branches.map(branch => (
                        <span
                          key={branch.id}
                          className="group inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-ft-surface-2 border border-slate-200 text-ft-text-2 hover:border-ft-accent/30 transition-colors"
                        >
                          <GitBranch className="text-ft-accent" />
                          <span>{branch.name}</span>
                          {canEditBranch(family.id) && (
                            <button
                              onClick={() => setBranchModal({ branch, familyId: family.id })}
                              className="text-ft-text-3 hover:text-ft-accent opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit branch"
                            >
                              <Pencil />
                            </button>
                          )}
                          {canDeleteBranch(family.id) && (
                            <button
                              onClick={() => setDeleteModal({ type: 'branch', item: branch })}
                              className="text-ft-text-3 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete branch"
                            >
                              <Trash />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ft-text-3 italic">{t('families.noBranches')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {familyModal && (
        <FamilyModal
          family={familyModal.family}
          onSave={familyModal.family ? handleUpdateFamily : handleCreateFamily}
          onClose={() => setFamilyModal(null)}
          saving={saving}
        />
      )}

      {branchModal && (
        <BranchModal
          branch={branchModal.branch}
          familyId={branchModal.familyId}
          families={families}
          onSave={branchModal.branch ? handleUpdateBranch : handleCreateBranch}
          onClose={() => setBranchModal(null)}
          saving={saving}
        />
      )}

      {deleteModal && (
        <DeleteModal
          title={deleteModal.type === 'family' ? t('families.deleteFamily') : t('families.deleteBranch')}
          message={
            deleteModal.type === 'family'
              ? t('families.deleteFamilyConfirm', { name: deleteModal.item.name })
              : t('families.deleteBranchConfirm', { name: deleteModal.item.name })
          }
          onConfirm={deleteModal.type === 'family' ? handleDeleteFamily : handleDeleteBranch}
          onClose={() => setDeleteModal(null)}
          deleting={saving}
        />
      )}
    </div>
  );
}
