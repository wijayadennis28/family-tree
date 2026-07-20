import { useState, useEffect, useRef } from 'react';
import { Link, Pencil, Trash } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

import { REL_ICON, getRelTypeKey } from '../../utils/relationshipIcons';
import { getMemberInitials } from '../../utils/initials';
import { getLivingStatus } from '../../utils/livingStatus';
import RelationshipEditModal from './RelationshipEditModal';

const REL_TYPES = ['Parent', 'Child', 'Spouse', 'Sibling', 'Grandparent', 'Grandchild', 'Uncle/Aunt', 'Niece/Nephew'];

const inputClass = "w-full px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-sm text-ft-text-1 bg-white outline-none transition-all duration-200 focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 placeholder:text-ft-text-3";

export default function RelationshipManager({ memberId, memberName, familyId }) {
  const api = useApi();
  const toast = useToast();
  const { t } = useLanguage();

  const [rels,        setRels]        = useState([]);
  const [relsLoading, setRelsLoading] = useState(true);

  const [adding,  setAdding]  = useState(false);
  const [relType, setRelType] = useState('Child');
  const [memberOrder, setMemberOrder] = useState(1);
  const [childOrder, setChildOrder] = useState(0);
  const [search,  setSearch]  = useState('');
  const [results, setResults] = useState([]);
  const [picked,  setPicked]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const [editingRel, setEditingRel] = useState(null);

  const searchRef = useRef(null);

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

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const params = new URLSearchParams();
      params.set('search', search);
      if (familyId) params.set('family_id', familyId);
      const [data] = await api.get(`/members?${params}`);
      if (data) setResults(data.filter(m => String(m.id) !== String(memberId)));
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, memberId, familyId]);

  const handleAdd = async () => {
    if (!picked) return;
    setSaving(true);
    setError(null);
    const payload = {
      member2_id: picked.id,
      relationship_type: relType,
    };
    if (relType === 'Spouse') {
      payload.member_order = memberOrder;
    }
    if (relType === 'Child') {
      payload.member_order = childOrder;
    }
    const [, err] = await api.post(`/members/${memberId}/relationships`, payload);
    if (err) {
      setError(typeof err === 'string' ? err : t('relationshipManager.saveError'));
    } else {
      setAdding(false);
      setSearch('');
      setResults([]);
      setPicked(null);
      loadRels();
    }
    setSaving(false);
  };

  const handleDelete = async (relId) => {
    if (!window.confirm(t('relationshipManager.removeConfirm'))) return;
    const [, err] = await api.delete(`/members/${memberId}/relationships/${relId}`);
    if (!err) loadRels();
  };

  const handleUpdateMemberOrder = async (rel, newOrder) => {
    if (!['Spouse', 'Child', 'Parent'].includes(rel.relationship_type)) return;
    if (newOrder < 0) return;
    const [, err] = await api.put(`/relationships/${rel.id}`, { member_order: newOrder });
    if (!err) loadRels();
  };

  const handleDeleteGroup = async (relIds) => {
    if (!window.confirm(t('relationshipManager.removeGroupConfirm'))) return;
    const results = await Promise.all(relIds.map(id => api.delete(`/members/${memberId}/relationships/${id}`)));
    const hasError = results.some(([, err]) => err);
    if (hasError) {
      toast.addToast(t('relationshipManager.deleteGroupError'), 'error');
    }
    loadRels();
  };

  const getOtherMember = (rel) =>
    String(rel.member1_id) === String(memberId) ? rel.member2 : rel.member1;

  const getActualRelType = (rel) => {
    if (rel.relationship_type === 'Parent') {
      return String(rel.member2_id) === String(memberId) ? 'Parent' : 'Child';
    }
    if (rel.relationship_type === 'Grandparent') {
      return String(rel.member2_id) === String(memberId) ? 'Grandparent' : 'Grandchild';
    }
    if (rel.relationship_type === 'Uncle/Aunt') {
      return String(rel.member2_id) === String(memberId) ? 'Uncle/Aunt' : 'Niece/Nephew';
    }
    return rel.relationship_type;
  };

  const parentRels = rels.filter(r => r.relationship_type === 'Parent' && String(r.member2_id) === String(memberId));
  const otherRels = rels.filter(r => !(r.relationship_type === 'Parent' && String(r.member2_id) === String(memberId)));
  const displayItems = parentRels.length > 0
    ? [{ isParentGroup: true, id: 'parent-group', rels: parentRels }, ...otherRels]
    : otherRels;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ft-text-2">
          {t('relationshipManager.showingConnections', { name: memberName })}
        </p>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setTimeout(() => searchRef.current?.focus(), 50); }}
            className="px-4 py-2 bg-ft-accent text-white rounded-lg font-bold text-xs hover:bg-ft-accent-hover transition-colors duration-150 cursor-pointer shadow-ft-sm"
          >
            + {t('relationshipManager.addRelationship')}
          </button>
        )}
      </div>

      {/* Add-new form */}
      {adding && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5">
          <div className="font-bold text-sm text-ft-text-1 mb-3.5">
            {t('relationshipManager.newRelationship')}
          </div>

          {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm mb-3">{error}</div>}

          {/* Relationship type pills */}
          <div className="mb-3.5">
            <div className="text-xs font-semibold text-ft-text-3 uppercase tracking-wider mb-2">
              {t('relationshipManager.memberIsThe', { name: memberName })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REL_TYPES.map(type => (
                <button key={type} onClick={() => { setRelType(type); if (type !== 'Spouse') setMemberOrder(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px] text-xs font-semibold cursor-pointer transition-all duration-150 ${
                    relType === type
                      ? 'bg-ft-accent text-white border-ft-accent'
                      : 'bg-ft-surface text-ft-text-2 border-slate-200 hover:border-ft-accent hover:text-ft-accent'
                  }`}>
                  <span className="inline-flex items-center justify-center leading-none">{REL_ICON[type]}</span>
                  <span>{t(`relTypeModal.${getRelTypeKey(type)}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Spouse side selector */}
          {relType === 'Spouse' && (
            <div className="mb-3.5">
              <div className="text-xs font-semibold text-ft-text-3 uppercase tracking-wider mb-2">
                {t('relationshipManager.spouseSide')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setMemberOrder(0)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px] text-xs font-semibold cursor-pointer transition-all duration-150 ${
                    memberOrder === 0
                      ? 'bg-ft-accent text-white border-ft-accent'
                      : 'bg-ft-surface text-ft-text-2 border-slate-200 hover:border-ft-accent hover:text-ft-accent'
                  }`}>
                  {t('relationshipManager.leftOfMember', { name: memberName })}
                </button>
                <button onClick={() => setMemberOrder(1)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px] text-xs font-semibold cursor-pointer transition-all duration-150 ${
                    memberOrder === 1
                      ? 'bg-ft-accent text-white border-ft-accent'
                      : 'bg-ft-surface text-ft-text-2 border-slate-200 hover:border-ft-accent hover:text-ft-accent'
                  }`}>
                  {t('relationshipManager.rightOfMember', { name: memberName })}
                </button>
              </div>
            </div>
          )}

          {/* Child order selector */}
          {relType === 'Child' && (
            <div className="mb-3.5">
              <div className="text-xs font-semibold text-ft-text-3 uppercase tracking-wider mb-2">
                {t('relationshipManager.childOrder')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChildOrder(Math.max(0, childOrder - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-ft-text-2 hover:text-ft-accent hover:border-ft-accent hover:bg-ft-accent-light transition-all"
                >
                  –
                </button>
                <span className="w-10 text-center text-sm font-bold text-ft-text-1">{childOrder + 1}</span>
                <button
                  onClick={() => setChildOrder(childOrder + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-ft-text-2 hover:text-ft-accent hover:border-ft-accent hover:bg-ft-accent-light transition-all"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Member search */}
          <div className="mb-3">
            <div className="text-xs font-semibold text-ft-text-3 uppercase tracking-wider mb-1.5">
              {t('relationshipManager.ofWhichMember')}
            </div>
            {picked ? (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-ft-accent-light rounded-lg border-[1.5px] border-ft-accent">
                <span className="font-bold text-sm text-ft-accent flex-1">
                  {picked.name} {picked.chinese_name ? `(${picked.chinese_name})` : ''}
                </span>
                <button onClick={() => { setPicked(null); setSearch(''); }}
                  className="bg-transparent border-none cursor-pointer text-ft-text-3 text-base hover:text-ft-text-1 transition-colors">
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text" value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('relationshipManager.searchPlaceholder')}
                  className={inputClass}
                />
                {results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-[200px] overflow-y-auto mt-1 py-1">
                    {results.map(m => (
                      <div key={m.id} onClick={() => { setPicked(m); setSearch(''); setResults([]); }}
                        className="px-3.5 py-2.5 cursor-pointer border-b border-slate-50 last:border-b-0 text-sm hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-semibold text-ft-text-1">{m.name}</span>
                        {m.chinese_name && <span className="text-ft-text-2 ml-1.5">{m.chinese_name}</span>}
                        <span className="text-ft-text-3 ml-1.5 text-xs">
                          {m.gender ? t(`common.${m.gender.toLowerCase()}`) : ''} {m.dob ? `· ${t('relationshipManager.bornPrefix')}${m.dob.slice(0,4)}` : ''}
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
            <div className="bg-ft-accent-light rounded-lg px-3.5 py-2.5 mb-3.5 text-sm text-ft-accent font-semibold">
              {t('relationshipManager.summary', {
                memberName,
                relType: t(`relTypeModal.${getRelTypeKey(relType)}`),
                targetName: picked.name
              })}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!picked || saving}
              className={`px-5 py-2 rounded-lg font-bold text-sm border-none transition-all duration-150 cursor-pointer ${
                picked
                  ? 'bg-ft-accent text-white hover:bg-ft-accent-hover active:scale-[0.98]'
                  : 'bg-slate-200 text-ft-text-3 cursor-not-allowed'
              }`}>
              {saving ? t('common.saving') : t('relationshipManager.saveLink')}
            </button>
            <button onClick={() => { setAdding(false); setSearch(''); setResults([]); setPicked(null); setError(null); setMemberOrder(1); setChildOrder(0); }}
              className="px-5 py-2 bg-transparent text-ft-text-2 border-[1.5px] border-slate-200 rounded-lg font-semibold text-sm cursor-pointer hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-all duration-150">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Existing relationships list */}
      {relsLoading ? (
        <div className="text-sm text-ft-text-3">{t('common.loading')}</div>
      ) : rels.length === 0 ? (
        <div className="text-center px-4 py-8 text-ft-text-3">
          <Link className="w-10 h-10 mx-auto mb-2 text-ft-text-3" weight="duotone" />
          <div className="text-sm">{t('relationshipManager.empty')}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayItems.map(item => {
            if (item.isParentGroup) {
              const groupOrder = item.rels[0].member_order ?? 0;
              return (
                <div key={item.id} className="flex items-center gap-3 bg-ft-surface border border-slate-100 rounded-xl py-3 px-3.5 hover:shadow-ft-sm transition-shadow duration-150">
                  {/* Stacked avatars */}
                  <div className="flex -space-x-2 shrink-0">
                    {item.rels.map((rel, idx) => {
                      const parent = getOtherMember(rel);
                      const isDec = getLivingStatus(parent) === 'deceased';
                      return (
                        <div
                          key={rel.id}
                          className="w-9 h-9 rounded-full bg-ft-accent-light border-2 flex items-center justify-center text-xs font-bold text-ft-accent"
                          style={{
                            borderColor: isDec ? 'var(--deceased)' : 'var(--living)',
                            zIndex: item.rels.length - idx,
                          }}
                        >
                          {getMemberInitials(parent)}
                        </div>
                      );
                    })}
                  </div>
                  {/* Parent names */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {item.rels.map(rel => {
                      const parent = getOtherMember(rel);
                      return (
                        <div key={rel.id} className="flex items-center justify-between text-sm">
                          <div className="font-bold text-ft-text-1 truncate">{parent.name}</div>
                          <button
                            onClick={() => handleDelete(rel.id)}
                            className="bg-transparent border-none cursor-pointer text-slate-300 text-lg px-2 py-0 leading-none hover:text-red-400 transition-colors"
                            title={t('relationshipManager.removeRelationship')}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {/* Relationship badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ft-accent-light text-ft-accent text-xs font-bold shrink-0">
                    <span className="inline-flex items-center justify-center leading-none">{REL_ICON.Parent}</span>
                    <span>{t(item.rels.length > 1 ? 'relationshipManager.parents' : 'relTypeModal.parent')}</span>
                  </span>
                  {/* Birth order controls */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleUpdateMemberOrder(item.rels[0], Math.max(0, groupOrder - 1))}
                      className="w-6 h-6 flex items-center justify-center rounded text-xs border border-slate-200 text-ft-text-3 hover:text-ft-accent hover:border-ft-accent hover:bg-ft-accent-light transition-all"
                      title={t('relationshipManager.moveEarlier')}
                    >
                      ▲
                    </button>
                    <span className="text-[0.65rem] font-bold text-ft-text-3 w-4 text-center">
                      {groupOrder + 1}
                    </span>
                    <button
                      onClick={() => handleUpdateMemberOrder(item.rels[0], groupOrder + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded text-xs border border-slate-200 text-ft-text-3 hover:text-ft-accent hover:border-ft-accent hover:bg-ft-accent-light transition-all"
                      title={t('relationshipManager.moveLater')}
                    >
                      ▼
                    </button>
                  </div>
                  {/* Birth order is edited inline for parent groups */}
                  {/* Group delete */}
                  {item.rels.length > 1 && (
                    <button
                      onClick={() => handleDeleteGroup(item.rels.map(r => r.id))}
                      className="bg-transparent border-none cursor-pointer text-slate-300 text-base px-1 py-0 leading-none hover:text-red-400 transition-colors"
                      title={t('relationshipManager.removeGroup')}
                    >
                      <Trash />
                    </button>
                  )}
                </div>
              );
            }

            const rel = item;
            const actualType = getActualRelType(rel);
            const other = getOtherMember(rel);
            if (!other) return null;
            const isDeceased = getLivingStatus(other) === 'deceased';
            const initials = getMemberInitials(other);
            return (
              <div key={rel.id} className="flex items-center gap-3 bg-ft-surface border border-slate-100 rounded-xl py-3 px-3.5 hover:shadow-ft-sm transition-shadow duration-150">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-ft-accent-light border-2 flex items-center justify-center text-xs font-bold text-ft-accent shrink-0"
                  style={{ borderColor: isDeceased ? 'var(--deceased)' : 'var(--living)' }}>
                  {initials}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-ft-text-1 truncate">{other.name}</div>
                  {other.chinese_name && <div className="text-xs text-ft-text-2 truncate">{other.chinese_name}</div>}
                </div>
                {/* Relationship type badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ft-accent-light text-ft-accent text-xs font-bold shrink-0">
                  <span className="inline-flex items-center justify-center leading-none">{REL_ICON[actualType]}</span>
                  <span>{t(`relTypeModal.${getRelTypeKey(actualType)}`)}</span>
                </span>
                {/* Spouse side toggle */}
                {actualType === 'Spouse' && (
                  <button
                    onClick={() => handleUpdateMemberOrder(rel, rel.member_order === 0 ? 1 : 0)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 text-ft-text-2 hover:text-ft-accent hover:border-ft-accent hover:bg-ft-accent-light transition-colors shrink-0"
                    title={t('relationshipManager.spouseSide')}
                  >
                    {rel.member_order === 0
                      ? t('relationshipManager.leftOfMember', { name: memberName })
                      : t('relationshipManager.rightOfMember', { name: memberName })}
                  </button>
                )}
                {/* Child order reorder */}
                {actualType === 'Child' && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleUpdateMemberOrder(rel, Math.max(0, (rel.member_order ?? 0) - 1))}
                      className="w-6 h-6 flex items-center justify-center rounded text-xs border border-slate-200 text-ft-text-3 hover:text-ft-accent hover:border-ft-accent hover:bg-ft-accent-light transition-all"
                      title={t('relationshipManager.moveEarlier')}
                    >
                      ▲
                    </button>
                    <span className="text-[0.65rem] font-bold text-ft-text-3 w-4 text-center">
                      {(rel.member_order ?? 0) + 1}
                    </span>
                    <button
                      onClick={() => handleUpdateMemberOrder(rel, (rel.member_order ?? 0) + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded text-xs border border-slate-200 text-ft-text-3 hover:text-ft-accent hover:border-ft-accent hover:bg-ft-accent-light transition-all"
                      title={t('relationshipManager.moveLater')}
                    >
                      ▼
                    </button>
                  </div>
                )}
                {/* Edit */}
                <button
                  onClick={() => setEditingRel(rel)}
                  className="bg-transparent border-none cursor-pointer text-slate-300 text-base px-1 py-0 leading-none hover:text-ft-accent transition-colors"
                  title={t('relationshipManager.editRelationship')}
                >
                  <Pencil />
                </button>
                {/* Delete */}
                <button onClick={() => handleDelete(rel.id)}
                  className="bg-transparent border-none cursor-pointer text-slate-300 text-lg px-1 py-0 leading-none hover:text-red-400 transition-colors"
                  title={t('relationshipManager.removeRelationship')}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <RelationshipEditModal
        relationship={editingRel}
        memberId={memberId}
        memberName={memberName}
        open={!!editingRel}
        onClose={() => setEditingRel(null)}
        onSaved={loadRels}
      />
    </div>
  );
}
