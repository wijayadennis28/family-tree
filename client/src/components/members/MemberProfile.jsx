import { useEffect, useState, useRef, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Tree,
  User,
  Calendar,
  Info,
  Image,
  Camera,
  Spinner,
} from '@phosphor-icons/react';
import SegmentedControl from '../ui/SegmentedControl';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { STORAGE_URL } from '../../utils/storageUrl';
import { buildTreeUrl } from '../../utils/treeUrl';
import { getRelIcon, getRelTypeKey } from '../../utils/relationshipIcons';

/* ──────────────────────────────────────────
   Small info tile used in the hero grid.
   ────────────────────────────────────────── */
function InfoTile({ label, value, icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 transition-shadow duration-200 hover:shadow-ft-sm">
      <div className="flex items-center gap-2 text-ft-text-3 mb-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[0.7rem] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-bold text-ft-text-1 truncate">{value || '—'}</div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Sidebar info row.
   ────────────────────────────────────────── */
function InfoRow({ label, value }) {
  return (
    <div className="py-2.5 border-b border-slate-100 last:border-b-0">
      <div className="text-[0.7rem] font-bold uppercase tracking-wider text-ft-text-3 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-ft-text-1 truncate">{value || '—'}</div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Full-page member profile — Framer-style.
   ────────────────────────────────────────── */
export default function MemberProfile() {
  const { id } = useParams();
  const api = useApi();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { hasAbility, activeFamily } = useContext(AuthContext);
  const canEdit = hasAbility('edit_member', activeFamily?.id);
  const canDelete = hasAbility('delete_member', activeFamily?.id);

  const handleDelete = async () => {
    if (!window.confirm(t('memberProfile.deleteConfirm', { name: member.name }))) return;
    const [, err] = await api.delete(`/members/${id}`);
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('memberProfile.deleteError'), 'error');
    } else {
      toast.addToast(t('memberProfile.deleted'), 'success');
      navigate('/people');
    }
  };

  const handlePhotoSelect = async (e) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.addToast(t('memberProfile.photoTooLarge'), 'error');
      return;
    }

    const fd = new FormData();
    fd.append('photo', file);

    setUploadingPhoto(true);
    const [data, err] = await api.upload(`/members/${id}`, fd);
    setUploadingPhoto(false);

    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('memberProfile.photoUpdateError'), 'error');
    } else {
      setMember(data);
      toast.addToast(t('memberProfile.photoUpdated'), 'success');
    }

    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const [member, setMember] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  // Page-level fade-in is now handled by the global PageTransition wrapper.

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const [data, err] = await api.get(`/members/${id}`);
      const [relData] = await api.get(`/members/${id}/relationships`);
      if (err) setError(typeof err === 'string' ? err : t('memberProfile.loadError'));
      else setMember(data);
      if (relData) setRelationships(Array.isArray(relData) ? relData : []);
      setLoading(false);
    };
    load();
  }, [id, api, t]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-ft-text-2">
        <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-ft-accent animate-spin" />
        <p className="text-sm">{t('memberProfile.loading')}</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 text-sm">
          {error || t('memberProfile.notFound')}
        </div>
      </div>
    );
  }

  const isDeceased = !!member.dod;
  const initials = member.name
    ? member.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const formatYear = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.getFullYear();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const birthYear = formatYear(member.dob);
  const deathYear = formatYear(member.dod);
  const lifeDates = [birthYear, deathYear].filter(Boolean).join(' – ') || '—';
  const fullLifeDates = [formatDate(member.dob), formatDate(member.dod)].filter(Boolean).join(' – ') || '—';



  const getOtherMember = (rel) =>
    String(rel.member1_id) === String(member.id) ? rel.member2 : rel.member1;

  const relationshipLabel = (() => {
    if (relationships.length === 0) return t('memberProfile.familyMember');
    if (relationships.length === 1) {
      const other = getOtherMember(relationships[0]);
      return t('memberProfile.relationshipOf', {
        type: t(`relTypeModal.${getRelTypeKey(relationships[0].relationship_type)}`),
        name: other?.name || t('memberProfile.someone')
      });
    }
    return t('memberProfile.relationshipCount', { count: relationships.length });
  })();

  const familyName = member.family?.name || '—';
  const branchName = member.branch?.name || '—';

  return (
    <div className="min-h-full bg-ft-bg">
      {/* Page header */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">{t('memberProfile.title')}</h1>
            <p className="text-sm text-ft-text-3 mt-0.5">{t('memberProfile.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <SegmentedControl
                options={[
                  { value: 'bios', label: t('memberProfile.bios') },
                  { value: 'tree', label: t('memberProfile.tree') },
                ]}
                value="bios"
                onChange={(val) => {
                  if (val === 'tree') navigate(buildTreeUrl(member));
                }}
              />
            </div>
            <Link
              to="/people"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ft-header text-white text-xs font-bold no-underline hover:bg-ft-header/90 transition-colors"
            >
              <ArrowLeft /> {t('common.backToList')}
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Hero card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-ft-sm">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <button
                  type="button"
                  aria-label={t('memberProfile.changePhoto')}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto || !canEdit}
                  className={`relative group w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold border-4 overflow-hidden flex-shrink-0 disabled:cursor-not-allowed ${
                    canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                  } ${
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
                  {canEdit && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {uploadingPhoto ? (
                        <Spinner className="text-white text-xl animate-spin" />
                      ) : (
                        <Camera className="text-white text-xl" />
                      )}
                    </div>
                  )}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-full bg-ft-accent-light text-ft-accent text-[0.7rem] font-bold">
                      {t('memberProfile.memberProfile')}
                    </span>
                    <span
                      title={relationshipLabel}
                      className="px-2.5 py-1 rounded-full bg-ft-surface-2 text-ft-text-2 text-[0.7rem] font-bold truncate max-w-[180px]"
                    >
                      {relationshipLabel}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-ft-text-1 tracking-tight mb-1">
                    {member.name}
                  </h1>
                  <p className="text-sm font-semibold text-ft-text-2 mb-2">{lifeDates}</p>
                  <p className="text-xs text-ft-text-3">{fullLifeDates}</p>
                  {member.biography && (
                    <p className="text-sm text-ft-text-2 leading-relaxed line-clamp-3">
                      {member.biography}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Info tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InfoTile label={t('memberProfile.fullName')} value={member.name} icon={<User />} />
              <InfoTile label={t('memberProfile.relationship')} value={relationshipLabel} icon={<Info />} />
              <InfoTile label={t('memberProfile.lifeDates')} value={lifeDates} icon={<Calendar />} />
            </div>

            {/* Relationships */}
            {relationships.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-ft-sm">
                <h2 className="text-lg font-extrabold text-ft-text-1 tracking-tight mb-4">{t('memberProfile.relationships')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relationships.map((rel) => {
                    const other = getOtherMember(rel);
                    if (!other) return null;
                    const otherInitials = other.name
                      ? other.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      : '?';
                    return (
                      <Link
                        key={rel.id}
                        to={`/people/${other.id}`}
                        className="flex items-center gap-4 p-4 bg-ft-surface-2 border border-slate-200 rounded-2xl hover:shadow-ft-sm hover:border-ft-accent/30 transition-all duration-200 no-underline"
                      >
                        <div className="w-12 h-12 rounded-full bg-ft-accent-light text-ft-accent flex items-center justify-center text-sm font-bold border-2 border-ft-accent/20 flex-shrink-0">
                          {other.photo ? (
                            <img
                              src={`${STORAGE_URL}/${other.photo}`}
                              alt={other.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            otherInitials
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-ft-text-1 truncate">{other.name}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-ft-accent text-xs">{getRelIcon(rel.relationship_type)}</span>
                            <span className="text-xs font-semibold text-ft-text-2">{t(`relTypeModal.${getRelTypeKey(rel.relationship_type)}`)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Member story */}
            {member.biography && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-ft-sm">
                <h2 className="text-lg font-extrabold text-ft-text-1 tracking-tight mb-4">{t('memberProfile.memberStory')}</h2>
                <p className="text-sm text-ft-text-2 leading-relaxed whitespace-pre-line">
                  {member.biography}
                </p>
              </div>
            )}

            {/* Profile notes */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-ft-sm">                <h2 className="text-lg font-extrabold text-ft-text-1 tracking-tight mb-4">{t('memberProfile.profileNotes')}</h2>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <span className="w-2 h-2 rounded-full bg-ft-accent mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-ft-text-1 mb-0.5">{t('memberProfile.archiveSummary')}</div>
                    <p className="text-sm text-ft-text-2 leading-relaxed">
                      {t('memberProfile.archiveSummaryText')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-2 h-2 rounded-full bg-ft-text-3 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-ft-text-1 mb-0.5">{t('memberProfile.photoReady')}</div>
                    <p className="text-sm text-ft-text-2 leading-relaxed">
                      {t('memberProfile.photoReadyText')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-ft-sm">
              <h3 className="text-sm font-extrabold text-ft-accent mb-3">{t('memberProfile.information')}</h3>
              <InfoRow label={t('memberProfile.name')} value={member.name} />
              <InfoRow label={t('memberProfile.family')} value={familyName} />
              <InfoRow label={t('memberProfile.branch')} value={branchName} />
              <InfoRow label={t('memberProfile.relationship')} value={relationshipLabel} />
              <InfoRow label={t('memberProfile.dates')} value={fullLifeDates} />
              <InfoRow label={t('memberProfile.gender')} value={member.gender ? t(`common.${member.gender.toLowerCase()}`) : ''} />
              <InfoRow label={t('memberProfile.birthplace')} value={member.place_of_birth} />
            </div>

            <div className="bg-ft-accent-light border border-ft-accent/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-ft-accent mb-2">
                <Image className="text-sm" />
                <h3 className="text-sm font-extrabold">{t('memberProfile.portraitFallback')}</h3>
              </div>
              <p className="text-xs text-ft-text-2 leading-relaxed">
                {t('memberProfile.portraitFallbackText')}
              </p>
            </div>

            <Link
              to={buildTreeUrl(member)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-ft-accent text-white font-bold text-sm no-underline hover:bg-ft-accent-hover active:scale-[0.98] transition-all duration-150 btn-shimmer"
            >
              <Tree /> {t('memberProfile.viewAtlas')}
            </Link>

            <Link
              to={`/people/${id}/edit`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-slate-200 text-ft-text-2 font-bold text-sm no-underline hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-all duration-150"
            >
              {t('memberProfile.editProfile')}
            </Link>

            {canDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-red-200 text-red-600 bg-red-50 font-bold text-sm hover:bg-red-100 hover:border-red-300 transition-all duration-150"
              >
                {t('memberProfile.deleteProfile')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
