import { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useContext(LanguageContext);

  return (
    <div className="flex items-center gap-1 bg-ft-surface-2 rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
          language === 'en'
            ? 'bg-white text-ft-accent shadow-sm'
            : 'text-ft-text-3 hover:text-ft-text-2'
        }`}
        aria-label={t('common.english')}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('id')}
        className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
          language === 'id'
            ? 'bg-white text-ft-accent shadow-sm'
            : 'text-ft-text-3 hover:text-ft-text-2'
        }`}
        aria-label={t('common.indonesian')}
      >
        ID
      </button>
    </div>
  );
}
