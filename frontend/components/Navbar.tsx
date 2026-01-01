'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
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

  const menuItems = user ? (
    <>
      <Link
        href="/community"
        onClick={handleLinkClick}
        className="block px-4 py-2 hover:bg-gray-800 transition-colors"
      >
        Community
      </Link>
      <Link
        href="/locations"
        onClick={handleLinkClick}
        className="block px-4 py-2 hover:bg-gray-800 transition-colors"
      >
        Locations
      </Link>
      {user.is_admin && (
        <Link
          href="/admin/dashboard"
          onClick={handleLinkClick}
          className="block px-4 py-2 hover:bg-gray-800 transition-colors"
        >
          Admin
        </Link>
      )}
      <Link
        href="/profile"
        onClick={handleLinkClick}
        className="block px-4 py-2 hover:bg-gray-800 transition-colors"
      >
        Profile
      </Link>
      <button
        onClick={handleLogout}
        className="block w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors"
      >
        Logout
      </button>
    </>
  ) : (
    <>
      <Link
        href="/login"
        onClick={handleLinkClick}
        className="block px-4 py-2 hover:bg-gray-800 transition-colors"
      >
        Login
      </Link>
      <Link
        href="/signup"
        onClick={handleLinkClick}
        className="block px-4 py-2 bg-basketball-orange hover:bg-orange-600 transition-colors mx-4 my-2 rounded text-center"
      >
        Sign Up
      </Link>
    </>
  );

  return (
    <nav className="bg-basketball-black text-white shadow-lg relative" ref={menuRef}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl md:text-2xl font-bold text-basketball-orange">
            Zach&apos;s Organized Runs
          </Link>
          
          {/* Desktop Menu - hidden on mobile */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              user ? (
                <>
                  <Link
                    href="/community"
                    className="hover:text-basketball-orange transition-colors"
                  >
                    Community
                  </Link>
                  <Link
                    href="/locations"
                    className="hover:text-basketball-orange transition-colors"
                  >
                    Locations
                  </Link>
                  {user.is_admin && (
                    <Link
                      href="/admin/dashboard"
                      className="hover:text-basketball-orange transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="hover:text-basketball-orange transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="hover:text-basketball-orange transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hover:text-basketball-orange transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-basketball-orange px-4 py-2 rounded hover:bg-orange-600 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )
            )}
          </div>

          {/* Mobile Hamburger Button - visible on mobile only */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-800 rounded transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
        <div className="md:hidden bg-basketball-black border-t border-gray-700">
          {loading ? (
            <div className="px-4 py-2 text-gray-400">Loading...</div>
          ) : (
            <div className="py-2">
              {menuItems}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

