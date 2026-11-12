import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { auth } from '../api';
import { useAuth } from '../AuthContext';
import { t } from '../i18n';
import Toast from '../components/Toast';
import GoogleButton from '../components/GoogleButton';

const ROLES = ['customer', 'worker', 'verifier'];

export default function Register({ lang }) {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'customer', inviteCode: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (form.role !== 'verifier') delete payload.inviteCode;
      const data = await auth.register(payload);
      login(data.user, data.token);
      const dest = { worker: '/worker', verifier: '/verifier', customer: '/find' };
      navigate(dest[data.user.role] || '/');
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Registration failed' });
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
          <h1 className="text-xl font-bold text-slate-800">Create your account</h1>
          <p className="text-sm text-slate-400 mt-1">Join VouchPass today</p>
        </div>

        {/* Role selector */}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden mb-5">
          {ROLES.map(r => (
            <button
              key={r} type="button"
              onClick={() => setForm(f => ({ ...f, role: r }))}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors min-h-[44px] ${form.role === r ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600'}`}
            >
              {t(lang, r)}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t(lang, 'name')}</label>
            <input
              type="text" required autoComplete="name" minLength={2}
              placeholder="e.g. Che Francis"
              value={form.name} onChange={set('name')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[48px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t(lang, 'phone')}</label>
            <input
              type="tel" required autoComplete="tel"
              placeholder="+237700000000"
              value={form.phone} onChange={set('phone')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[48px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t(lang, 'password')}</label>
            <input
              type="password" required autoComplete="new-password" minLength={6}
              placeholder="At least 6 characters"
              value={form.password} onChange={set('password')}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[48px]"
            />
          </div>
          {form.role === 'verifier' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t(lang, 'inviteCode')}</label>
              <input
                type="text" required
                placeholder="Invite code"
                value={form.inviteCode} onChange={set('inviteCode')}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[48px]"
              />
            </div>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors min-h-[48px]"
          >
            {loading ? 'Creating account...' : t(lang, 'register')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-5">
          {t(lang, 'alreadyAccount')}{' '}
          <Link to="/login" className="text-emerald-600 font-medium">{t(lang, 'loginHere')}</Link>
        </p>

        {/* Google sign-in - shown for worker and customer only */}
        {form.role !== 'verifier' && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <GoogleButton
              role={form.role}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
          </>
        )}
      </div>
    </div>
  );
}
