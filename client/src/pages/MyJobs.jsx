import React, { useEffect, useState, useCallback } from 'react';
import { Star, RefreshCw, KeyRound } from 'lucide-react';
import { jobs } from '../api';
import { t } from '../i18n';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const STATUS_STYLES = {
  requested:   'bg-slate-100 text-slate-600',
  accepted:    'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-amber-100 text-amber-700',
  confirmed:   'bg-indigo-100 text-indigo-700',
  declined:    'bg-red-50 text-red-500',
  cancelled:   'bg-slate-100 text-slate-400',
};

const STATUS_LABEL = {
  requested:   'Waiting for worker',
  accepted:    'Worker accepted',
  in_progress: 'In progress',
  confirmed:   'Completed',
  declined:    'Declined',
  cancelled:   'Cancelled',
};

function RateModal({ jobId, onDone, onClose, lang }) {
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [hovered, setHovered] = useState(0);

  const submit = async () => {
    if (!rating) return;
    setSending(true);
    try {
      await jobs.confirm(jobId, { rating, ratingComment: comment });
      onDone();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Confirm job complete" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-sm text-slate-500">How would you rate this worker?</p>
        <div className="flex gap-3 justify-center">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(n)}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Star className={`w-8 h-8 transition-colors ${n <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm font-medium text-slate-600">
            {['','Poor','Fair','Good','Very good','Excellent'][rating]}
          </p>
        )}
        <textarea
          rows={2} maxLength={300}
          placeholder="Optional comment..."
          value={comment} onChange={e => setComment(e.target.value)}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={submit} disabled={!rating || sending}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl min-h-[48px]"
        >
          {sending ? 'Submitting...' : 'Confirm & Rate'}
        </button>
      </div>
    </Modal>
  );
}

export default function MyJobs({ lang }) {
  const [jobList, setJobList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating,  setRating]  = useState(null);
  const [toast,   setToast]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobs.mine();
      setJobList(data.jobs || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    try {
      await jobs.cancel(id);
      setToast({ type: 'success', message: 'Job cancelled' });
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  // Split into active vs history
  const active  = jobList.filter(j => ['requested','accepted','in_progress'].includes(j.status));
  const history = jobList.filter(j => ['confirmed','declined','cancelled'].includes(j.status));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {rating && (
        <RateModal
          jobId={rating} lang={lang}
          onClose={() => setRating(null)}
          onDone={() => {
            setRating(null);
            load();
            setToast({ type: 'success', message: 'Job confirmed! Worker score updated.' });
          }}
        />
      )}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">{t(lang, 'myJobs')}</h1>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {jobList.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          subtitle="Find a worker and request a job to get started"
          action={
            <a href="/find" className="bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              Find a Worker
            </a>
          }
        />
      ) : (
        <div className="space-y-6">

          {/* ---- Active jobs ---- */}
          {active.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</h2>
              {active.map(job => {
                const workerName = job.worker?.user?.name || 'Worker';
                return (
                  <div key={job._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2 p-4 pb-3">
                      <div>
                        <p className="font-semibold text-slate-800">{workerName}</p>
                        <p className="text-xs text-slate-400 capitalize mt-0.5">{job.worker?.trade || ''}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[job.status]}`}>
                        {STATUS_LABEL[job.status] || job.status}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="px-4 pb-3">
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5">{job.description}</p>
                    </div>

                    {/* CODE DISPLAY — shown when accepted */}
                    {job.status === 'accepted' && (
                      <div className="mx-4 mb-4 bg-emerald-500 rounded-2xl p-5 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <KeyRound className="w-4 h-4 text-emerald-100" />
                          <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">
                            Your verification code
                          </p>
                        </div>
                        {job.code ? (
                          <>
                            <p className="text-6xl font-mono font-black text-white tracking-[0.3em] mb-3">
                              {job.code}
                            </p>
                            <p className="text-emerald-100 text-xs leading-relaxed">
                              Read this code to the worker when they arrive at your location.
                              They will enter it to start the job.
                            </p>
                          </>
                        ) : (
                          <div className="text-emerald-100 text-sm py-2">
                            <Spinner size="sm" />
                            <p className="mt-2 text-xs">Loading your code...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CONFIRM button — when in progress */}
                    {job.status === 'in_progress' && (
                      <div className="px-4 pb-4 space-y-2">
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 text-center font-medium">
                          Job is in progress
                        </div>
                        <button
                          onClick={() => setRating(job._id)}
                          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl min-h-[48px] text-sm transition-colors"
                        >
                          {t(lang, 'confirmComplete')}
                        </button>
                      </div>
                    )}

                    {/* Cancel */}
                    {['requested','accepted'].includes(job.status) && (
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => cancel(job._id)}
                          className="w-full border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 py-2.5 rounded-xl text-sm min-h-[44px] transition-colors"
                        >
                          Cancel job
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ---- History ---- */}
          {history.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">History</h2>
              {history.map(job => {
                const workerName = job.worker?.user?.name || 'Worker';
                return (
                  <div key={job._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-700">{workerName}</p>
                        <p className="text-xs text-slate-400 capitalize">{job.worker?.trade || ''}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[job.status]}`}>
                        {STATUS_LABEL[job.status] || job.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{job.description}</p>
                    {job.status === 'confirmed' && job.rating && (
                      <div className="flex items-center gap-1 pt-1">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= job.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                        <span className="text-xs text-slate-400 ml-1">You rated {job.rating}/5</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
