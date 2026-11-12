import React, { useEffect, useState, useCallback, useRef } from 'react';
import { workers as workersApi, jobs as jobsApi } from '../api';
import { useAuth } from '../AuthContext';
import { t } from '../i18n';
import TrustBadge from '../components/TrustBadge';
import ScoreRing from '../components/ScoreRing';
import ScoreBreakdown from '../components/ScoreBreakdown';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { Camera, CheckCircle, XCircle, Play, RefreshCw } from 'lucide-react';

const TRADES = ['electrician','plumber','tailor','mechanic','mason','hairdresser','carpenter'];
const TOWNS  = ['Buea','Molyko','Limbe','Tiko','Kumba','Douala','Yaounde','Bamenda','Bafoussam'];

const STATUS_CHIP = {
  requested:   'bg-slate-100 text-slate-600',
  accepted:    'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-amber-100 text-amber-700',
  confirmed:   'bg-indigo-100 text-indigo-700',
  declined:    'bg-red-50 text-red-500',
  cancelled:   'bg-slate-100 text-slate-400',
};

const EMPTY_FORM = {
  trade: '', town: '', priceMin: '', priceMax: '', bio: '', available: true,
};

export default function WorkerDashboard({ lang }) {
  const { user } = useAuth();
  const fileRef  = useRef(null);

  const [profile,    setProfile]    = useState(null);
  const [jobList,    setJobList]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [toast,      setToast]      = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [codeInputs, setCodeInputs] = useState({});
  const [acting,     setActing]     = useState({}); // per-job loading state

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, jRes] = await Promise.allSettled([
        workersApi.getMyProfile(),
        jobsApi.mine(),
      ]);

      if (pRes.status === 'fulfilled' && pRes.value?.profile) {
        const p = pRes.value.profile;
        setProfile(p);
        setForm({
          trade:    p.trade     || '',
          town:     p.town      || '',
          priceMin: p.priceMin  || '',
          priceMax: p.priceMax  || '',
          bio:      p.bio       || '',
          available: p.available !== undefined ? p.available : true,
        });
      } else {
        setProfile(null);
        setForm(EMPTY_FORM);
      }

      if (jRes.status === 'fulfilled') {
        setJobList(jRes.value?.jobs || []);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ---- Profile save ---- */
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!form.trade || !form.town) {
      setToast({ type: 'error', message: 'Trade and town are required' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        trade:    form.trade,
        town:     form.town,
        priceMin: Number(form.priceMin) || 0,
        priceMax: Number(form.priceMax) || 0,
        bio:      form.bio,
        available: form.available,
      };
      let res;
      if (profile) {
        res = await workersApi.updateProfile(payload);
      } else {
        res = await workersApi.createProfile(payload);
      }
      setProfile(res.profile);
      setToast({ type: 'success', message: 'Profile saved!' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  /* ---- Photo upload ---- */
  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await workersApi.uploadPhoto(file);
      setProfile(res.profile);
      setToast({ type: 'success', message: 'Photo updated!' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setUploading(false);
      // reset so same file can be re-uploaded
      e.target.value = '';
    }
  };

  /* ---- Job actions ---- */
  const jobAction = async (jobId, fn, successMsg) => {
    setActing(a => ({ ...a, [jobId]: true }));
    try {
      await fn();
      setToast({ type: 'success', message: successMsg });
      loadAll();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setActing(a => ({ ...a, [jobId]: false }));
    }
  };

  const handleAccept  = id => jobAction(id, () => jobsApi.accept(id),  'Job accepted!');
  const handleDecline = id => jobAction(id, () => jobsApi.decline(id), 'Job declined');
  const handleStart   = id => {
    const code = (codeInputs[id] || '').trim();
    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      setToast({ type: 'error', message: 'Enter the 4-digit code from the customer' });
      return;
    }
    jobAction(id, () => jobsApi.start(id, { code }), 'Job started!');
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const incoming  = jobList.filter(j => j.status === 'requested');
  const active    = jobList.filter(j => ['accepted', 'in_progress'].includes(j.status));
  const completed = jobList.filter(j => ['confirmed','declined','cancelled'].includes(j.status));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t(lang, 'workerDash')}</h1>
        <button onClick={loadAll} className="p-2 text-slate-400 hover:text-slateald-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ---- Score card (only when profile exists) ---- */}
      {profile && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col items-center gap-3">
            {/* Avatar with upload */}
            <div className="relative">
              {profile.photos?.[0]
                ? <img src={profile.photos[0]} alt="Profile" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-100" />
                : (
                  <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700">
                    {user?.name?.charAt(0) || '?'}
                  </div>
                )
              }
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-full flex items-center justify-center shadow-md"
                title="Change photo"
              >
                {uploading ? <Spinner size="sm" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
            </div>

            <TrustBadge level={profile.trustLevel} score={profile.trustScore} />
            <ScoreRing score={profile.trustScore} level={profile.trustLevel} size={110} />

            <div className="w-full pt-2 border-t border-slate-50">
              <ScoreBreakdown breakdown={profile.scoreBreakdown} />
            </div>

            <p className="text-xs text-slate-400 text-center bg-slate-50 rounded-xl px-3 py-2 w-full">
              {t(lang, 'howToRaise')}
            </p>
          </div>
        </div>
      )}

      {/* ---- Profile setup form ---- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-1">
          {profile ? 'Update Profile' : 'Set Up Your Profile'}
        </h2>
        {!profile && (
          <p className="text-xs text-slate-400 mb-4">Complete your profile so customers can find you.</p>
        )}

        <form onSubmit={saveProfile} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">{t(lang, 'trade')} *</label>
              <select
                value={form.trade} onChange={set('trade')} required
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white min-h-[48px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Select trade</option>
                {TRADES.map(tr => (
                  <option key={tr} value={tr}>{tr.charAt(0).toUpperCase() + tr.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">{t(lang, 'town')} *</label>
              <select
                value={form.town} onChange={set('town')} required
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white min-h-[48px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                type="number" min={0} placeholder="e.g. 2000"
                value={form.priceMin} onChange={set('priceMin')}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">{t(lang, 'priceMax')}</label>
              <input
                type="number" min={0} placeholder="e.g. 10000"
                value={form.priceMax} onChange={set('priceMax')}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">{t(lang, 'bio')}</label>
            <textarea
              rows={3} maxLength={300}
              placeholder="Tell customers about your experience and skills..."
              value={form.bio} onChange={set('bio')}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <p className="text-xs text-slate-300 text-right mt-0.5">{(form.bio || '').length}/300</p>
          </div>

          {/* Availability toggle */}
          <div
            className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 cursor-pointer min-h-[52px]"
            onClick={() => setForm(f => ({ ...f, available: !f.available }))}
          >
            <div>
              <p className="text-sm font-medium text-slate-700">
                {form.available ? t(lang, 'available') : t(lang, 'unavailable')}
              </p>
              <p className="text-xs text-slate-400">Customers see this when searching</p>
            </div>
            <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.available ? 'bg-emerald-500' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.available ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          <button
            type="submit" disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl min-h-[48px] transition-colors"
          >
            {saving ? 'Saving...' : t(lang, 'saveProfile')}
          </button>
        </form>
      </div>

      {/* ---- Incoming requests ---- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">{t(lang, 'incomingJobs')}</h2>
          {incoming.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{incoming.length}</span>
          )}
        </div>

        {incoming.length === 0 ? (
          <EmptyState title="No new requests" subtitle="When customers request your services, they appear here" />
        ) : (
          <div className="space-y-3">
            {incoming.map(job => (
              <div key={job._id} className="border border-slate-100 rounded-xl p-4 space-y-3 hover:border-emerald-100 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {(job.customer?.name || 'C').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{job.customer?.name || 'Customer'}</p>
                    <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{job.description}</p>
                    <p className="text-xs text-slate-300 mt-1">{new Date(job.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(job._id)}
                    disabled={acting[job._id]}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {acting[job._id] ? <Spinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
                    {t(lang, 'accept')}
                  </button>
                  <button
                    onClick={() => handleDecline(job._id)}
                    disabled={acting[job._id]}
                    className="flex-1 border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-60 text-sm font-semibold py-2.5 rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    {t(lang, 'decline')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Active jobs ---- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">{t(lang, 'activeJobs')}</h2>

        {active.length === 0 ? (
          <EmptyState title="No active jobs" subtitle="Accepted jobs will appear here" />
        ) : (
          <div className="space-y-3">
            {active.map(job => (
              <div key={job._id} className="border border-slate-100 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${STATUS_CHIP[job.status] || ''}`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Code entry when accepted */}
                {job.status === 'accepted' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">{t(lang, 'enterCode')}</p>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="0000"
                        value={codeInputs[job._id] || ''}
                        onChange={e => setCodeInputs(c => ({ ...c, [job._id]: e.target.value.replace(/\D/g,'') }))}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-center text-xl tracking-[0.5em] font-mono min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        onClick={() => handleStart(job._id)}
                        disabled={acting[job._id] || (codeInputs[job._id] || '').length !== 4}
                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold px-5 rounded-xl min-h-[48px] flex items-center gap-1.5 transition-colors"
                      >
                        {acting[job._id] ? <Spinner size="sm" /> : <Play className="w-4 h-4" />}
                        Start
                      </button>
                    </div>
                  </div>
                )}

                {job.status === 'in_progress' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700 text-center font-medium">
                    Job in progress — ask the customer to confirm when done
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Recent completed jobs ---- */}
      {completed.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Recent History</h2>
          <div className="space-y-2">
            {completed.slice(0, 5).map(job => (
              <div key={job._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <p className="text-sm text-slate-500 truncate flex-1 mr-3">{job.description}</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${STATUS_CHIP[job.status] || ''}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
