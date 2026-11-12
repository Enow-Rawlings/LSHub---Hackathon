import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Briefcase, CheckCircle } from 'lucide-react';
import TrustBadge from './TrustBadge';

function Stars({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`w-3 h-3 ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
      <span className="text-xs text-slate-500 ml-1">{rating > 0 ? rating.toFixed(1) : 'No ratings'}</span>
    </span>
  );
}

export default function WorkerCard({ worker, onRequest, lang = 'en' }) {
  const { workerId, name, trade, town, trustScore, trustLevel, verifiedJobs, averageRating, distanceKm, priceMin, priceMax, available } = worker;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800 text-base">{name}</h3>
          <p className="text-sm text-slate-500 capitalize">{trade}</p>
        </div>
        <TrustBadge level={trustLevel} score={trustScore} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{town} · {distanceKm} km</span>
        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" />{verifiedJobs} jobs</span>
        <Stars rating={averageRating || 0} />
      </div>

      {(priceMin > 0 || priceMax > 0) && (
        <p className="text-xs text-slate-400">
          {priceMin.toLocaleString()} – {priceMax.toLocaleString()} XAF
        </p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
        <span className={`text-xs font-medium ${available ? 'text-emerald-600' : 'text-slate-400'}`}>
          {available ? '● Available now' : '○ Not available'}
        </span>
        <div className="flex gap-2">
          <Link
            to={`/workers/${workerId}`}
            className="text-xs text-emerald-600 font-medium underline underline-offset-2"
          >
            View passport
          </Link>
          <button
            onClick={() => onRequest(worker)}
            className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors min-h-[36px]"
          >
            Request Job
          </button>
        </div>
      </div>
    </div>
  );
}
