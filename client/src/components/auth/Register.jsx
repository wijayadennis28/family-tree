import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConf, setPasswordConf] = useState('');
  const [role, setRole] = useState('Family Member');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const api = useApi();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (password !== passwordConf) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    const [data, err] = await api.post('/auth/register', {
      name,
      email,
      password,
      role,
    });
    if (err) {
      setError(err?.message || 'Registration failed');
    } else {
      login(data.token, data.user);
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <h2>Register</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Confirm Password</label>
          <input
            type="password"
            value={passwordConf}
            onChange={(e) => setPasswordConf(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="Super Admin">Super Admin</option>
            <option value="Family Admin">Family Admin</option>
            <option value="Family Member">Family Member</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>
        <Button type="submit" loading={loading}>
          Register
        </Button>
      </form>
      <p>
        Already have an account?{' '}
        <a href="/login">Login here</a>
      </p>
    </div>
  );
}
