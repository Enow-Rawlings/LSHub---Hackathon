import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { t, LANGS } from '../i18n';

export default function Navbar({ lang, setLang }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setOpen(false);
  };

  const roleLinks = {
    worker:   [{ to: '/worker',   label: t(lang, 'workerDash') }],
    customer: [{ to: '/my/jobs',  label: t(lang, 'myJobs') }],
    verifier: [{ to: '/verifier', label: t(lang, 'verifierDash') }],
    admin:    [{ to: '/admin',    label: 'Admin' }, { to: '/verifier', label: t(lang, 'verifierDash') }],
  };

  const links = user ? (roleLinks[user.role] || []) : [];

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-emerald-600 text-lg">
          <Shield className="w-5 h-5" />
          VouchPass
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          <Link to="/find" className="text-sm text-slate-600 hover:text-emerald-600 font-medium">{t(lang, 'findWorker')}</Link>
          <Link to="/chat" className="text-sm text-slate-600 hover:text-emerald-600 font-medium">{t(lang, 'chat')}</Link>
          {links.map(l => (
            <Link key={l.to} to={l.to} className="text-sm text-slate-600 hover:text-emerald-600 font-medium">{l.label}</Link>
          ))}
          {!user ? (
            <>
              <Link to="/login" className="text-sm text-slate-600 hover:text-emerald-600 font-medium">{t(lang, 'login')}</Link>
              <Link to="/register" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">{t(lang, 'register')}</Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                : <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">{user.name?.charAt(0)}</div>
              }
              <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-500 font-medium">{t(lang, 'logout')}</button>
            </div>
          )}
          {/* Language switcher */}
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"
          >
            {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>

        {/* Mobile hamburger */}
        <button className="sm:hidden p-2" onClick={() => setOpen(o => !o)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden bg-white border-t border-slate-100 px-4 py-4 flex flex-col gap-4">
          <Link to="/find" onClick={() => setOpen(false)} className="text-sm font-medium text-slate-700">{t(lang, 'findWorker')}</Link>
          <Link to="/chat" onClick={() => setOpen(false)} className="text-sm font-medium text-slate-700">{t(lang, 'chat')}</Link>
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-sm font-medium text-slate-700">{l.label}</Link>
          ))}
          {!user ? (
            <>
              <Link to="/login" onClick={() => setOpen(false)} className="text-sm font-medium text-slate-700">{t(lang, 'login')}</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="text-sm font-medium text-emerald-600">{t(lang, 'register')}</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="text-sm font-medium text-red-500 text-left">{t(lang, 'logout')}</button>
          )}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            {LANGS.map(l => (
              <button
                key={l}
                onClick={() => { setLang(l); setOpen(false); }}
                className={`text-xs px-3 py-1.5 rounded-lg border ${lang === l ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-600'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
