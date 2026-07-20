import { useEffect, useRef } from 'react';import { Link } from 'react-router-dom';
import {
  Baby,
  Cross,
  MapPin,
  GenderMale,
  BookOpen,
  X,
  TreeStructure,
  Clock,
  IdentificationCard,
} from '@phosphor-icons/react';
import { STORAGE_URL } from '../../utils/storageUrl';
import { panelIn } from '../../utils/gsapUtils';
import { useLanguage } from '../../context/LanguageContext';
import { getMemberInitials } from '../../utils/initials';
import { getLivingStatus } from '../../utils/livingStatus';
import { buildMemberUrl } from '../../utils/treeUrl';
import { formatOrdinal } from '../../utils/ordinal';

/* ──────────────────────────────────────────
   Status chip for marriage inspector.
   ────────────────────────────────────────── */
function StatusPill({ status, relationshipType, t }) {
  const effectiveStatus = status || (relationshipType === 'Spouse' ? 'Married' : null);
  if (!effectiveStatus) return <span className="status-pill-other">—</span>;
  const normalizedStatus =
    effectiveStatus === 'Married'
      ? 'Married'
      : effectiveStatus === 'Divorced'
      ? 'Divorced'
      : 'Other';
  const cls =
    normalizedStatus === 'Married'
      ? 'status-pill-married'
      : normalizedStatus === 'Divorced'
      ? 'status-pill-divorced'
      : 'status-pill-other';
  const label = t(`memberProfile.status${normalizedStatus}`);
  return <span className={`status-pill ${cls}`}>{label}</span>;
}

/* ──────────────────────────────────────────
   Small avatar used inside marriage cards.
   ────────────────────────────────────────── */
function MiniAvatar({ name, photo, isDeceased, member }) {
  const initials = getMemberInitials(member || { name, initials: '' });

  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border overflow-hidden flex-shrink-0 ${
        isDeceased
          ? 'bg-slate-100 text-ft-text-3 border-slate-200'
          : 'bg-ft-accent-light text-ft-accent border-ft-accent/20'
      }`}
    >
      {photo ? (
        <img src={`${STORAGE_URL}/${photo}`} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Icon-led life-event row.
   ────────────────────────────────────────── */
function LifeRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="w-8 h-8 rounded-lg bg-ft-surface-2 text-ft-text-3 flex items-center justify-center text-sm flex-shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[0.65rem] font-bold uppercase tracking-wider text-ft-text-3 mb-0.5">
          {label}
        </div>
        <div className="text-sm font-semibold text-ft-text-1 truncate">{value}</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Section heading used throughout the panel.
   ────────────────────────────────────────── */
function SectionTitle({ children }) {
  return (
    <h3 className="text-[0.65rem] font-bold uppercase tracking-wider text-ft-text-3 mb-3">
      {children}
    </h3>
  );
}

/* ──────────────────────────────────────────
   Right-side detail panel — Framer-style
   editorial person summary.
   ────────────────────────────────────────── */
export default function MemberDetailPanel({ member, treeData, onClose, onNavigate, publicView = false }) {
  const { t, language } = useLanguage();
  const panelRef = useRef(null);
  useEffect(() => {
    panelIn(panelRef.current);
  }, [member]);

  const status = getLivingStatus(member);
  const isDeceased = status === 'deceased';
  const initials = getMemberInitials(member);

  const findNode = (n, id) => {
    if (!n) return null;
    if (Array.isArray(n)) {
      for (const root of n) {
        const r = findNode(root, id);
        if (r) return r;
      }
      return null;
    }
    if (n.id === id) return n;
    for (const s of n.spouses || []) {
      const r = findNode(s, id);
      if (r) return r;
    }
    for (const p of n.parents || []) {
      const r = findNode(p, id);
      if (r) return r;
    }
    for (const c of n.children || []) {
      const r = findNode(c, id);
      if (r) return r;
    }
    return null;
  };

  /** Collect spouse entries from any node that lists this member as a spouse.
   *  This is needed because the tree stores spouse relationships one-way.
   *  The returned spouse object represents the partner (the node that owns the
   *  spouses array), with the relationship data merged in. */
  const findSpouses = (n, id) => {
    const results = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      (node.spouses || []).forEach((s) => {
        if (String(s.id) === String(id)) {
          results.push({ ...node, relationship: s.relationship });
        }
        walk(s);
      });
      (node.parents || []).forEach(walk);
      (node.children || []).forEach(walk);
    };
    walk(n);
    return results;
  };

  const node = findNode(treeData, member.id);
  const nodeSpouses = node?.spouses || [];
  const scannedSpouses = findSpouses(treeData, member.id);
  const spouses = nodeSpouses.length > 0 ? nodeSpouses : scannedSpouses;
  const parents = node?.parents || [];

  // Relationship context line, e.g. "2nd child of Robert + Eleanor"
  const parentNames = parents.map((p) => p.name).join(' + ');
  const childOrder = member.child_order;
  const relationLine =
    parents.length > 0
      ? childOrder > 0
        ? t('memberProfile.childOfOrder', {
            order: formatOrdinal(childOrder, language),
            parents: parentNames,
          })
        : t('memberProfile.childOf', { parents: parentNames })
      : null;

  // Life-event rows
  const lifeRows = [
    { label: t('memberProfile.born'), value: member.dob, icon: <Baby /> },
    { label: t('memberProfile.died'), value: member.dod, icon: <Cross /> },
    { label: t('memberProfile.birthplace'), value: member.place_of_birth, icon: <MapPin /> },
    { label: t('memberProfile.gender'), value: member.gender, icon: <GenderMale /> },
  ].filter((r) => r.value);

  return (
    <div className="member-detail-overlay">
      <div
        ref={panelRef}
        className="member-detail-panel flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ft-border-hair bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <span className="text-xs font-semibold text-ft-text-3 uppercase tracking-wider">
            {t('memberProfile.profile')}
          </span>
          <button
            onClick={onClose}
            aria-label={t('memberProfile.closePanel')}
            className="w-8 h-8 flex items-center justify-center rounded-full text-ft-text-3 hover:text-ft-text-1 hover:bg-ft-surface-2 transition-colors text-lg leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ft-accent/50"
          >
            <X />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {/* Hero header */}
          <div className="flex items-start gap-4 pt-6 pb-6">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 overflow-hidden flex-shrink-0 ${
                isDeceased
                  ? 'bg-slate-100 text-ft-text-3 border-slate-200'
                  : 'bg-ft-accent-light text-ft-accent border-ft-accent/20'
              }`}
            >
              {member.photo ? (
                <img
                  src={`${STORAGE_URL}/${member.photo}`}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0 pt-1">
              <h2 className="text-xl font-extrabold text-ft-text-1 tracking-tight leading-tight break-words">
                {member.name}
              </h2>
              {member.chinese_name && (
                <p className="text-sm text-ft-text-2 mt-0.5 truncate">{member.chinese_name}</p>
              )}                {status !== 'unknown' && (
                  <span
                    className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold ${
                      isDeceased
                        ? 'bg-slate-100 text-ft-text-3'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDeceased ? 'bg-slate-400' : 'bg-green-500'
                      }`}
                    />
                    {isDeceased ? t('memberProfile.deceased') : t('memberProfile.living')}
                  </span>
                )}
            </div>
          </div>

          {/* Relationship context */}
          {relationLine && (
            <div className="flex items-center gap-2 text-xs text-ft-text-2 bg-ft-surface-2 rounded-xl px-3 py-2 mb-6">
              <TreeStructure className="text-ft-text-3" />
              <span className="truncate">{relationLine}</span>
            </div>
          )}

          {/* Life events */}
          {lifeRows.length > 0 && (              <div className="mb-6">
              <SectionTitle>{t('memberProfile.life')}</SectionTitle>
              <div className="bg-white border border-ft-border-hair rounded-2xl p-4 divide-y divide-ft-border-hair overflow-hidden">
                {lifeRows.map((row) => (
                  <LifeRow key={row.label} icon={row.icon} label={row.label} value={row.value} />
                ))}
              </div>
            </div>
          )}

          {/* Marriages */}
          <div className="mb-6">
            <SectionTitle>{spouses.length === 1 ? t('memberProfile.marriage') : t('memberProfile.marriages')}</SectionTitle>
            {spouses.length > 0 ? (
              <div className="flex flex-col gap-3">
                {spouses.map((spouse) => {
                  const rel = spouse.relationship || {};
                  return (
                    <div
                      key={spouse.id}
                      className="bg-white border border-ft-border-hair rounded-2xl p-4 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <MiniAvatar
                          name={spouse.name}
                          photo={spouse.photo}
                          isDeceased={getLivingStatus(spouse) === 'deceased'}
                          member={spouse}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-ft-text-1 truncate">
                            {spouse.name}
                          </div>
                          <div className="text-xs text-ft-text-3 truncate">
                            {t('memberProfile.and', { a: member.name, b: spouse.name })}
                          </div>
                        </div>
                        <StatusPill status={rel.status} relationshipType={rel.type} t={t} />
                      </div>

                      {(rel.start_date || rel.end_date) && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {rel.start_date && (
                            <div className="bg-ft-surface-2 rounded-lg p-2.5">
                              <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-ft-text-3 mb-0.5">
                                {t('memberProfile.married')}
                              </span>
                              <span className="font-semibold text-ft-text-1 flex items-center gap-1">
                                <Clock className="text-ft-text-3" size={10} />
                                {rel.start_date}
                              </span>
                            </div>
                          )}
                          {rel.end_date && (
                            <div className="bg-ft-surface-2 rounded-lg p-2.5">
                              <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-ft-text-3 mb-0.5">
                                {t('memberProfile.ended')}
                              </span>
                              <span className="font-semibold text-ft-text-1 flex items-center gap-1">
                                <Clock className="text-ft-text-3" size={10} />
                                {rel.end_date}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {rel.notes && (
                        <p className="mt-3 text-xs text-ft-text-2 leading-relaxed bg-ft-surface-2 rounded-xl p-3">
                          {rel.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ft-text-3 italic bg-white border border-ft-border-hair rounded-2xl p-4 overflow-hidden">
                {t('memberProfile.noMarriages')}
              </p>
            )}
          </div>

          {/* Biography */}
          {member.biography && (
            <div className="mb-6">
              <SectionTitle>{t('memberProfile.biography')}</SectionTitle>
              <div className="bg-white border border-ft-border-hair rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute left-0 top-4 bottom-4 w-1 bg-ft-accent/20 rounded-r-full" />
                <BookOpen className="text-ft-text-3 mb-2" />
                <p className="text-sm text-ft-text-2 leading-relaxed whitespace-pre-line">
                  {member.biography}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky action footer */}
        {!publicView && (
          <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-ft-border-hair flex flex-col gap-2.5">
            <button
              onClick={() => onNavigate(member)}
              className="w-full py-2.5 rounded-lg bg-ft-accent text-white font-semibold text-sm hover:bg-ft-accent-hover active:scale-[0.98] transition-all duration-150 btn-shimmer flex items-center justify-center gap-2"
            >
              <TreeStructure />
              {t('memberProfile.viewAtlas')}
            </button>
            <Link
              to={buildMemberUrl(member)}
              onClick={onClose}
              className="w-full py-2.5 rounded-lg border border-slate-200 text-ft-text-2 font-semibold text-sm hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-all duration-150 text-center no-underline flex items-center justify-center gap-2"
            >
              <IdentificationCard /> {t('memberProfile.viewFullProfile')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
