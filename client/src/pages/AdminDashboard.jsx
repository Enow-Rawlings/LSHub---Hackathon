import React, { useEffect, useState, useCallback } from 'react';
import { admin as adminApi } from '../api';
import { Shield, CheckCircle, XCircle, UserX, UserCheck, Users, Briefcase, ClipboardList, RefreshCw, Clock } from 'lucide-react';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';

const STATUS_CHIP = {
  pending:   'bg-amber-100 text-amber-700',
  active:    'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-600',
};

const TABS = ['pending', 'verifiers', 'users', 'audit'];

export default function AdminDashboard() {
  const [tab,     setTab]     = useState('pending');
  const [stats,   setStats]   = useState(null);
  const [pending, setPending] = useState([]);
  const [verifiers, setVerifiers] = useState([]);
  const [users,   setUsers]   = useState([]);
  const [audit,   setAudit]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState({});
  const [toast,   setToast]   = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, pendRes, verRes, usersRes, auditRes] = await Promise.allSettled([
        adminApi.stats(),
        adminApi.pendingVerifiers(),
        adminApi.allVerifiers(),
        adminApi.allUsers(),
        adminApi.auditLog(),
      ]);
      if (statsRes.status === 'fulfilled')    setStats(statsRes.value);
      if (pendRes.status === 'fulfilled')     setPending(pendRes.value.users || []);
      if (verRes.status === 'fulfilled')      setVerifiers(verRes.value.users || []);
      if (usersRes.status === 'fulfilled')    setUsers(usersRes.value.users || []);
      if (auditRes.status === 'fulfilled')    setAudit(auditRes.value.logs || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const act = async (id, fn, successMsg, reload = true) => {
    setActing(a => ({ ...a, [id]: true }));
    try {
      await fn();
      setToast({ type: 'success', message: successMsg });
      if (reload) loadAll();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setActing(a => ({ ...a, [id]: false }));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
        </div>
        <button onClick={loadAll} className="p-2 text-slate-400 hover:text-slate-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Users',    value: stats.totalUsers,       icon: <Users className="w-4 h-4 text-slate-400" /> },
            { label: 'Pending',        value: stats.pendingVerifiers, icon: <Clock className="w-4 h-4 text-amber-400" />, highlight: stats.pendingVerifiers > 0 },
            { label: 'Workers',        value: stats.totalWorkers,     icon: <Briefcase className="w-4 h-4 text-emerald-400" /> },
            { label: 'Jobs',           value: stats.totalJobs,        icon: <ClipboardList className="w-4 h-4 text-indigo-400" /> },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-2xl border shadow-sm p-4 ${s.highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-1">{s.icon}</div>
              <p className={`text-2xl font-bold ${s.highlight ? 'text-amber-600' : 'text-slate-800'}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-colors min-h-[36px] ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'pending' ? `Pending ${pending.length > 0 ? `(${pending.length})` : ''}` : t}
          </button>
        ))}
      </div>

      {/* ---- Pending verifiers tab ---- */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <EmptyState title="No pending verifiers" subtitle="All verifier applications have been reviewed" />
          ) : pending.map(u => (
            <div key={u._id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center font-bold text-amber-700">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.phone}</p>
                    {u.email && <p className="text-xs text-slate-400">{u.email}</p>}
                    <p className="text-xs text-slate-300 mt-0.5">Applied {new Date(u.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
                  Pending
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => act(u._id, () => adminApi.approve(u._id), `${u.name} approved as verifier`)}
                  disabled={acting[u._id]}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  {acting[u._id] ? <Spinner size="sm" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={() => act(u._id, () => adminApi.reject(u._id), `${u.name} rejected`)}
                  disabled={acting[u._id]}
                  className="flex-1 border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-60 text-sm font-semibold py-2.5 rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- All verifiers tab ---- */}
      {tab === 'verifiers' && (
        <div className="space-y-3">
          {verifiers.length === 0 ? (
            <EmptyState title="No verifiers yet" />
          ) : verifiers.map(u => (
            <div key={u._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{u.name}</p>
                  <p className="text-xs text-slate-400 truncate">{u.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CHIP[u.status] || ''}`}>
                  {u.status}
                </span>
                {u.status === 'active' && (
                  <button
                    onClick={() => act(u._id, () => adminApi.suspend(u._id), `${u.name} suspended`)}
                    disabled={acting[u._id]}
                    className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-60"
                    title="Suspend"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                )}
                {u.status === 'suspended' && (
                  <button
                    onClick={() => act(u._id, () => adminApi.reinstate(u._id), `${u.name} reinstated`)}
                    disabled={acting[u._id]}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 disabled:opacity-60"
                    title="Reinstate"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                )}
                {u.status === 'pending' && (
                  <button
                    onClick={() => act(u._id, () => adminApi.approve(u._id), `${u.name} approved`)}
                    disabled={acting[u._id]}
                    className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- All users tab ---- */}
      {tab === 'users' && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{u.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{u.role} · {u.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[u.status] || 'bg-slate-100 text-slate-500'}`}>
                  {u.status || 'active'}
                </span>
                {(u.status === 'active' || !u.status) && u.role !== 'admin' && (
                  <button
                    onClick={() => act(u._id, () => adminApi.suspend(u._id), `${u.name} suspended`)}
                    disabled={acting[u._id]}
                    className="p-1 text-slate-300 hover:text-red-500 disabled:opacity-60"
                    title="Suspend"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
                {u.status === 'suspended' && (
                  <button
                    onClick={() => act(u._id, () => adminApi.reinstate(u._id), `${u.name} reinstated`)}
                    disabled={acting[u._id]}
                    className="p-1 text-slate-300 hover:text-emerald-500 disabled:opacity-60"
                    title="Reinstate"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Audit log tab ---- */}
      {tab === 'audit' && (
        <div className="space-y-2">
          {audit.length === 0 ? (
            <EmptyState title="No audit entries yet" />
          ) : audit.map((log, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{log.action.replace(/_/g, ' ')}</p>
                  {log.reason && <p className="text-xs text-slate-400 mt-0.5">{log.reason}</p>}
                  {log.scoreBefore !== undefined && log.scoreAfter !== undefined && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Score: {log.scoreBefore} → {log.scoreAfter}
                    </p>
                  )}
                  {log.actor && <p className="text-xs text-slate-300 mt-0.5">by {log.actor.name}</p>}
                </div>
                <p className="text-xs text-slate-300 shrink-0">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
