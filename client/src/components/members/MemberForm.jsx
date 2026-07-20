import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Camera, Spinner, X, Image, Info } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { STORAGE_URL } from '../../utils/storageUrl';
import { getMemberInitials } from '../../utils/initials';
import { parseHybridSlug } from '../../utils/treeUrl';
import RelationshipManager from './RelationshipManager';
import SegmentedControl from '../ui/SegmentedControl';

const EMPTY = {
  name: '', chinese_name: '', initials: '', gender: 'Male',
  dob: '', dod: '', address: '', phone: '',
  email: '', biography: '', place_of_birth: '', place_of_death: '',
  photo: '', is_active: true,
};

/* Shared form field classes */
const inputClass = "w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-[0.95rem] text-ft-text-1 bg-ft-surface-2 outline-none transition-all duration-200 focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 focus:bg-white placeholder:text-ft-text-3";
const labelClass = "block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider";

function Section({ title, children, className = '' }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-ft-sm ${className}`}>
      {title && <h2 className="text-lg font-extrabold text-ft-text-1 tracking-tight mb-5">{title}</h2>}
      {children}
    </div>
  );
}

function Field({ label, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function MemberForm() {
  const { hasAbility, activeFamily } = useContext(AuthContext);
  const canEdit = hasAbility('edit_member', activeFamily?.id);
  const canManageRelationships = hasAbility('manage_relationships', activeFamily?.id);
  const activeFamilyName = activeFamily?.name || 'No active family';
  const { slug } = useParams();
  const id = parseHybridSlug(slug);
  const api      = useApi();
  const navigate = useNavigate();
  const toast    = useToast();
  const { t }    = useLanguage();

  const [form,    setForm]    = useState({ ...EMPTY, family_id: activeFamily?.id || '', branch_id: '' });
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('details'); // 'details' | 'relationships'
  const [families, setFamilies] = useState([]);
  const [branches, setBranches] = useState([]);

  // Photo upload state
  const [photoFile,    setPhotoFile]    = useState(null);   // File object or false (= remove)
  const [photoPreview, setPhotoPreview] = useState(null);  // blob URL for local preview
  const fileInputRef = useRef(null);

  // Page-level fade-in is now handled by the global PageTransition wrapper.

  useEffect(() => {
    const loadFamilies = async () => {
      const [data] = await api.get('/families');
      if (data) setFamilies(data);
    };
    loadFamilies();
  }, [api]);

  useEffect(() => {
    const loadBranches = async () => {
      if (!form.family_id) {
        setBranches([]);
        return;
      }
      const [data] = await api.get(`/branches?family_id=${form.family_id}`);
      if (data) {
        setBranches(data);
      }
    };
    loadBranches();
  }, [form.family_id, api]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [data, err] = await api.get(`/members/${id}`);
      if (err) setError(typeof err === 'string' ? err : 'Could not load person.');
      else {
        setForm({
          ...EMPTY,
          ...data,
          dob: data.dob?.slice(0,10) ?? '',
          dod: data.dod?.slice(0,10) ?? '',
          family_id: data.family_id || activeFamily?.id || '',
          branch_id: data.branch_id || '',
        });
      }
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (slug && !id) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 text-sm font-semibold">
          {t('memberForm.notFound')}
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (photoFile instanceof File) {
      const fd = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (key === 'photo') return;
        if (val !== null && val !== undefined) fd.append(key, val);
      });
      fd.append('photo', photoFile);

      const [, err] = id
        ? await api.upload(`/members/${id}`, fd, 'put')
        : await api.upload('/members', fd);

      if (err) { const msg = typeof err === 'string' ? err : 'Save failed.'; setError(msg); toast.addToast(msg, 'error'); }
      else { toast.addToast(id ? 'Person updated!' : 'Person added!', 'success'); navigate('/people'); }
    } else if (photoFile === false) {
      const payload = id ? { ...form, remove_photo: true } : { ...form, photo: '' };
      const [, err] = id
        ? await api.put(`/members/${id}`, payload)
        : await api.post('/members', payload);
      if (err) { const msg = typeof err === 'string' ? err : 'Save failed.'; setError(msg); toast.addToast(msg, 'error'); }
      else { toast.addToast(id ? 'Person updated!' : 'Person added!', 'success'); navigate('/people'); }
    } else {
      const payload = { ...form, family_id: form.family_id || activeFamily?.id };
      const [, err] = id
        ? await api.put(`/members/${id}`, payload)
        : await api.post('/members', payload);
      if (err) { const msg = typeof err === 'string' ? err : 'Save failed.'; setError(msg); toast.addToast(msg, 'error'); }
      else { toast.addToast(id ? 'Person updated!' : 'Person added!', 'success'); navigate('/people'); }
    }
    setSaving(false);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo must be smaller than 2 MB.');
      return;
    }
    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoRemove = () => {
    setPhotoFile(false);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const initials = getMemberInitials(form);
  const avatarSrc = photoFile === false
    ? null
    : (photoPreview || (form.photo ? `${STORAGE_URL}/${form.photo}` : null));

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-ft-text-2">
      <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-ft-accent animate-spin" />
      <p className="text-sm">{t('memberForm.loadingPerson')}</p>
    </div>
  );

  return (
    <div className="min-h-full bg-ft-bg">
      {/* Page header */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">
              {id ? t('memberForm.editPerson') : t('memberForm.addNewPerson')}
            </h1>
            <p className="text-sm text-ft-text-3 mt-0.5">
              {id ? t('memberForm.editDescription') : t('memberForm.addDescription')}
            </p>
            {activeFamily ? (
              <p className="text-xs text-ft-accent font-semibold mt-1">
                {id
                  ? t('memberForm.familyLabel', { family: activeFamilyName })
                  : t('memberForm.addingToLabel', { family: activeFamilyName })}
              </p>
            ) : (
              <p className="text-xs text-ft-text-3 font-semibold mt-1">
                {t('memberForm.selectFamilyHint')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {id && canManageRelationships && (
              <div className="hidden sm:block">
                <SegmentedControl
                  options={[
                    { value: 'details', label: t('memberForm.details') },
                    { value: 'relationships', label: t('memberForm.relationships') },
                  ]}
                  value={tab}
                  onChange={(val) => setTab(val)}
                />
              </div>
            )}
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
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-4 text-sm font-semibold">{error}</div>}

            {tab === 'relationships' && id && canEdit && (
              <Section className="mb-0">
                <RelationshipManager memberId={id} memberName={form.name || 'This member'} familyId={form.family_id} />
              </Section>
            )}

            {tab === 'details' && (
              <form id="member-form" onSubmit={canEdit ? handleSubmit : (e) => e.preventDefault()} className="flex flex-col gap-6">
                {/* Identity */}
                <Section title={t('memberForm.identity')}>
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="relative group w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-ft-accent/20 bg-ft-accent-light text-ft-accent overflow-hidden shrink-0 cursor-pointer flex items-center justify-center text-3xl font-bold"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Camera className="text-white text-xl" />
                        </div>
                      </div>
                      {(photoFile !== false && (form.photo || photoPreview)) && (
                        <button type="button" onClick={handlePhotoRemove}
                          className="text-[0.7rem] text-red-500 hover:text-red-600 font-semibold cursor-pointer bg-transparent border-none p-0 inline-flex items-center gap-1">
                          <X /> Remove
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handlePhotoSelect} className="hidden" />
                    </div>

                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={`${t('memberForm.fullName')} *`} htmlFor="name" className="sm:col-span-2">
                        <input id="name" name="name" type="text" value={form.name}
                          onChange={handleChange} placeholder={t('memberForm.placeholderName')} required className={inputClass} />
                      </Field>
                      <Field label={t('memberForm.chineseName')} htmlFor="chinese_name">
                        <input id="chinese_name" name="chinese_name" type="text" value={form.chinese_name}
                          onChange={handleChange} placeholder={t('memberForm.placeholderChineseName')} className={inputClass} />
                      </Field>
                      <Field label={t('memberForm.initials')} htmlFor="initials">
                        <input id="initials" name="initials" type="text" value={form.initials || ''}
                          onChange={handleChange} placeholder={t('memberForm.placeholderInitials')} className={inputClass} maxLength={10} />
                      </Field>
                      <Field label={`${t('memberForm.gender')} *`} htmlFor="gender">
                        <select id="gender" name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
                          <option value="Male">{t('common.male')}</option>
                          <option value="Female">{t('common.female')}</option>
                        </select>
                      </Field>
                      <Field label={`${t('memberForm.family')} *`} htmlFor="family_id" className="sm:col-span-2">
                        <select id="family_id" name="family_id" value={form.family_id || ''} onChange={handleChange} className={inputClass}>
                          {families.length === 0 ? (
                            <option value="">{t('memberForm.noFamilyRegistered')}</option>
                          ) : (
                            <>
                              <option value="">{t('memberForm.selectFamily')}</option>
                              {families.map(family => (
                                <option key={family.id} value={family.id}>{family.name}</option>
                              ))}
                            </>
                          )}
                        </select>
                      </Field>
                      <Field label={t('memberForm.branch')} htmlFor="branch_id" className="sm:col-span-2">
                        <select id="branch_id" name="branch_id" value={form.branch_id || ''} onChange={handleChange} className={inputClass} disabled={!form.family_id}>
                          <option value="">{t('memberForm.noSpecificBranch')}</option>
                          {branches.filter(b => String(b.family_id) === String(form.family_id)).map(branch => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                </Section>

                {/* Life Events */}
                <Section title={t('memberForm.lifeEvents')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={t('memberForm.dob')} htmlFor="dob">
                      <input id="dob" name="dob" type="date" value={form.dob} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label={t('memberForm.placeOfBirth')} htmlFor="place_of_birth">
                      <input id="place_of_birth" name="place_of_birth" type="text" value={form.place_of_birth}
                        onChange={handleChange} placeholder={t('memberForm.placeholderPlaceOfBirth')} className={inputClass} />
                    </Field>
                    <Field label={t('memberForm.dod')} htmlFor="dod">
                      <input id="dod" name="dod" type="date" value={form.dod} onChange={handleChange} className={inputClass} />
                    </Field>
                    <Field label={t('memberForm.placeOfDeath')} htmlFor="place_of_death">
                      <input id="place_of_death" name="place_of_death" type="text" value={form.place_of_death}
                        onChange={handleChange} placeholder={t('memberForm.placeholderPlaceOfDeath')} className={inputClass} />
                    </Field>
                  </div>
                </Section>

                {/* Contact */}
                <Section title={t('memberForm.contact')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={t('memberForm.email')} htmlFor="email">
                      <input id="email" name="email" type="email" value={form.email}
                        onChange={handleChange} placeholder={t('memberForm.placeholderEmail')} className={inputClass} />
                    </Field>
                    <Field label={t('memberForm.phone')} htmlFor="phone">
                      <input id="phone" name="phone" type="tel" value={form.phone}
                        onChange={handleChange} placeholder={t('memberForm.placeholderPhone')} className={inputClass} />
                    </Field>
                    <Field label={t('memberForm.address')} htmlFor="address" className="sm:col-span-2">
                      <textarea id="address" name="address" value={form.address} onChange={handleChange}
                        rows={2} placeholder={t('memberForm.placeholderAddress')} className={`${inputClass} resize-y min-h-[80px]`} />
                    </Field>
                  </div>
                </Section>

                {/* Story */}
                <Section title={t('memberForm.story')}>
                  <Field label={t('memberForm.bio')} htmlFor="biography">
                    <textarea id="biography" name="biography" value={form.biography} onChange={handleChange}
                      rows={4} placeholder={t('memberForm.placeholderBio')} className={`${inputClass} resize-y min-h-[120px]`} />
                  </Field>
                </Section>
              </form>
            )}
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-6">
            {tab === 'details' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-ft-sm hidden lg:block">
                <h3 className="text-sm font-extrabold text-ft-accent mb-4">{t('memberForm.actions')}</h3>
                <button type="submit" form="member-form" disabled={saving || !canEdit}
                  className={`flex items-center justify-center gap-2 w-full mb-3 py-3 rounded-lg font-bold text-sm no-underline transition-all duration-150 btn-shimmer ${
                    canEdit
                      ? 'bg-ft-accent text-white hover:bg-ft-accent-hover active:scale-[0.98]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}>
                  {saving ? <><Spinner className="animate-spin text-sm" /> {t('common.saving')}</> : (id ? t('common.saveChanges') : t('memberForm.addPerson'))}
                </button>
                <Link to="/people"
                  className="flex items-center justify-center w-full py-3 rounded-lg border border-slate-200 text-ft-text-2 font-bold text-sm no-underline hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-all duration-150">
                  {t('common.cancel')}
                </Link>
              </div>
            )}

            <div className="bg-ft-accent-light border border-ft-accent/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-ft-accent mb-2">
                <Image className="text-sm" />
                <h3 className="text-sm font-extrabold">{t('memberForm.profilePhoto')}</h3>
              </div>
              <p className="text-xs text-ft-text-2 leading-relaxed mb-4">
                {t('memberForm.photoHelp')}
              </p>
              <div className="flex items-center gap-2 text-ft-accent mb-2">
                <Info className="text-sm" />
                <h3 className="text-sm font-extrabold">{t('memberForm.dataTracking')}</h3>
              </div>
              <p className="text-xs text-ft-text-2 leading-relaxed">
                {t('memberForm.dataTrackingHint')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar for mobile */}
      {tab === 'details' && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 px-4 py-4 flex items-center justify-between gap-3 z-50">
          <Link to="/people"
            className="px-5 py-3 rounded-lg border border-slate-200 text-ft-text-2 font-bold text-sm no-underline hover:bg-ft-accent-light hover:text-ft-accent hover:border-ft-accent transition-all duration-150 text-center flex-1">
            {t('common.cancel')}
          </Link>
          <button type="submit" form="member-form" disabled={saving || !canEdit}
            className={`px-5 py-3 rounded-lg font-bold text-sm transition-all duration-150 disabled:opacity-65 disabled:cursor-not-allowed flex-1 inline-flex items-center justify-center gap-2 ${
              canEdit
                ? 'bg-ft-accent text-white hover:bg-ft-accent-hover active:scale-[0.98] cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}>
            {saving ? <><Spinner className="animate-spin text-sm" /> {t('common.saving')}</> : (id ? t('common.saveChanges') : t('memberForm.addPerson'))}
          </button>
        </div>
      )}
    </div>
  );
}
