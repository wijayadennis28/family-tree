import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, X } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { useLanguage } from '../../context/LanguageContext';

const inputClass = "w-full px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-lg text-sm text-ft-text-1 bg-white outline-none transition-all duration-200 focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 placeholder:text-ft-text-3";

const STATUS_OPTIONS = ['Married', 'Divorced', 'Separated', 'Widowed', 'Annulled'];

export default function RelationshipEditModal({
  relationship,
  memberId,
  memberName,
  open,
  onClose,
  onSaved,
}) {
  const api = useApi();
  const { t } = useLanguage();

  const [memberOrder, setMemberOrder] = useState(0);
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!relationship) return;
    const defaultOrder = relationship.relationship_type === 'Spouse' ? 1 : 0;
    setMemberOrder(relationship.member_order ?? defaultOrder);
    setStatus(relationship.status || '');
    setStartDate(relationship.start_date || '');
    setEndDate(relationship.end_date || '');
    setNotes(relationship.notes || '');
    setError(null);
  }, [relationship]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !relationship) return null;

  const actualRelType = (() => {
    if (relationship.relationship_type === 'Parent') {
      return String(relationship.member2_id) === String(memberId) ? 'Parent' : 'Child';
    }
    if (relationship.relationship_type === 'Grandparent') {
      return String(relationship.member2_id) === String(memberId) ? 'Grandparent' : 'Grandchild';
    }
    if (relationship.relationship_type === 'Uncle/Aunt') {
      return String(relationship.member2_id) === String(memberId) ? 'Uncle/Aunt' : 'Niece/Nephew';
    }
    return relationship.relationship_type;
  })();

  const isSpouse = actualRelType === 'Spouse';
  const isChildOrParent = ['Child', 'Parent'].includes(actualRelType);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const payload = {
      member_order: memberOrder,
      status: status || null,
      start_date: startDate || null,
      end_date: endDate || null,
      notes: notes || null,
    };

    const [, err] = await api.put(`/relationships/${relationship.id}`, payload);

    if (err) {
      setError(typeof err === 'string' ? err : t('relationshipManager.saveError'));
    } else {
      onSaved();
      onClose();
    }

    setSaving(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={modalRef} className="bg-white rounded-2xl shadow-ft-lg w-full max-w-md overflow-hidden animate-[modal-pop-in_200ms_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Pencil className="text-ft-accent" size={20} />
            <h3 className="text-base font-extrabold text-ft-text-1">
              {t('relationshipManager.editRelationship')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ft-text-3 hover:text-ft-text-1 hover:bg-ft-surface-2 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Spouse side */}
          {isSpouse && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ft-text-3 uppercase tracking-wider">
                {t('relationshipManager.spouseSide')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMemberOrder(0)}
                  className={`px-3 py-2.5 rounded-xl border-[1.5px] text-xs font-semibold transition-all duration-150 ${
                    memberOrder === 0
                      ? 'bg-ft-accent text-white border-ft-accent'
                      : 'bg-white text-ft-text-2 border-slate-200 hover:border-ft-accent hover:text-ft-accent'
                  }`}
                >
                  {t('relationshipManager.leftOfMember', { name: memberName })}
                </button>
                <button
                  type="button"
                  onClick={() => setMemberOrder(1)}
                  className={`px-3 py-2.5 rounded-xl border-[1.5px] text-xs font-semibold transition-all duration-150 ${
                    memberOrder === 1
                      ? 'bg-ft-accent text-white border-ft-accent'
                      : 'bg-white text-ft-text-2 border-slate-200 hover:border-ft-accent hover:text-ft-accent'
                  }`}
                >
                  {t('relationshipManager.rightOfMember', { name: memberName })}
                </button>
              </div>
            </div>
          )}

          {/* Child / parent order */}
          {isChildOrParent && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ft-text-3 uppercase tracking-wider">
                {t('relationshipManager.childOrder')}
              </label>
              <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setMemberOrder(Math.max(0, memberOrder - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ft-text-2 hover:text-ft-accent hover:bg-ft-accent-light transition-all"
                >
                  –
                </button>
                <span className="w-12 text-center text-sm font-bold text-ft-text-1">{memberOrder + 1}</span>
                <button
                  type="button"
                  onClick={() => setMemberOrder(memberOrder + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ft-text-2 hover:text-ft-accent hover:bg-ft-accent-light transition-all"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Status */}
          {isSpouse && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ft-text-3 uppercase tracking-wider">
                {t('memberProfile.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
              >
                <option value="">{t('common.select')}</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`memberProfile.status${s}`)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ft-text-3 uppercase tracking-wider">
                {t('relationshipManager.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ft-text-3 uppercase tracking-wider">
                {t('relationshipManager.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ft-text-3 uppercase tracking-wider">
              {t('relationshipManager.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder={t('memberForm.placeholderDescription')}
            />
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-5 py-2.5 rounded-lg bg-ft-accent text-white font-bold text-sm hover:bg-ft-accent-hover disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-5 py-2.5 rounded-lg border border-slate-200 text-ft-text-2 font-bold text-sm hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-all"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
