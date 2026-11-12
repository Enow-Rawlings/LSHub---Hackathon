import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { auth } from '../api';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * "Continue with Google" button using GoogleLogin component.
 * Hidden when VITE_GOOGLE_CLIENT_ID is not set.
 *
 * @param {string} role        - 'worker' | 'customer' | 'verifier'
 * @param {string} inviteCode  - required when role is 'verifier'
 * @param {function} onError   - called with error message string
 */
export default function GoogleButton({ role = 'customer', inviteCode = '', onError }) {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [loading, setLoading] = useState(false);

  // Don't render if no client ID is configured
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('your_')) return null;

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const data = await auth.google({
        credential: credentialResponse.credential,
        role,
        inviteCode: inviteCode || undefined,
      });
      login(data.user, data.token);
      const dest = { worker: '/worker', verifier: '/verifier', customer: '/find', admin: '/admin' };
      navigate(dest[data.user.role] || '/');
    } catch (err) {
      onError?.(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center gap-3 border border-slate-200 bg-slate-50 text-slate-400 font-semibold py-3 rounded-xl min-h-[48px]">
        Signing in...
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError?.('Google sign-in failed or was cancelled')}
        useOneTap={false}
        width="360"
        text="continue_with"
        shape="rectangular"
        theme="outline"
        logo_alignment="left"
      />
    </div>
  );
}
