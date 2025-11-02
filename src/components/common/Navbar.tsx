import { Link } from 'react-router-dom'
import { useUsername } from '@/hooks/useUsername'
import { useState, useEffect } from 'react'

export function Navbar() {
  const { username, profile, setUsername, loading } = useUsername()
  const [inputValue, setInputValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Sync inputValue with username when it changes
  useEffect(() => {
    setInputValue(username)
  }, [username])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) {
      alert('Please enter a username')
      return
    }
    console.log('[Navbar] Setting username to:', trimmed)
    setUsername(trimmed)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setInputValue(username) // Reset to current username
    setIsEditing(false)
  }

  return (
    <nav className="bg-gray-100 shadow-sm border-b border-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-800">USK Social</span>
          </Link>
          
          {/* Username input in center */}
          <div className="flex-1 flex justify-center px-4">
            {isEditing ? (
              <form 
                onSubmit={handleSubmit} 
                className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md shadow-sm p-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter username"
                  className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-gray-900"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-800"
                  disabled={loading}
                >
                  {loading ? '...' : 'Set'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md shadow-sm p-2">
                <span className="text-sm text-gray-700 px-2">
                  {loading ? 'Loading...' : (username || 'No username')}
                </span>
                <button
                  onClick={() => {
                    setInputValue(username || '')
                    setIsEditing(true)
                  }}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  {username ? 'Change' : 'Set Username'}
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Home
            </Link>
            <Link
              to="/map"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Map
            </Link>
            {profile && (
              <Link
                to={`/profile/${profile.id}`}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

