import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useUsername } from '@/hooks/useUsername'
import type { Profile } from '@/lib/types'
import { UserSketchGallery } from './UserSketchGallery'

export function ProfilePage() {
  const { username: urlUsername } = useParams<{ username?: string }>()
  const { profile: currentUserProfile, username: currentUsername } = useUsername()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    city: '',
    country: '',
  })

  const targetUsername = urlUsername || currentUsername
  const isOwnProfile = !urlUsername || (targetUsername && targetUsername.toLowerCase() === currentUsername?.toLowerCase())

  useEffect(() => {
    fetchProfile()
  }, [urlUsername, currentUsername])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const usernameToFetch = urlUsername || currentUsername
      if (!usernameToFetch) {
        console.log('[ProfilePage] No target username')
        return
      }

      console.log('[ProfilePage] 📥 Fetching profile for username:', usernameToFetch)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', usernameToFetch.toLowerCase())
        .single()

      if (error) {
        // PGRST116 means no rows returned
        if (error.code === 'PGRST116' || error.message.includes('No rows returned')) {
          console.log('[ProfilePage] ❌ Profile not found in database')
          console.log('[ProfilePage] User is authenticated but has no profile record')
          setProfile(null)
        } else {
          console.error('[ProfilePage] ❌ Error fetching profile:', error)
          console.error('[ProfilePage] Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          })
          setProfile(null)
        }
        return
      }

      if (data) {
        console.log('[ProfilePage] ✅ Profile fetched:', data.username)
        setProfile(data)
        if (isOwnProfile) {
          setEditForm({
            username: data.username || '',
            full_name: data.full_name || '',
            bio: data.bio || '',
            city: data.city || '',
            country: data.country || '',
          })
        }
      } else {
        console.log('[ProfilePage] ⚠️ No profile data returned')
        setProfile(null)
      }
    } catch (err) {
      console.error('[ProfilePage] ❌ Exception fetching profile:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentUserProfile || !profile || !isOwnProfile) return

    try {
      const updates: Partial<Profile> = {
        username: editForm.username,
        full_name: editForm.full_name || null,
        bio: editForm.bio || null,
        city: editForm.city || null,
        country: editForm.country || null,
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)

      if (error) throw error

      // If username changed, redirect to new username URL
      if (updates.username && updates.username !== profile.username) {
        navigate(`/profile/${updates.username}`, { replace: true })
      }

      await fetchProfile()
      setIsEditing(false)
    } catch (err: any) {
      alert(err.message || 'Failed to update profile')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading profile...</div>
  }

  if (!profile) {
    // If viewing own profile but it doesn't exist, show setup message
    if (isOwnProfile && currentUserProfile) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Not Found</h2>
            <p className="text-gray-700 mb-6">
              You are authenticated, but you don't have a profile in the database yet.
              You need to complete your profile setup before you can use all features.
            </p>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                <strong>What's happening:</strong> Your authentication session is stored locally, 
                but your profile record wasn't created in the database. This is why you see 
                this message even though you're logged in.
              </p>
              <button
                onClick={() => window.location.href = '/login'}
                className="px-6 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Go to Profile Setup
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    // If viewing someone else's profile
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Not Found</h2>
          <p className="text-gray-700">This user profile doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-start space-x-6">
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-32 h-32 rounded-full object-cover"
            />
          )}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, full_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bio: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm({ ...editForm, city: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) =>
                        setEditForm({ ...editForm, country: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-gray-600 mb-4">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-gray-700 mb-4">{profile.bio}</p>
                )}
                {(profile.city || profile.country) && (
                  <p className="text-gray-600 mb-2">
                    📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </p>
                {isOwnProfile && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Editar Perfil
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <UserSketchGallery userId={profile.id} />
    </div>
  )
}

