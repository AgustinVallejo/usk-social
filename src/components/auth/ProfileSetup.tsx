import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

interface ProfileSetupProps {
  onComplete: () => void
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!user) {
      setError('User not authenticated')
      setLoading(false)
      return
    }

    try {
      console.log('[ProfileSetup] 👤 Starting profile creation...')
      console.log('[ProfileSetup] User ID:', user.id)
      console.log('[ProfileSetup] Username:', username)
      console.log('[ProfileSetup] Has avatar:', !!avatarFile)

      let avatarUrl: string | null = null

      // Upload avatar if provided
      if (avatarFile) {
        console.log('[ProfileSetup] 📤 Uploading avatar...')
        console.log('[ProfileSetup] Avatar file:', avatarFile.name, `(${(avatarFile.size / 1024).toFixed(2)} KB)`)
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        console.log('[ProfileSetup] Avatar file path:', filePath)
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile)

        if (uploadError) {
          console.error('[ProfileSetup] ❌ Avatar upload failed:', uploadError)
          console.error('[ProfileSetup] Error details:', {
            message: uploadError.message,
          })
          throw uploadError
        }

        console.log('[ProfileSetup] ✅ Avatar uploaded successfully')

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        avatarUrl = publicUrl
        console.log('[ProfileSetup] Avatar URL:', avatarUrl)
      }

      // Create profile
      const profileData = {
        id: user.id,
        username,
        full_name: fullName || null,
        bio: bio || null,
        city: city || null,
        country: country || null,
        avatar_url: avatarUrl,
      }

      console.log('[ProfileSetup] 💾 Inserting profile record...')
      console.log('[ProfileSetup] Profile data:', { ...profileData, avatar_url: avatarUrl ? '...' : null })
      const { data: insertData, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()

      if (profileError) {
        console.error('[ProfileSetup] ❌ Profile creation failed:', profileError)
        console.error('[ProfileSetup] Error details:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        })
        if (profileError.code === '23505') {
          throw new Error('Username already taken. Please choose another.')
        }
        throw profileError
      }

      console.log('[ProfileSetup] ✅ Profile created successfully!')
      console.log('[ProfileSetup] Profile ID:', insertData?.[0]?.id)

      onComplete()
    } catch (err: any) {
      console.error('[ProfileSetup] ❌ Profile creation failed with exception:', err)
      const errorMessage = err.message || 'Failed to create profile'
      console.error('[ProfileSetup] Error message:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 p-8 rounded-lg shadow-sm border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Complete Your Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="johndoe"
          />
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="Tell us about yourself..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
              placeholder="New York"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              id="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
              placeholder="USA"
            />
          </div>
        </div>

        <div>
          <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">
            Avatar
          </label>
          <input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
          />
          {avatarPreview && (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="mt-2 w-24 h-24 rounded-full object-cover"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating profile...' : 'Complete Setup'}
        </button>
      </form>
    </div>
  )
}

