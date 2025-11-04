import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

export function Navbar() {
  const { user, signOut } = useAuth()
  const { profile, username } = useProfile()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Get avatar initial or use default
  const getAvatarInitial = () => {
    if (profile?.full_name) {
      return profile.full_name.charAt(0).toUpperCase()
    }
    if (username) {
      return username.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <nav className="sticky top-0 z-50 bg-gray-100 shadow-sm border-b border-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-800">USK Social</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Inicio
            </Link>
            <Link
              to="/map"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              🗺️ Mapa
            </Link>
            {user ? (
              profile && username ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    {/* Avatar ball */}
                    <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{getAvatarInitial()}</span>
                      )}
                    </div>
                    {/* Username */}
                    <span className="text-gray-700 text-sm font-medium">{username}</span>
                    {/* Dropdown arrow */}
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <Link
                        to={`/profile/${profile.username}`}
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500 text-sm">Loading...</span>
              )
            ) : (
              <Link
                to="/auth"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
