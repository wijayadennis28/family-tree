import { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { useLanguage } from '../../context/LanguageContext';
import { REL_ICON, getRelTypeKey } from '../../utils/relationshipIcons';

/* ──────────────────────────────────────────
   Relationship selector modal — shared by
   RelationshipCanvas (drag-connect) and the
   FamilyTree ActionPill (click-to-act).
   Ponytail: live title, type-aware slot labels,
   ↕ Swap. The modal keeps its own swapped flag
   so the parent's source/target are immutable
   until save — swapping affects only the body
   the parent sees and the title the user reads.

   targetPicker mode — when true, the right-hand
   slot becomes a member picker (the canvas
   supplies both ends; the pill only knows the
   source). Ponytail: opt-in so existing callers
   stay untouched. Excludes ids in
   `targetPickerExcludeIds` from the list.
   ────────────────────────────────────────── */
export default function RelTypeModal({
  open, sourceId, targetId, sourceName, targetName, sourceFamilyId,
  onSave, onCancel, defaultType, onDelete, spouseOptions,
  showSwap = true,
  saving = false,
  targetPicker = false,
  targetPickerExcludeIds = [],
}) {
  const { t } = useLanguage();
  const [type, setType] = useState(defaultType || 'Parent');
  const [selectedSpouses, setSelectedSpouses] = useState([]); // ponytail: simple array, fine for ≤2 spouses
  const [swapped, setSwapped] = useState(false);
  const [pickedTargetId, setPickedTargetId] = useState('');
  const [pickerMembers, setPickerMembers] = useState([]);
  const [spouseSide, setSpouseSide] = useState(1); // 0 = left of source, 1 = right of source
  const [childOrder, setChildOrder] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [internalSpouseOptions, setInternalSpouseOptions] = useState([]);
  const dropdownRef = useRef(null);
  const api = useApi();

  useEffect(() => { if (defaultType) setType(defaultType); }, [defaultType]);
  useEffect(() => { if (open) { setSwapped(false); setSpouseSide(1); setChildOrder(0); } }, [open]);
  useEffect(() => { if (!open) setPickedTargetId(''); }, [open]);

  const canResolveTarget = targetPicker ? !!pickedTargetId : !!targetId;
  const eSrcId   = swapped ? targetId   : sourceId;
  const eTgtId   = swapped ? sourceId   : (targetPicker ? pickedTargetId : targetId);

  // Dynamically fetch spouses depending on who the newly defined "parent" is.
  // For Child relationships, the parent is the source. For Parent relationships, the parent is the target.
  const spouseQueryId = type === 'Child' ? eSrcId : (type === 'Parent' ? eTgtId : null);

  useEffect(() => {
    if (!open || !spouseQueryId) {
      setInternalSpouseOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [rels] = await api.get(`/members/${spouseQueryId}/relationships`);
      if (cancelled) return;
      const spouses = (rels || [])
        .filter(r => r.relationship_type === 'Spouse')
        .map(r => ({
          id: String(r.member1_id) === String(spouseQueryId) ? r.member2_id : r.member1_id,
          name: String(r.member1_id) === String(spouseQueryId) ? r.member2?.name : r.member1?.name,
        }));
      setInternalSpouseOptions(spouses);
    })();
    return () => { cancelled = true; };
  }, [open, spouseQueryId, api]);

  // Close custom member dropdown when clicking outside or pressing Escape.
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [dropdownOpen]);
  useEffect(() => {
    if (!open) {
      setSelectedSpouses([]);
    } else if (internalSpouseOptions?.length === 1) {
      setSelectedSpouses([internalSpouseOptions[0].id]);
    } else {
      setSelectedSpouses([]);
    }
  }, [open, internalSpouseOptions]);

  // ponytail: picker mode fetches the member list + source relationships once when
  // the modal opens. Members already related to the source are excluded.
  useEffect(() => {
    if (!open || !targetPicker) return;
    let cancelled = false;
    (async () => {
      const [membersData, relsData] = await Promise.all([
        api.get('/members'),
        api.get(`/members/${sourceId}/relationships`),
      ]);
      if (cancelled) return;
      const relatedIds = (relsData[0] || [])
        .map(r => (String(r.member1_id) === String(sourceId) ? r.member2_id : r.member1_id));
      const exclude = new Set([...targetPickerExcludeIds.map(Number), ...relatedIds.map(Number)]);
      setPickerMembers((membersData[0] || []).filter(m => {
        if (exclude.has(Number(m.id))) return false;
        const sameFamily = sourceFamilyId && Number(m.family_id) === Number(sourceFamilyId);
        const noFamily = !m.family_id;
        return sameFamily || noFamily;
      }));
    })();
    return () => { cancelled = true; };
  }, [open, targetPicker, api, targetPickerExcludeIds, sourceFamilyId, sourceId]); // eslint-disable-line

  if (!open) return null;

  const eSrcName = swapped ? targetName : sourceName;
  const eTgtName = (() => {
    if (swapped) return sourceName;
    if (targetPicker) {
      const m = pickerMembers.find(x => String(x.id) === String(pickedTargetId));
      return m?.name;
    }
    return targetName;
  })();

  // Type-aware slot labels. Other types fall back to generic labels.
  const slotLabels = (() => {
    if (type === 'Child') return { primary: t('relTypeModal.parentOf'), secondary: t('relTypeModal.childOf') };
    if (type === 'Parent' && targetPicker) return { primary: t('relTypeModal.childOf'), secondary: t('relTypeModal.parentOf') };
    if (type === 'Parent' || type === 'Child') return { primary: t('relTypeModal.parentOf'), secondary: t('relTypeModal.childOf') };
    if (type === 'Spouse') return { primary: t('relTypeModal.spouseOf'), secondary: t('relTypeModal.spouseOf') };
    if (type === 'Sibling') return { primary: t('relTypeModal.siblingOf'), secondary: t('relTypeModal.siblingOf') };
    if (type === 'Grandparent') return { primary: t('relTypeModal.grandparentOf'), secondary: t('relTypeModal.grandchildOf') };
    if (type === 'Grandchild') return { primary: t('relTypeModal.grandchildOf'), secondary: t('relTypeModal.grandparentOf') };
    if (type === 'Uncle/Aunt') return { primary: t('relTypeModal.uncleAuntOf'), secondary: t('relTypeModal.nieceNephewOf') };
    if (type === 'Niece/Nephew') return { primary: t('relTypeModal.nieceNephewOf'), secondary: t('relTypeModal.uncleAuntOf') };
    return { primary: t('relTypeModal.memberA'), secondary: t('relTypeModal.memberB') };
  })();

  // Live title — puny on the rare incomplete state.
  // ponytail: Child type reverses the sentence — "TARGET is the Child of SOURCE"
  // — because source=parent, target=child, and the label says "Child of".
  const translatedType = t(`relTypeModal.${getRelTypeKey(type)}`);
  const liveTitle = (() => {
    if (!eSrcId || !canResolveTarget || !type) return t('relTypeModal.newRelationship');
    if (type === 'Child') return t('relTypeModal.childTitle', { target: eTgtName || eTgtId, source: eSrcName || eSrcId });
    if (type === 'Parent' && targetPicker) return t('relTypeModal.parentTitle', { target: eTgtName || eTgtId, source: eSrcName || eSrcId });
    return t('relTypeModal.defaultTitle', { source: eSrcName || eSrcId, type: translatedType, target: eTgtName || eTgtId });
  })();

  const showSpouseCheckbox = (type === 'Parent' || type === 'Child') && internalSpouseOptions?.length > 0;
  const showSpouseSide = type === 'Spouse';
  const showChildOrder = type === 'Child' || type === 'Parent';

  const REL_OPTIONS = [
    { label: 'Parent', icon: REL_ICON.Parent },
    { label: 'Child', icon: REL_ICON.Child },
    { label: 'Spouse', icon: REL_ICON.Spouse },
    { label: 'Sibling', icon: REL_ICON.Sibling },
    { label: 'Grandparent', icon: REL_ICON.Grandparent },
    { label: 'Grandchild', icon: REL_ICON.Grandchild },
    { label: 'Uncle/Aunt', icon: REL_ICON['Uncle/Aunt'] },
    { label: 'Niece/Nephew', icon: REL_ICON['Niece/Nephew'] },
  ];
  const relLabel = (label) => t(`relTypeModal.${getRelTypeKey(label)}`);

  // Disable Save until a target is picked (picker mode) or supplied (canvas mode).
  const canSave = !!eSrcId && canResolveTarget && !!type && !saving;

  return (
    <div className="rtm-overlay" onClick={onCancel}>
      <div className="rtm-shell" onClick={e => e.stopPropagation()}>
        <div className="rtm-title">{liveTitle}</div>

        <div className="rtm-label">{t('relTypeModal.relationshipType')}</div>
        <div className="rtm-type-row">
          {REL_OPTIONS.map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setType(opt.label)}
              className={`rtm-type-btn${type === opt.label ? ' active' : ''}`}
            >
              {opt.icon} {relLabel(opt.label)}
            </button>
          ))}
        </div>

        <div className="rtm-slot-card">
          <div className="rtm-slot-col">
            <div className="rtm-slot-tag">{slotLabels.primary}</div>
            <div className="rtm-slot-name">{eSrcName || eSrcId}</div>
          </div>
          {showSwap && !targetPicker && (
            <button
              type="button"
              className="rtm-swap"
              onClick={() => setSwapped(s => !s)}
              title={t('relTypeModal.swapSourceTarget')}
              aria-label={t('relTypeModal.swapSourceTarget')}
            >
              ↕
            </button>
          )}
          <div className="rtm-slot-col right" ref={dropdownRef}>
            <div className="rtm-slot-tag">{slotLabels.secondary}</div>
            {targetPicker ? (
              <div className="rtm-custom-select">
                <button
                  type="button"
                  className={`rtm-select-trigger${pickedTargetId ? ' selected' : ''}`}
                  onClick={() => setDropdownOpen(o => !o)}
                  aria-label={t('relTypeModal.selectMember')}
                  aria-expanded={dropdownOpen}
                >
                  <span className="rtm-select-trigger-text">
                    {pickedTargetId ? pickerMembers.find(m => String(m.id) === String(pickedTargetId))?.name || t('relTypeModal.selectMember') : t('relTypeModal.selectMember')}
                  </span>
                  <span className="rtm-select-chevron">▼</span>
                </button>
                {dropdownOpen && (
                  <div className="rtm-select-dropdown">
                    {pickerMembers.length === 0 ? (
                      <div className="rtm-select-empty">{t('relTypeModal.selectMember')}</div>
                    ) : (
                      pickerMembers.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          className={`rtm-select-option${String(pickedTargetId) === String(m.id) ? ' active' : ''}`}
                          onClick={() => { setPickedTargetId(String(m.id)); setDropdownOpen(false); }}
                        >
                          {m.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rtm-slot-name">{eTgtName || eTgtId}</div>
            )}
          </div>
        </div>

        {showSpouseCheckbox && (
          <div className="rtm-spouse-card">
            <div className="rtm-label">
              {spouseOptions.length > 1
                ? t('relTypeModal.connectSpouses', { target: eTgtName || eTgtId })
                : t('relTypeModal.connectSpouse', { target: eTgtName || eTgtId })}
            </div>
            {internalSpouseOptions.map(s => (
              <label key={s.id}>
                <input
                  type="checkbox"
                  checked={selectedSpouses.includes(s.id)}
                  onChange={e => {
                    setSelectedSpouses(prev =>
                      e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                    );
                  }}
                />
                {s.name}
              </label>
            ))}
          </div>
        )}

        {showSpouseSide && (
          <div className="rtm-side-card">
            <div className="rtm-label">{t('relationshipManager.spouseSide')}</div>
            <div className="rtm-side-row">
              <button
                type="button"
                className={`rtm-side-btn${spouseSide === 0 ? ' active' : ''}`}
                onClick={() => setSpouseSide(0)}
              >
                {t('relationshipManager.leftOfMember', { name: eSrcName || eSrcId })}
              </button>
              <button
                type="button"
                className={`rtm-side-btn${spouseSide === 1 ? ' active' : ''}`}
                onClick={() => setSpouseSide(1)}
              >
                {t('relationshipManager.rightOfMember', { name: eSrcName || eSrcId })}
              </button>
            </div>
          </div>
        )}

        {showChildOrder && (
          <div className="rtm-child-order-card">
            <label htmlFor="child-order" className="rtm-label">{t('relationshipManager.childOrder')}</label>
            <input
              id="child-order"
              type="number"
              min={0}
              value={childOrder}
              onChange={e => setChildOrder(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="rtm-child-order-input"
            />
          </div>
        )}

        <div className="rtm-actions">          <button type="button" className="rtm-btn rtm-btn-primary" disabled={!canSave} onClick={() => onSave({ type, sourceId: eSrcId, targetId: eTgtId, selectedSpouses, memberOrder: showChildOrder ? childOrder : spouseSide })}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="rtm-btn rtm-btn-ghost" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          {onDelete && (
            <button type="button" className="rtm-btn-danger" onClick={onDelete}>
              {t('common.remove')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
