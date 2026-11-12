import React, { useState } from 'react';
import { Search, Shield, CheckCircle } from 'lucide-react';
import { workers as workersApi, verifier as verifierApi } from '../api';
import { t } from '../i18n';
import TrustBadge from '../components/TrustBadge';
import ScoreRing from '../components/ScoreRing';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';

const TRADES = ['electrician','plumber','tailor','mechanic','mason','hairdresser','carpenter'];
const TOWNS  = ['Buea','Molyko','Limbe','Tiko','Kumba','Douala','Yaounde','Bamenda','Bafoussam'];

export default function VerifierDashboard({ lang }) {
  const [trade,   setTrade]   = useState('');
  const [town,    setTown]    = useState('Buea');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [passport, setPassport] = useState(null);
  const [comment,  setComment]  = useState('');
  const [skill,    setSkill]    = useState('');
  const [toast,    setToast]    = useState(null);
  const [acting,   setActing]   = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!trade) return;
    setLoading(true);
    try {
      const data = await workersApi.search({ trade, town });
      setResults(data.workers || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const openWorker = async (w) => {
    setSelected(w);
    setPassport(null);
    try {
      const data = await workersApi.getPassport(w.workerId);
      setPassport(data);
    } catch (err) {
      setToast({ type: 'error', message: 'Could not load passport' });
    }
  };

  const submitVouch = async () => {
    setActing(true);
    try {
      await verifierApi.vouch({ workerId: selected.workerId, comment });
      setToast({ type: 'success', message: 'Vouch submitted! Score updated.' });
      setComment('');
      openWorker(selected);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setActing(false);
    }
  };

  const submitSkill = async () => {
    if (!skill.trim()) return;
    setActing(true);
    try {
      await verifierApi.skillCheck({ workerId: selected.workerId, skill });
      setToast({ type: 'success', message: 'Skill signed off! Score updated.' });
      setSkill('');
      openWorker(selected);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <h1 className="text-xl font-bold text-slate-800">{t(lang, 'verifierDash')}</h1>

      {/* Search */}
      <form onSubmit={search} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select value={trade} onChange={e => setTrade(e.target.value)} required
            className="border border-slate-200 rounded-xl px-3 py-3 text-sm min-h-[48px]">
            <option value="">Select trade</option>
            {TRADES.map(tr => <option key={tr} value={tr}>{tr.charAt(0).toUpperCase()+tr.slice(1)}</option>)}
          </select>
          <select value={town} onChange={e => setTown(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-3 text-sm min-h-[48px]">
            {TOWNS.map(tw => <option key={tw} value={tw}>{tw}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 min-h-[48px]">
          <Search className="w-4 h-4" />
          {loading ? 'Searching...' : 'Search Workers'}
        </button>
      </form>

      {/* Results list */}
      {results.length > 0 && !selected && (
        <div className="space-y-3">
          {results.map(w => (
            <button key={w.workerId} onClick={() => openWorker(w)} className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3 text-left hover:border-indigo-200 transition-colors">
              <div>
                <p className="font-medium text-slate-800">{w.name}</p>
                <p className="text-xs text-slate-400 capitalize">{w.trade} · {w.town}</p>
              </div>
              <TrustBadge level={w.trustLevel} score={w.trustScore} />
            </button>
          ))}
        </div>
      )}

      {/* Worker passport + vouch/skill panel */}
      {selected && (
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-indigo-500 font-medium">
            &larr; Back to results
          </button>

          {!passport
            ? <div className="flex justify-center py-10"><Spinner /></div>
            : (
              <>
                {/* Summary */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">
                    {passport.name.charAt(0)}
                  </div>
                  <div className="text-center">
                    <h2 className="font-bold text-slate-800">{passport.name}</h2>
                    <p className="text-sm text-slate-400 capitalize">{passport.trade} · {passport.town}</p>
                  </div>
                  <TrustBadge level={passport.trustLevel} score={passport.trustScore} />
                  <ScoreRing score={passport.trustScore} level={passport.trustLevel} size={100} />

                  {/* Existing skills */}
                  {passport.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {passport.skills.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-xs px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" /> {s.skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vouch panel */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    {t(lang, 'vouch')}
                  </h3>
                  <textarea rows={2} maxLength={200}
                    placeholder={t(lang, 'commentPlaceholder')}
                    value={comment} onChange={e => setComment(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button onClick={submitVouch} disabled={acting}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl min-h-[48px]">
                    {acting ? 'Submitting...' : 'Submit Vouch'}
                  </button>
                </div>

                {/* Skill check panel */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-sky-500" />
                    {t(lang, 'addSkill')}
                  </h3>
                  <input
                    type="text" maxLength={100}
                    placeholder={t(lang, 'skillPlaceholder')}
                    value={skill} onChange={e => setSkill(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 min-h-[48px]"
                  />
                  <button onClick={submitSkill} disabled={acting || !skill.trim()}
                    className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl min-h-[48px]">
                    {acting ? 'Signing off...' : 'Sign Off Skill'}
                  </button>
                </div>
              </>
            )
          }
        </div>
      )}
    </div>
  );
}
