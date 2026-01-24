import { useState, FormEvent } from 'react';

interface LoginProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  onSwitchToRegister: () => void;
}

function Login({ onLogin, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onLogin({ email, password });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80')",
          opacity: 0.15
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-white/90 via-blue-50/80 to-purple-50/70" />

      {/* Login Card */}
      <div className="relative z-10 bg-white/90 backdrop-blur-lg p-6 sm:p-10 lg:p-12 rounded-2xl sm:rounded-3xl shadow-2xl shadow-blue-900/10 border border-blue-100/50 w-full max-w-md mx-4">
        <div className="text-center mb-8 sm:mb-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 mx-auto mb-3 sm:mb-4">
            <span className="text-white font-bold text-2xl sm:text-3xl">G</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Getravio
          </h1>
          <p className="text-xs sm:text-sm text-blue-900/60 font-medium">AI Body Simulation Platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs font-bold text-blue-900/70 tracking-wide mb-2">EMAIL</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-blue-200/60 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 text-xs sm:text-sm shadow-sm transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-900/70 tracking-wide mb-2">PASSWORD</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-blue-200/60 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 text-xs sm:text-sm shadow-sm transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-200 font-bold text-sm sm:text-base shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 mt-6 sm:mt-8"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>

          <div className="text-center mt-4">
            <p className="text-xs sm:text-sm text-blue-900/60">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Create Account
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
