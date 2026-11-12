import React, { useEffect, useState, useCallback } from 'react';
import { workers as workersApi, jobs } from '../api';
import { useAuth } from '../AuthContext';
import { t } from '../i18n';
import TrustBadge from '../components/TrustBadge';
import ScoreRing from '../components/ScoreRing';
import ScoreBreakdown from '../components/ScoreBreakdown';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';

const TRADES = ['electrician','plumber','tailor','mechanic','mason','hairdresser','carpenter'];
const TOWNS  = ['Buea','Molyko','Limbe','Tiko','Kumba','Douala','Yaounde','Bamenda','Bafoussam'];

const STATUS_STYLES = {
  requested:   'bg-slate-100 text-slate-600',
  accepted:    'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-amber-100 text-amber-700',
  confirmed:   'bg-indigo-100 text-indigo-700',
};

export default function WorkerDashboard({ lang }) {
  const { user } = useAuth();
  const [profile,  setProfile]  = useState(null);
  const [jobList,  setJobList]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const [form,     setForm]     = useState(null);
  const [codeInputs, setCodeInputs] = useState({});

  const loadAll = useCallback(async () => {
    try {
      const [pData, jData] = await Promise.all([
        workersApi.getMyProfile().catch(() => null),
        jobs.mine(),
      ]);
      setProfile(pData?.profile || null);
      setJobList(jData?.jobs || []);
      if (pData?.profile) {
        setForm({
          trade:    pData.profile.trade,
          town:     pData.profile.town,
          priceMin: pData.profile.priceMin,
          priceMax: pData.profile.priceMax,
          bio:      pData.profile.bio,
          available: pData.profile.available,
        });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (profile) {
        const res = await workersApi.updateProfile(form);
        setProfile(res.profile);
      } else {
        const res = await workersApi.createProfile(form);
        setProfile(res.profile);
      }
      setToast({ type: 'success', message: 'Profile saved!' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async (jobId) => {
    try {
      await jobs.accept(jobId);
      setToast({ type: 'success', message: 'Job accepted' });
      loadAll();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleDecline = async (jobId) => {
    try {
      await jobs.decline(jobId);
      setToast({ type: 'success', message: 'Job declined' });
      loadAll();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  const handleStart = async (jobId) => {
    const code = codeInputs[jobId] || '';
    try {
      await jobs.start(jobId, { code });
      setToast({ type: 'success', message: 'Job started!' });
      loadAll();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const incoming = jobList.filter(j => j.status === 'requested');
  const active   = jobList.filter(j => ['accepted', 'in_progress'].includes(j.status));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <h1 className="text-xl font-bold text-slate-800">{t(lang, 'workerDash')}</h1>

      {/* Score summary */}
      {profile && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center gap-4">
          <TrustBadge level={profile.trustLevel} score={profile.trustScore} />
          <ScoreRing score={profile.trustScore} level={profile.trustLevel} size={110} />
          <ScoreBreakdown breakdown={profile.scoreBreakdown} />
          <p className="text-xs text-slate-400 text-center">{t(lang, 'howToRaise')}</p>
        </div>
      )}

      {/* Profile form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">{t(lang, 'profileSetup')}</h2>
        {form !== null && (
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">{t(lang, 'trade')}</label>
                <select
                  value={form.trade || ''} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} required
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm min-h-[48px]"
                >
                  <option value="">Select trade</option>
                  {TRADES.map(tr => <option key={tr} value={tr}>{tr.charAt(0).toUpperCase()+tr.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">{t(lang, 'town')}</label>
                <select
                  value={form.town || ''} onChange={e => setForm(f => ({ ...f, town: e.target.value }))} required
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm min-h-[48px]"
                >
                  <option value="">Select town</option>
                  {TOWNS.map(tw => <option key={tw} value={tw}>{tw}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">{t(lang, 'priceMin')}</label>
                <input
                  type="number" min={0}
                  value={form.priceMin || ''} onChange={e => setForm(f => ({ ...f, priceMin: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm min-h-[48px]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">{t(lang, 'priceMax')}</label>
                <input
                  type="number" min={0}
                  value={form.priceMax || ''} onChange={e => setForm(f => ({ ...f, priceMax: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm min-h-[48px]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">{t(lang, 'bio')}</label>
              <textarea
                rows={2} maxLength={300}
                value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm resize-none"
                placeholder="Tell customers about yourself..."
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
              <div
                onClick={() => setForm(f => ({ ...f, available: !f.available }))}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.available ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.available ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">{form.available ? t(lang, 'available') : t(lang, 'unavailable')}</span>
            </label>

            <button
              type="submit" disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl min-h-[48px]"
            >
              {saving ? 'Saving...' : t(lang, 'saveProfile')}
            </button>
          </form>
        )}
      </div>

      {/* Incoming requests */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">{t(lang, 'incomingJobs')} ({incoming.length})</h2>
        {incoming.length === 0
          ? <EmptyState title="No new requests" />
          : (
            <div className="space-y-3">
              {incoming.map(job => (
                <div key={job._id} className="border border-slate-100 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{job.customer?.name || 'Customer'}</p>
                    <p className="text-sm text-slate-500 mt-1">{job.description}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAccept(job._id)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl min-h-[44px]"
                    >
                      {t(lang, 'accept')}
                    </button>
                    <button
                      onClick={() => handleDecline(job._id)}
                      className="flex-1 border border-red-200 text-red-500 text-sm font-semibold py-2.5 rounded-xl min-h-[44px]"
                    >
                      {t(lang, 'decline')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Active jobs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">{t(lang, 'activeJobs')} ({active.length})</h2>
        {active.length === 0
          ? <EmptyState title="No active jobs" />
          : (
            <div className="space-y-3">
              {active.map(job => (
                <div key={job._id} className="border border-slate-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-slate-600">{job.description}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0 ml-2 ${STATUS_STYLES[job.status] || ''}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  {job.status === 'accepted' && (
                    <div className="flex gap-2">
                      <input
                        type="text" maxLength={4} pattern="\d{4}" placeholder="4-digit code"
                        value={codeInputs[job._id] || ''}
                        onChange={e => setCodeInputs(c => ({ ...c, [job._id]: e.target.value }))}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-center tracking-widest font-mono min-h-[44px]"
                      />
                      <button
                        onClick={() => handleStart(job._id)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 rounded-xl min-h-[44px]"
                      >
                        Start
                      </button>
                    </div>
                  )}
                  {job.status === 'in_progress' && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 text-center">
                      Job in progress. Ask customer to confirm when done.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}
