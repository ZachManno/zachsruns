'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="bg-basketball-black text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-basketball-orange">
            Zach&apos;s Runs
          </Link>
          
          <div className="flex items-center gap-4">
            {loading ? (
              <span className="text-gray-400">Loading...</span>
            ) : user ? (
              <>
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
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

