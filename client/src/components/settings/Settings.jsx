import { useState, useEffect, useContext } from 'react';
import { Gear, Spinner, Check } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function Settings() {
  const api = useApi();
  const toast = useToast();
  const { t } = useLanguage();
  const { user, primaryFamily, refreshUser } = useContext(AuthContext);

  const [families, setFamilies] = useState([]);
  const [primaryFamilyId, setPrimaryFamilyId] = useState(primaryFamily?.id || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrimaryFamilyId(primaryFamily?.id || '');
  }, [primaryFamily]);

  useEffect(() => {
    const loadFamilies = async () => {
      setLoading(true);
      const [data] = await api.get('/families');
      if (data) setFamilies(data);
      setLoading(false);
    };
    loadFamilies();
  }, [api]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const [, err] = await api.put('/auth/profile', {
      primary_family_id: primaryFamilyId || null,
    });
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('settings.updateFailed'), 'error');
    } else {
      toast.addToast(t('settings.updated'), 'success');
      await refreshUser();
    }
    setSaving(false);
  };

  return (
    <div className="min-h-full bg-ft-bg">
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-ft-accent-light text-ft-accent flex items-center justify-center text-lg">
            <Gear />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">{t('settings.title')}</h1>
            <p className="text-sm text-ft-text-3">{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 pb-24 lg:pb-8">
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-ft-sm space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-ft-text-1 mb-1">{t('settings.defaultFamily')}</h2>
            <p className="text-sm text-ft-text-3 mb-4">{t('settings.defaultFamilyHint')}</p>

            <label className="block text-[0.7rem] font-bold text-ft-text-3 mb-1.5 uppercase tracking-wider">{t('settings.defaultFamily')}</label>
            <select
              value={primaryFamilyId}
              onChange={(e) => setPrimaryFamilyId(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-ft-text-1 bg-ft-surface-2 outline-none focus:border-ft-accent focus:ring-[3px] focus:ring-ft-accent/15 transition-all disabled:opacity-60"
            >
              <option value="">{t('settings.noDefaultFamily')}</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-ft-text-3">
              <span className="font-semibold text-ft-text-2">{t('settings.signedInAs')}:</span> {user?.name} ({user?.email})
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ft-accent text-white text-sm font-bold hover:bg-ft-accent-hover disabled:opacity-60 transition-colors"
            >
              {saving ? <><Spinner className="animate-spin" /> {t('common.saving')}</> : <><Check /> {t('common.saveChanges')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
