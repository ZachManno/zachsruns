'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import BallMark from '@/components/BallMark';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.push('/');
    setIsMenuOpen(false);
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const showPrivateRuns = user && (user.private_group_count ?? 0) > 0;

  const navLinks = user
    ? [
        ...(showPrivateRuns ? [{ href: '/private-runs', label: 'Private Groups' }] : []),
        { href: '/community', label: 'Community' },
        { href: '/locations', label: 'Locations' },
        ...(user.is_admin ? [{ href: '/admin/dashboard', label: 'Admin' }] : []),
        { href: '/profile', label: 'Profile' },
      ]
    : [];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      className="sticky top-0 z-40 border-b border-court-800/80 bg-court-950/80 backdrop-blur-xl"
      ref={menuRef}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            aria-label="Zach's Runs — back to home"
            className="group flex items-center gap-2.5"
          >
            <BallMark className="h-9 w-9 shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(255,107,53,0.55)]" />
            <span className="font-display text-base font-extrabold leading-none tracking-tight text-white transition-colors duration-300 group-hover:text-ember-400 md:text-lg">
              Zach&apos;s Runs
            </span>
          </Link>

          {/* Desktop Menu - hidden on mobile */}
          <div className="hidden items-center gap-1 md:flex">
            {loading ? (
              <span className="px-3 text-sm text-zinc-500">Loading...</span>
            ) : user ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-ember-500/10 text-ember-400'
                        : 'text-zinc-400 hover:bg-court-800 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <span className="mx-2 h-6 w-px bg-court-700" />
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
                >
                  Log In
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm ml-1 px-4 py-2 text-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button - visible on mobile only */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-lg border border-court-700 p-2 text-zinc-300 transition-colors hover:bg-court-800 hover:text-white md:hidden"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu - visible on mobile when open */}
      {isMenuOpen && (
        <div className="animate-fade-in border-t border-court-800 bg-court-900/95 backdrop-blur-xl md:hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-zinc-500">Loading...</div>
          ) : (
            <div className="space-y-1 p-3">
              {user ? (
                <>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={handleLinkClick}
                      className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                        isActive(link.href)
                          ? 'bg-ember-500/10 text-ember-400'
                          : 'text-zinc-300 hover:bg-court-800 hover:text-white'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-zinc-500 transition-colors hover:bg-court-800 hover:text-white"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={handleLinkClick}
                    className="block rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-court-800 hover:text-white"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={handleLinkClick}
                    className="btn btn-primary btn-block mt-1"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
