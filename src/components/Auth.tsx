import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, signInAnonymously, GoogleAuthProvider } from 'firebase/auth';
import Image from 'next/image';

interface AuthProps {
  onAuthComplete: (username: string, isGuest: boolean) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = new GoogleAuthProvider();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const username = result.user.displayName || result.user.email?.split('@')[0] || 'User';
      onAuthComplete(username, false);
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    }
    setIsLoading(false);
  };

  const handleGuestAccess = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInAnonymously(auth);
      const guestNumber = Math.floor(Math.random() * 1000);
      const username = `Guest${guestNumber}`;
      onAuthComplete(username, true);
    } catch (error) {
      console.error('Guest access error:', error);
      setError('Failed to continue as guest. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to Chat</h2>
          <p className="mt-2 text-sm text-gray-600">Choose how you want to continue</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#f26c6a] hover:bg-[#e53935] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26c6a] transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              'Signing in...'
            ) : (
              <>
                <Image
                  src="/google.svg"
                  alt="Google"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                Sign in with Google
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <button
            onClick={handleGuestAccess}
            disabled={isLoading}
            className="w-full px-4 py-3 text-base font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26c6a] transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Continue without signing in'}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Guest users are limited to 20 messages
        </p>
      </div>
    </div>
  );
};

export default Auth; 