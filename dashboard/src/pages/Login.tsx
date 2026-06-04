import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { authApi } from '../lib/api';
import { ROUTES } from '../lib/constants';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await authApi.login(email, password);
      setAuth(data.token, data.user);
      navigate(ROUTES.OVERVIEW);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        'Unable to connect to auth service. (Tip: Use the Demo Mode option below to bypass offline backend verification)'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMockBypass = () => {
    setAuth('mock-jwt-token-12345', {
      id: 'usr_mock_1',
      email: email || 'admin@guardlayer.dev',
      role: 'administrator',
      createdAt: new Date().toISOString(),
    });
    navigate(ROUTES.OVERVIEW);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f7f8f8] flex flex-col items-center justify-center relative overflow-hidden font-sans select-none px-4">
      
      {/* Background Grids & Ambient Orange Glows */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 z-0 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-glow-radial-login z-0 pointer-events-none opacity-80" />

      {/* Main Centered Box */}
      <div className="relative w-full max-w-md z-10 space-y-6">
        
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <Link to={ROUTES.LANDING} className="flex items-center gap-2 font-bold text-xl text-white hover:opacity-95 transition-opacity">
            <div className="w-9 h-9 rounded-lg bg-[#ff5a1f] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <span className="tracking-tight font-extrabold text-2xl">GuardLayer</span>
          </Link>
        </div>

        {/* Embedded Sign In card, aligned with Scotch design */}
        <div className="bg-[#0d0d11]/80 backdrop-blur-md border border-[#17171e] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white tracking-tight">Sign in to gateway node</h2>
            <p className="text-xs text-gray-400">Configure guards and audit proxy traffic logs.</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3 rounded-md leading-relaxed">
                {error}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              placeholder="admin@guardlayer.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className="bg-[#000000] border-[#17171e] focus:border-slate-700 text-white placeholder:text-slate-800 focus:ring-0 rounded-lg"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              className="bg-[#000000] border-[#17171e] focus:border-slate-700 text-white placeholder:text-slate-800 focus:ring-0 rounded-lg"
            />

            <div className="space-y-3 pt-3">
              <Button
                type="submit"
                variant="primary"
                className="w-full bg-[#ff5a1f] hover:bg-[#e24e16]"
                isLoading={loading}
              >
                Sign In
              </Button>
              
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#17171e]"></div>
                <span className="flex-shrink mx-3 text-slate-700 text-[10px] uppercase tracking-wider font-bold">
                  Or Test Locally
                </span>
                <div className="flex-grow border-t border-[#17171e]"></div>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full bg-transparent hover:bg-slate-900/40 text-gray-300 hover:text-white border border-[#17171e]"
                onClick={handleMockBypass}
              >
                Enter Demo Mode
              </Button>
            </div>
          </form>
        </div>

        {/* Back Link to Landing */}
        <div className="text-center">
          <Link to={ROUTES.LANDING} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to landing page
          </Link>
        </div>

      </div>

      {/* Footer copyright */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-gray-600 z-10">
        <span>© {new Date().getFullYear()} GuardLayer. Open source self-hostable POS gateway nodes.</span>
      </footer>

    </div>
  );
};

export default Login;
