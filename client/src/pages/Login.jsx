import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { auth } from '../api';
import { useAuth } from '../AuthContext';
import { t } from '../i18n';
import Toast from '../components/Toast';

export default function Login({ lang }) {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await auth.login(form);
      login(data.user, data.token);
      // Route to role-specific page
      const dest = { worker: '/worker', verifier: '/verifier', customer: '/find', admin: '/' };
      navigate(dest[data.user.role] || '/');
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-2xl mb-3">
            <Shield className="w-6 h-6 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1">Log in to your VouchPass account</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t(lang, 'phone')}</label>
            <input
              type="tel" required autoComplete="tel"
              placeholder="+237700000000"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[48px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t(lang, 'password')}</label>
            <input
              type="password" required autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[48px]"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors min-h-[48px]"
          >
            {loading ? 'Logging in...' : t(lang, 'login')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-5">
          {t(lang, 'noAccount')}{' '}
          <Link to="/register" className="text-emerald-600 font-medium">{t(lang, 'registerHere')}</Link>
        </p>
      </div>
    </div>
  );
}
