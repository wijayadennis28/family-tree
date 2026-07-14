import { useState, useEffect } from 'react';
import { Heart, ArrowUp, ArrowDown, ArrowsHorizontal } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { useLanguage } from '../../context/LanguageContext';
import { getRelTypeKey } from '../../utils/relationshipIcons';

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
  open, sourceId, targetId, sourceName, targetName,
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
  const api = useApi();

  useEffect(() => { if (defaultType) setType(defaultType); }, [defaultType]);
  useEffect(() => { if (open) setSwapped(false); }, [open]);
  useEffect(() => { if (!open) setPickedTargetId(''); }, [open]);
  useEffect(() => {
    if (!open) {
      setSelectedSpouses([]);
      return;
    }
    if (spouseOptions?.length === 1) {
      setSelectedSpouses([spouseOptions[0].id]);
    } else {
      setSelectedSpouses([]);
    }
  }, [open, spouseOptions]);

  // ponytail: picker mode fetches the member list once when the modal opens.
  // Existing canvas callers don't trigger this branch.
  useEffect(() => {
    if (!open || !targetPicker) return;
    let cancelled = false;
    (async () => {
      const [data] = await api.get('/members');
      if (cancelled) return;
      const exclude = new Set(targetPickerExcludeIds.map(Number));
      setPickerMembers((data || []).filter(m => !exclude.has(Number(m.id))));
    })();
    return () => { cancelled = true; };
  }, [open, targetPicker, api, targetPickerExcludeIds]); // eslint-disable-line

  if (!open) return null;

  // Ponytail: post-swap effective values. Single swap point.
  const eSrcId   = swapped ? targetId   : sourceId;
  const canResolveTarget = targetPicker ? !!pickedTargetId : !!targetId;
  const eTgtId   = swapped ? sourceId   : (targetPicker ? pickedTargetId : targetId);
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

  const showSpouseCheckbox = (type === 'Parent' || type === 'Child') && spouseOptions?.length > 0;

  const REL_OPTIONS = [
    { label: 'Parent', icon: <ArrowUp /> },
    { label: 'Child', icon: <ArrowDown /> },
    { label: 'Spouse', icon: <Heart /> },
    { label: 'Sibling', icon: <ArrowsHorizontal /> },
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
          <div className="rtm-slot-col right">
            <div className="rtm-slot-tag">{slotLabels.secondary}</div>
            {targetPicker ? (
              <select
                className="rtm-target-select"
                value={pickedTargetId}
                onChange={e => setPickedTargetId(e.target.value)}
                aria-label={t('relTypeModal.selectMember')}
              >
                <option value="">{t('relTypeModal.selectMember')}</option>
                {pickerMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
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
            {spouseOptions.map(s => (
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

        <div className="rtm-actions">          <button type="button" className="rtm-btn rtm-btn-primary" disabled={!canSave} onClick={() => onSave({ type, sourceId: eSrcId, targetId: eTgtId, selectedSpouses })}>
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
