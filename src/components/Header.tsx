'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';

export default function Header() {
  const { data: session, status } = useSession();
  const t = useTranslations('Header');
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-zinc-800/50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <Link href={`/${locale}`} className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 transition-transform group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="ConfScout Logo"
                  fill
                  className="object-contain rounded-xl"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                ConfScout
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1" aria-label="Main navigation">
            <Link
              href={`/${locale}`}
              prefetch={true}
              className="text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-zinc-800/50 min-h-[2.75rem] flex items-center"
            >
              {t('explore')}
            </Link>
            <Link
              href={`/${locale}/search?cfp=true`}
              prefetch={true}
              className="text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-zinc-800/50 min-h-[2.75rem] flex items-center"
            >
              {t('openCfps')}
            </Link>
            <Link
              href={`/${locale}/recommendations`}
              prefetch={true}
              className="text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-zinc-800/50 min-h-[2.75rem] flex items-center"
            >
              <span className="mr-1" aria-hidden="true">✨</span> {t('aiMatch')}
            </Link>
            <Link
              href={`/${locale}/about`}
              prefetch={true}
              className="text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-zinc-800/50 min-h-[2.75rem] flex items-center"
            >
              {t('about')}
            </Link>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-zinc-700 mx-2" aria-hidden="true"></div>

            {/* User Authentication */}
            {status === 'loading' ? (
              <div className="w-20 h-8 bg-zinc-800 animate-pulse rounded-lg"></div>
            ) : session?.user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/submit`}
                  prefetch={true}
                  className="text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-zinc-800/50"
                >
                  {t('submit')}
                </Link>
                <div className="relative group">
                  <button className="flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-zinc-800/50">
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                        {(session.user.name?.[0] || session.user.email?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <span>{session.user.name || session.user.email?.split('@')[0]}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link
                      href={`/${locale}/u/${session.user.id}`}
                      className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {t('myProfile')}
                    </Link>
                    <Link
                      href={`/${locale}/dashboard`}
                      className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {t('dashboard')}
                    </Link>
                    <Link
                      href={`/${locale}/bookmarks`}
                      className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {t('bookmarks')}
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: `/${locale}` })}
                      className="w-full text-left px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {t('signOut')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href={`/${locale}/auth/signin`}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t('signIn')}
              </Link>
            )}

            {/* Star on GitHub */}
            <a
              href="https://github.com/mohitmishra786/conf-finder"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-zinc-800/50 min-h-[2.75rem]"
              aria-label="Star on GitHub"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>{t('star')}</span>
            </a>

            {/* Buy Me a Coffee */}
            <a
              href="https://buymeacoffee.com/mohitmishra7"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-yellow-400 hover:text-yellow-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-yellow-900/20 min-h-[2.75rem]"
              aria-label="Buy me a coffee"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06a.23.23 0 01-.195-.267l.07-.335.298-1.418c.038-.18.07-.361.117-.539.076-.285.149-.57.242-.85a.237.237 0 00-.199-.283c-.12-.015-.262.017-.338.178a3.94 3.94 0 00-.218.62c-.068.251-.124.503-.182.755l-.29 1.371-.07.335a.991.991 0 00.818 1.169c.111.016.227.033.344.05a38.052 38.052 0 005.107.345 38.413 38.413 0 005.02-.33 3.862 3.862 0 00.334-.049.99.99 0 00.818-1.169l-.059-.28-.232-1.086c-.027-.127-.058-.253-.09-.38a.238.238 0 01.199-.284l.003.001zm-5.933 16.07c-1.175.001-2.138-.965-2.138-2.142 0-1.176.963-2.142 2.138-2.142 1.176 0 2.139.966 2.139 2.142 0 1.177-.963 2.142-2.139 2.142zm0-2.851a.71.71 0 00-.71.71.71.71 0 00.71.71.71.71 0 00.71-.71.71.71 0 00-.71-.71zm-5.933 2.851c-1.175.001-2.138-.965-2.138-2.142 0-1.176.963-2.142 2.138-2.142 1.176 0 2.139.966 2.139 2.142 0 1.177-.963 2.142-2.139 2.142zm0-2.851a.71.71 0 00-.71.71.71.71 0 00.71.71.71.71 0 00.71-.71.71.71 0 00-.71-.71z" />
              </svg>
              <span className="hidden md:inline">{t('support')}</span>
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}