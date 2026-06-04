import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import Card from '../components/ui/Card';
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Shield Logo */}
        <div className="flex justify-center mb-4">
          <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm inline-flex items-center justify-center">
            <svg
              className="h-10 w-10 text-gray-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          GuardLayer
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Self-hostable LLM Security Gateway
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="px-6 py-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">
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
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />

            <div className="space-y-4 pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
              >
                Sign In
              </Button>
              
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                  Or Test Locally
                </span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleMockBypass}
              >
                Enter Demo Mode (Bypass Auth)
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
