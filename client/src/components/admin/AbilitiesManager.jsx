import { useEffect, useState, useCallback } from 'react';
import { Shield, Spinner, Check, X } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

const ROLES = ['Admin', 'Editor', 'Member', 'Viewer'];

export default function AbilitiesManager() {
  const api = useApi();
  const toast = useToast();
  const { t } = useLanguage();

  const [abilities, setAbilities] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, err] = await api.get('/abilities');
    if (err) {
      toast.addToast(t('abilitiesManager.loadError'), 'error');
    } else {
      setAbilities(data.abilities || []);
      setMatrix(data.matrix || {});
    }
    setLoading(false);
  }, [api, toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAbility = (role, abilityId) => {
    setMatrix(prev => {
      const current = new Set(prev[role] || []);
      if (current.has(abilityId)) {
        current.delete(abilityId);
      } else {
        current.add(abilityId);
      }
      return { ...prev, [role]: Array.from(current) };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const [, err] = await api.put('/abilities', { matrix });
    if (err) {
      toast.addToast(typeof err === 'string' ? err : t('abilitiesManager.saveError'), 'error');
    } else {
      toast.addToast(t('abilitiesManager.saved'), 'success');
    }
    setSaving(false);
  };

  const grouped = abilities.reduce((acc, ability) => {
    acc[ability.category] = acc[ability.category] || [];
    acc[ability.category].push(ability);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">{t('abilitiesManager.title')}</h1>
        <p className="text-sm text-ft-text-3 mt-1">
          {t('abilitiesManager.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4 text-ft-text-2">
          <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-ft-accent animate-spin" />
          <p className="text-sm">{t('abilitiesManager.loading')}</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-ft-sm mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-ft-surface-2 text-ft-text-2 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('abilitiesManager.ability')}</th>
                  {ROLES.map(role => (
                    <th key={role} className="px-4 py-3 font-semibold text-center">{t(`common.${role.toLowerCase()}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(grouped).map(([category, items]) => (
                  <>
                    <tr key={category} className="bg-ft-surface-2/30">
                      <td colSpan={5} className="px-4 py-2 text-xs font-bold text-ft-text-2 uppercase tracking-wider">
                        {category}
                      </td>
                    </tr>
                    {items.map(ability => (
                      <tr key={ability.id} className="hover:bg-ft-surface-2/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ft-text-1">{ability.label}</div>
                          <div className="text-xs text-ft-text-3">{ability.description}</div>
                        </td>
                        {ROLES.map(role => {
                          const allowed = (matrix[role] || []).includes(ability.id);
                          return (
                            <td key={role} className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleAbility(role, ability.id)}
                                className={`w-8 h-8 rounded-lg border transition-all duration-150 flex items-center justify-center ${
                                  allowed
                                    ? 'bg-ft-accent text-white border-ft-accent'
                                    : 'bg-white text-ft-text-3 border-slate-200 hover:border-ft-accent'
                                }`}
                              >
                                {allowed ? <Check className="text-xs" /> : <X className="text-xs" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ft-accent text-white font-bold text-sm hover:bg-ft-accent-hover disabled:opacity-60 transition-colors"
          >
            {saving ? <><Spinner className="animate-spin" /> {t('common.saving')}</> : <><Shield /> {t('abilitiesManager.save')}</>}
          </button>
          </div>
        </>
      )}
    </div>
  );
}
