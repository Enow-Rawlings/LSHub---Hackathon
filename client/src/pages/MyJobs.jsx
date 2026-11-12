import React, { useEffect, useState, useCallback } from 'react';
import { Star } from 'lucide-react';
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

function RateModal({ jobId, onDone, onClose, lang }) {
  const [rating, setRating] = useState(0);
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
    <Modal title="Confirm and rate" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{t(lang, 'rateWorker')}</p>
        <div className="flex gap-2 justify-center">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(n)}
              className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Star className={`w-7 h-7 transition-colors ${n <= (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
            </button>
          ))}
        </div>
        <textarea
          rows={2} maxLength={300}
          placeholder="Optional comment..."
          value={comment} onChange={e => setComment(e.target.value)}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          onClick={submit} disabled={!rating || sending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl min-h-[48px]"
        >
          {sending ? 'Submitting...' : t(lang, 'confirmComplete')}
        </button>
      </div>
    </Modal>
  );
}

export default function MyJobs({ lang }) {
  const [jobList,  setJobList]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [rating,   setRating]   = useState(null); // jobId to rate
  const [toast,    setToast]    = useState(null);

  const load = useCallback(async () => {
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {rating && (
        <RateModal jobId={rating} lang={lang} onClose={() => setRating(null)} onDone={() => { setRating(null); load(); setToast({ type: 'success', message: 'Job confirmed! Score updated.' }); }} />
      )}

      <h1 className="text-xl font-bold text-slate-800 mb-5">{t(lang, 'myJobs')}</h1>

      {jobList.length === 0
        ? <EmptyState title={t(lang, 'noJobs')} subtitle="Your job requests will appear here" />
        : (
          <div className="space-y-4">
            {jobList.map(job => {
              const workerName = job.worker?.user?.name || 'Worker';
              return (
                <div key={job._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{workerName}</p>
                      <p className="text-xs text-slate-400 capitalize">{job.worker?.trade || ''}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[job.status] || ''}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{job.description}</p>

                  {/* Show code to customer when accepted */}
                  {job.status === 'accepted' && job.code && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                      <p className="text-xs text-emerald-600 font-medium mb-2">{t(lang, 'giveCode')}</p>
                      <p className="text-4xl font-mono font-extrabold text-emerald-700 tracking-widest">{job.code}</p>
                    </div>
                  )}

                  {/* Confirm button when in_progress */}
                  {job.status === 'in_progress' && (
                    <button
                      onClick={() => setRating(job._id)}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl min-h-[48px] text-sm"
                    >
                      {t(lang, 'confirmComplete')}
                    </button>
                  )}

                  {/* Cancel button for open jobs */}
                  {['requested', 'accepted'].includes(job.status) && (
                    <button
                      onClick={() => cancel(job._id)}
                      className="w-full border border-slate-200 text-slate-500 py-2.5 rounded-xl text-sm min-h-[44px] hover:bg-slate-50"
                    >
                      {t(lang, 'cancel')}
                    </button>
                  )}

                  {job.status === 'confirmed' && job.rating && (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-4 h-4 ${n <= job.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                      <span className="text-xs text-slate-400 ml-1">You rated {job.rating}/5</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
