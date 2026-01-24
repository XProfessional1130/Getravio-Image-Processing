import { useState, FormEvent } from 'react';

interface RegisterProps {
  onRegister: (data: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<void>;
  onSwitchToLogin: () => void;
}

function Register({ onRegister, onSwitchToLogin }: RegisterProps) {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await onRegister({
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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

      {/* Register Card */}
      <div className="relative z-10 bg-white/90 backdrop-blur-lg p-6 sm:p-10 lg:p-12 rounded-2xl sm:rounded-3xl shadow-2xl shadow-blue-900/10 border border-blue-100/50 w-full max-w-md mx-4">
        <div className="text-center mb-8 sm:mb-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 mx-auto mb-3 sm:mb-4">
            <span className="text-white font-bold text-2xl sm:text-3xl">G</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Create Account
          </h1>
          <p className="text-xs sm:text-sm text-blue-900/60 font-medium">Join Getravio today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-blue-900/70 tracking-wide mb-2">FIRST NAME</label>
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-blue-200/60 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 text-xs sm:text-sm shadow-sm transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-900/70 tracking-wide mb-2">LAST NAME</label>
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-blue-200/60 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 text-xs sm:text-sm shadow-sm transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-900/70 tracking-wide mb-2">USERNAME</label>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-blue-200/60 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 text-xs sm:text-sm shadow-sm transition-all duration-200"
            />
          </div>

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
              minLength={8}
              className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-blue-200/60 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 text-xs sm:text-sm shadow-sm transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-900/70 tracking-wide mb-2">CONFIRM PASSWORD</label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-blue-200/60 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 text-xs sm:text-sm shadow-sm transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-200 font-bold text-sm sm:text-base shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 mt-4 sm:mt-6"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="text-center mt-4">
            <p className="text-xs sm:text-sm text-blue-900/60">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
