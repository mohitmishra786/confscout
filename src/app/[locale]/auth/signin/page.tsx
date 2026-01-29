'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (res.ok) {
          const signInRes = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false
          });

          if (signInRes?.ok) {
            router.push('/');
          }
        } else {
          const data = await res.json();
          setError(data.error || 'Registration failed');
        }
      } else {
        const res = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false
        });

        if (res?.ok) {
          router.push('/');
        } else {
          setError('Invalid email or password');
        }
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: '/' });
    } catch (err) {
      setError('OAuth sign in failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-zinc-400 mb-6">
            {isSignUp ? 'Start saving your favorite conferences' : 'Welcome back to ConfScout'}
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Email</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Password</label>
              <input
                required
                type="password"
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3"
            >
              {isLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-zinc-800"></div>
            <span className="px-4 text-zinc-500 text-sm">OR</span>
            <div className="flex-1 border-t border-zinc-800"></div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Continue with GitHub
            </button>

            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="text-center text-zinc-400 text-sm mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-blue-400 hover:text-blue-300 ml-1"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-4">
          No account required to browse conferences. Sign up to save bookmarks and get personalized recommendations.
        </p>
      </main>
      <Footer />
    </div>
  );
}