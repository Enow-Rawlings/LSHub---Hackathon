import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, CheckCircle } from 'lucide-react';
import { workers } from '../api';
import { t } from '../i18n';
import TrustBadge from '../components/TrustBadge';
import ScoreRing from '../components/ScoreRing';
import ScoreBreakdown from '../components/ScoreBreakdown';
import QRCard from '../components/QRCard';
import Spinner from '../components/Spinner';

function Stars({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </span>
  );
}

export default function WorkerPassport({ lang }) {
  const { id } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const passportUrl = `${window.location.origin}/workers/${id}`;

  useEffect(() => {
    workers.getPassport(id)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error)   return <div className="max-w-2xl mx-auto px-4 py-10 text-center text-red-500">{error}</div>;
  if (!data)   return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700 overflow-hidden">
          {data.avatar
            ? <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
            : data.name.charAt(0)
          }
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">{data.name}</h1>
          <p className="text-slate-500 capitalize">{data.trade} · {data.town}</p>
        </div>
        <TrustBadge level={data.trustLevel} score={data.trustScore} />

        <div className="mt-2">
          <ScoreRing score={data.trustScore} level={data.trustLevel} size={130} />
        </div>

        <div className="flex gap-6 text-center mt-2">
          <div>
            <p className="text-xl font-bold text-slate-800">{data.verifiedJobs}</p>
            <p className="text-xs text-slate-400">{t(lang, 'verifiedJobs')}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">{data.averageRating > 0 ? data.averageRating.toFixed(1) : '-'}</p>
            <p className="text-xs text-slate-400">{t(lang, 'avgRating')}</p>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">{data.priceMin > 0 ? `${(data.priceMin/1000).toFixed(0)}k` : '-'}</p>
            <p className="text-xs text-slate-400">Min XAF</p>
          </div>
        </div>

        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${data.available ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          {data.available ? t(lang, 'available') : t(lang, 'unavailable')}
        </span>

        {data.bio && <p className="text-sm text-slate-500 text-center max-w-xs">{data.bio}</p>}

        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {t(lang, 'memberSince')} {new Date(data.memberSince).toLocaleDateString()}
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">{t(lang, 'scoreBreakdown')}</h2>
        <ScoreBreakdown breakdown={data.scoreBreakdown} />
      </div>

      {/* Vouches */}
      {data.vouches?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">{t(lang, 'vouches')} ({data.vouches.length})</h2>
          <div className="space-y-3">
            {data.vouches.map((v, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                  {v.verifierName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">{v.verifierName}</p>
                  {v.comment && <p className="text-xs text-slate-400 mt-0.5">"{v.comment}"</p>}
                  <p className="text-xs text-slate-300 mt-0.5">{new Date(v.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {data.skills?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">{t(lang, 'skills')}</h2>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-medium px-3 py-1.5 rounded-full border border-sky-100">
                <CheckCircle className="w-3 h-3" />
                {s.skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Ratings */}
      {data.recentRatings?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">{t(lang, 'recentRatings')}</h2>
          <div className="space-y-3">
            {data.recentRatings.map((r, i) => (
              <div key={i} className="pb-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <Stars rating={r.rating} />
                  <span className="text-xs text-slate-300">{new Date(r.date).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-500">{r.description}</p>
                {r.comment && <p className="text-xs text-slate-400 italic mt-0.5">"{r.comment}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Card */}
      <QRCard url={passportUrl} />

      {/* Request job link */}
      <Link
        to={`/find?trade=${data.trade}&town=${data.town}`}
        className="block text-center bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 rounded-2xl transition-colors"
      >
        Request a Job
      </Link>
    </div>
  );
}
