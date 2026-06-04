import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { authApi } from '../lib/api';

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
      navigate('/');
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
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f7f8f8] flex flex-col relative overflow-hidden font-sans select-none">
      
      {/* Background Grids & Ambient Orange Glows */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 z-0 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[650px] bg-glow-radial-login z-0 pointer-events-none" />

      {/* Top Navbar Header */}
      <header className="relative w-full h-16 border-b border-[#17171e]/60 backdrop-blur-sm z-10 flex items-center px-6 sm:px-12">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base text-white">
            {/* Square Scotch-style Brand Box */}
            <div className="w-7 h-7 rounded-lg bg-[#ff5a1f] flex items-center justify-center shadow-lg shadow-orange-500/10">
              <svg
                className="h-4 w-4 text-white"
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
            <span className="tracking-tight font-extrabold">GuardLayer</span>
          </div>

          {/* Links matching Scotch Navbar */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <a href="#features" className="hover:text-white transition-colors">Products</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#blog" className="hover:text-white transition-colors">Blog</a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={handleMockBypass}
              className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              Login
            </button>
            <button
              onClick={handleMockBypass}
              className="bg-white text-black hover:bg-gray-100 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all"
            >
              Book a demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero and Sign In section */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-20 z-10">
        
        {/* Introducing Pill */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#17171e] bg-[#0d0d11]/80 text-gray-300 text-xs font-medium tracking-wide">
          <span>Introducing GuardLayer</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f]" />
        </div>

        {/* Hero Headlines */}
        <div className="text-center max-w-3xl mb-12">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            The gateway that knows <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#ff5a1f]">
              security like you do.
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-gray-400 leading-relaxed max-w-xl mx-auto">
            Far from just another proxy, GuardLayer is the all-in-one operating gateway designed exclusively for LLM safety and client integrations.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="primary"
              size="md"
              onClick={handleMockBypass}
              className="flex items-center gap-1.5"
            >
              <span>Book a demo</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Button>
            <button
              onClick={() => {
                const formElement = document.getElementById('login-form');
                if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm font-semibold text-gray-400 hover:text-white flex items-center gap-1.5 py-2 px-4 transition-colors"
            >
              <span>See it in action</span>
              <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Embedded Sign In card, aligned with Scotch design */}
        <div id="login-form" className="w-full max-w-md scroll-mt-24">
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
        </div>

      </main>

      {/* Footer copyright */}
      <footer className="relative w-full h-12 text-center text-xs text-gray-600 z-10 flex items-center justify-center">
        <span>© {new Date().getFullYear()} GuardLayer. Open source self-hostable POS gateway nodes.</span>
      </footer>

    </div>
  );
};

export default Login;
