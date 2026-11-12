import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, CheckCircle, Star, MessageCircle, ArrowRight, Zap } from 'lucide-react';
import { t } from '../i18n';

const TRADES = ['electrician','plumber','tailor','mechanic','mason','hairdresser','carpenter'];
const TOWNS  = ['Buea','Molyko','Limbe','Tiko','Kumba','Douala','Yaounde','Bamenda','Bafoussam'];

export default function Landing({ lang }) {
  const [trade, setTrade] = useState('');
  const [town,  setTown]  = useState('');
  const navigate = useNavigate();

  const search = (e) => {
    e.preventDefault();
    if (!trade || !town) return;
    navigate(`/find?trade=${trade}&town=${town}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Hero */}
      <div className="max-w-2xl mx-auto px-4 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Shield className="w-3.5 h-3.5" />
          Community-verified workers
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
          Hire workers your<br />community trusts
        </h1>

        <p className="text-slate-500 text-base max-w-sm mx-auto mb-10">
          {t(lang, 'tagline')}
        </p>

        {/* Search box */}
        <form onSubmit={search} className="bg-white rounded-2xl shadow-md border border-slate-100 p-4 flex flex-col sm:flex-row gap-3">
          <select
            value={trade}
            onChange={e => setTrade(e.target.value)}
            required
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-700 min-h-[48px]"
          >
            <option value="">{t(lang, 'searchTrade')}</option>
            {TRADES.map(tr => <option key={tr} value={tr}>{tr.charAt(0).toUpperCase()+tr.slice(1)}</option>)}
          </select>
          <select
            value={town}
            onChange={e => setTown(e.target.value)}
            required
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-700 min-h-[48px]"
          >
            <option value="">{t(lang, 'searchTown')}</option>
            {TOWNS.map(tw => <option key={tw} value={tw}>{tw}</option>)}
          </select>
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 justify-center min-h-[48px] transition-colors"
          >
            {t(lang, 'searchBtn')} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* How it works */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-slate-800 text-center mb-8">{t(lang, 'howItWorks')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: <Star className="w-5 h-5 text-amber-500" />, step: '01', text: t(lang, 'step1') },
            { icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, step: '02', text: t(lang, 'step2') },
            { icon: <Zap className="w-5 h-5 text-indigo-500" />, step: '03', text: t(lang, 'step3') },
          ].map(({ icon, step, text }) => (
            <div key={step} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">{step}</span>
                <span className="p-2 rounded-xl bg-slate-50">{icon}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat CTA */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <Link
          to="/chat"
          className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl py-4 px-6 font-semibold text-sm transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          {t(lang, 'tryChat')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
