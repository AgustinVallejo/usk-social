import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/lib/types'
import { UserSketchGallery } from './UserSketchGallery'

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>()
  const { user } = useAuth()
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

  const isOwnProfile = !userId || userId === user?.id

  useEffect(() => {
    fetchProfile()
  }, [userId, user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const targetUserId = userId || user?.id
      if (!targetUserId) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (error) throw error

      setProfile(data)
      if (data && isOwnProfile) {
        setEditForm({
          username: data.username || '',
          full_name: data.full_name || '',
          bio: data.bio || '',
          city: data.city || '',
          country: data.country || '',
        })
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !profile) return

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
        .eq('id', user.id)

      if (error) throw error

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
    return <div className="text-center py-12">Profile not found</div>
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
                    Edit Profile
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

