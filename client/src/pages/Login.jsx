import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Sparkles, ArrowRight, ShieldCheck, UserCheck, Lock, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { login, demoUsers, switchUser } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('owner@khataflow.com');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const loggedUser = await login(identifier, password);
      showToast(`Welcome back, ${loggedUser.full_name}!`, 'success');
      if (loggedUser.role === 'owner') {
        navigate('/dashboard');
      } else {
        navigate('/salesman/home');
      }
    } catch (e) {
      showToast(e.message || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoClick = async (demoUser) => {
    try {
      await switchUser(demoUser.id);
      showToast(`Switched to ${demoUser.full_name} (${demoUser.role.toUpperCase()})`, 'success');
      if (demoUser.role === 'owner') {
        navigate('/dashboard');
      } else {
        navigate('/salesman/home');
      }
    } catch (e) {
      showToast('Error switching demo user', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 items-center justify-center text-white shadow-glow-brand mb-3">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Khata<span className="text-brand-600 dark:text-brand-400">Flow</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
          Intelligent Digital Khata & Field Sales Management Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-premium rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Mobile Number or Email
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or email"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-glow-brand transition-all disabled:opacity-50"
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Launchers (Evaluation Preset) */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Evaluation Presets (1-Click Login)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoUsers.map((du) => (
                <button
                  key={du.id}
                  onClick={() => handleDemoClick(du)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all hover:scale-102 ${
                    du.role === 'owner'
                      ? 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/20'
                      : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    {du.role === 'owner' ? <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{du.full_name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 capitalize mt-0.5">
                    Role: {du.role} • {du.employee_id || 'Staff'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
