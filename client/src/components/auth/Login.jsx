import { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Tree } from '@phosphor-icons/react';
import { useApi } from '../../hooks/useApi';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const cardRef  = useRef(null);
  const navigate = useNavigate();
  const api      = useApi();
  const { login } = useContext(AuthContext);
  const { t } = useLanguage();

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 32, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.4)' }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const [data, err] = await api.post('/auth/login', { email, password });
    if (err || !data || !data.token) {
      setError(typeof err === 'string' ? err : t('login.invalidCredentials'));
      gsap.fromTo(cardRef.current, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
    } else {
      login(data.token, data);
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-ft-bg p-4">
      <div
        ref={cardRef}
        className="w-full max-w-[420px] bg-white rounded-2xl border border-ft-border-hair shadow-ft-lg p-8 md:p-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shadow-ft-sm mb-4"
            style={{ background: 'linear-gradient(135deg, #2f6bff 0%, #8bb7ff 100%)' }}
          >
            <Tree />
          </span>
          <h1 className="text-2xl font-extrabold text-ft-text-1 tracking-tight">{t('login.title')}</h1>
          <p className="text-sm text-ft-text-3 mt-1">{t('login.subtitle')}</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-xs font-semibold text-ft-text-2 uppercase tracking-wider">
              {t('login.email')}
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full px-3.5 py-2.5 bg-ft-surface-2 border-[1.5px] border-slate-200 rounded-lg text-sm text-ft-text-1 placeholder:text-ft-text-3 outline-none transition-all duration-200 focus:border-ft-accent focus:bg-white focus:ring-[3px] focus:ring-ft-accent/15"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-xs font-semibold text-ft-text-2 uppercase tracking-wider">
              {t('login.password')}
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full px-3.5 py-2.5 bg-ft-surface-2 border-[1.5px] border-slate-200 rounded-lg text-sm text-ft-text-1 placeholder:text-ft-text-3 outline-none transition-all duration-200 focus:border-ft-accent focus:bg-white focus:ring-[3px] focus:ring-ft-accent/15"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-ft-accent text-white font-semibold text-sm hover:bg-ft-accent-hover active:scale-[0.98] transition-all duration-150 shadow-ft-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>
      </div>
    </div>
  );
}
