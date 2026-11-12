import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { workers, jobs } from '../api';
import { useAuth } from '../AuthContext';
import { t } from '../i18n';
import WorkerCard from '../components/WorkerCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const TRADES = ['electrician','plumber','tailor','mechanic','mason','hairdresser','carpenter'];
const TOWNS  = ['Buea','Molyko','Limbe','Tiko','Kumba','Douala','Yaounde','Bamenda','Bafoussam'];

export default function Find({ lang }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trade,  setTrade]  = useState(params.get('trade') || '');
  const [town,   setTown]   = useState(params.get('town')  || '');
  const [budget, setBudget] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState(null);
  const [requesting, setRequesting] = useState(null); // worker object
  const [desc, setDesc] = useState('');
  const [sending, setSending] = useState(false);

  const search = async (e) => {
    if (e) e.preventDefault();
    if (!trade || !town) return;
    setLoading(true);
    setError(null);
    try {
      const q = { trade, town };
      if (budget) q.budget = budget;
      const data = await workers.search(q);
      setResults(data.workers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if trade+town came from landing
  useEffect(() => {
    if (trade && town) search();
  }, []); // eslint-disable-line

  const handleRequest = (worker) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setRequesting(worker);
    setDesc('');
  };

  const submitRequest = async () => {
    if (!desc.trim()) return;
    setSending(true);
    try {
      await jobs.create({ workerId: requesting.workerId, description: desc });
      setToast({ type: 'success', message: 'Job request sent!' });
      setRequesting(null);
      navigate('/my/jobs');
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSending(false);
    }
  };

  const useLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Find closest town
        setTown('Buea'); // fallback; real app would reverse geocode
      },
      () => setToast({ type: 'error', message: 'Could not get location' })
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <h1 className="text-xl font-bold text-slate-800 mb-5">{t(lang, 'findWorker')}</h1>

      {/* Search form */}
      <form onSubmit={search} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <select
            value={trade} onChange={e => setTrade(e.target.value)} required
            className="border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white min-h-[48px]"
          >
            <option value="">{t(lang, 'searchTrade')}</option>
            {TRADES.map(tr => <option key={tr} value={tr}>{tr.charAt(0).toUpperCase()+tr.slice(1)}</option>)}
          </select>
          <select
            value={town} onChange={e => setTown(e.target.value)} required
            className="border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white min-h-[48px]"
          >
            <option value="">{t(lang, 'searchTown')}</option>
            {TOWNS.map(tw => <option key={tw} value={tw}>{tw}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <input
            type="number" min={0}
            placeholder="Max budget (XAF, optional)"
            value={budget} onChange={e => setBudget(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-3 text-sm min-h-[48px]"
          />
          <button
            type="button" onClick={useLocation}
            className="border border-slate-200 rounded-xl px-3 py-3 text-slate-500 hover:bg-slate-50 min-h-[48px]"
            title="Use my location"
          >
            <MapPin className="w-4 h-4" />
          </button>
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 min-h-[48px] transition-colors"
        >
          <Search className="w-4 h-4" />
          {loading ? t(lang, 'loading') : t(lang, 'searchBtn')}
        </button>
      </form>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      )}

      {!loading && error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      )}

      {!loading && !error && results.length === 0 && (trade || town) && (
        <EmptyState title={t(lang, 'noResults')} subtitle="Adjust trade, town, or budget" />
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">{results.length} worker{results.length !== 1 ? 's' : ''} found</p>
          {results.map(w => (
            <WorkerCard key={w.workerId} worker={w} onRequest={handleRequest} lang={lang} />
          ))}
        </div>
      )}

      {/* Request modal */}
      {requesting && (
        <Modal title={`Request a job from ${requesting.name}`} onClose={() => setRequesting(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Briefly describe what you need done.</p>
            <textarea
              rows={3} maxLength={300}
              placeholder="e.g. Fix leaking kitchen pipe"
              value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRequesting(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium min-h-[48px]"
              >
                {t(lang, 'cancel')}
              </button>
              <button
                onClick={submitRequest} disabled={!desc.trim() || sending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold min-h-[48px]"
              >
                {sending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
