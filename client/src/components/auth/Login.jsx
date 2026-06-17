import { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useApi } from '../../hooks/useApi';
import { AuthContext } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const cardRef  = useRef(null);
  const navigate = useNavigate();
  const api      = useApi();
  const { login } = useContext(AuthContext);

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
    if (err) {
      setError(typeof err === 'string' ? err : 'Invalid email or password.');
      gsap.fromTo(cardRef.current, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
    } else {
      login(data.token, data.user);
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card" ref={cardRef}>
        <div className="auth-logo">
          <span className="auth-logo-icon">&#x1F333;</span>
          <h1>Family Tree</h1>
          <p>Sign in to explore your family history</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
}
