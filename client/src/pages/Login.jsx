import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ArrowRight, Lock, Phone, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { login } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({
    identifier: '',
    password: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.identifier || !loginData.password) {
      showToast('Please enter mobile/email and password.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const loggedUser = await login(loginData.identifier, loginData.password);
      showToast(`Welcome back, ${loggedUser.full_name}!`, 'success');
      if (loggedUser.role === 'owner') {
        navigate('/dashboard');
      } else {
        navigate('/salesman/home');
      }
    } catch (e) {
      showToast(e.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      
      {/* 1. TOP HEADER (Matching Admin Khatabook Dashboard Theme) */}
      <header className="bg-[#1b5e20] text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="Grihalakshmi Food Products Logo"
                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-white/30 shadow-sm"
              />
              <div>
                <h1 className="text-base font-semibold text-white tracking-tight leading-none">
                  Grihalakshmi Food Products
                </h1>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Official Ledger &amp; Field Staff Portal
                </p>
              </div>
            </div>

            {/* Right Live Security Indicator */}
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-100 px-3 py-1 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Sync Active</span>
              </div>
              <div className="flex items-center space-x-1 text-emerald-200 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span className="hidden md:inline">256-Bit SSL Encrypted</span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* 2. MAIN CENTERED LOGIN CONTAINER (Non-split, Unified Clean Card) */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative">
        
        {/* Subtle decorative background ambient glow */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-emerald-100/50 to-transparent pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          
          {/* Card Container */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
            
            {/* Top Brand Green Accent Strip */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-[#1b5e20] to-emerald-700" />

            <div className="p-7 sm:p-9 space-y-6">
              
              {/* Card Header with Brand Logo */}
              <div className="text-center space-y-2">
                <div className="inline-flex justify-center p-2 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm mb-1">
                  <img
                    src="/logo.png"
                    alt="Grihalakshmi Logo"
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Sign In to Your Workspace
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Owner &amp; Field Staff Digital Ledger
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Mobile or Email Identifier */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Registered Mobile or Email
                  </label>
                  <div className="relative group">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-emerald-700 transition-colors" />
                    <input
                      type="text"
                      required
                      autoFocus
                      autoComplete="username"
                      placeholder="e.g. 9876543210 or staff mobile"
                      value={loginData.identifier}
                      onChange={(e) =>
                        setLoginData({ ...loginData, identifier: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-emerald-700 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      className="w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 group flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#1b5e20] hover:bg-[#144c19] text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Ledger</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

                {/* Access Info Box */}
                <div className="pt-2">
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <span className="font-bold">Staff or Admin?</span> Log in with your registered phone number. Field accounts automatically open the Customer Directory.
                    </p>
                  </div>
                </div>

              </form>

            </div>

            {/* Bottom Card Footer */}
            <div className="px-7 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Live Cloud Ledger
              </span>
              <span>v2.4 Production</span>
            </div>

          </div>

          {/* Quick Notice under card */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Dedicated system for Grihalakshmi Food Products • 100% Data Protection
          </p>

        </div>

      </main>

      {/* 3. BOTTOM FOOTER */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        © {new Date().getFullYear()} Grihalakshmi Food Products • Simplified Field Ledger System
      </footer>

    </div>
  );
}

export default Login;
