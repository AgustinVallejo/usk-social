import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUsername } from '@/hooks/useUsername'
import { MapPicker } from '@/components/common/MapPicker'

interface EventCreateProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function EventCreate({ onSuccess, onCancel }: EventCreateProps) {
  const { profile } = useUsername()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [latitude, setLatitude] = useState(6.2476)
  const [longitude, setLongitude] = useState(-75.5658)
  const [locationName, setLocationName] = useState('')
  const [city, setCity] = useState('Medellín')
  const [country, setCountry] = useState('Colombia')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('')

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
    // Clear the search trigger after selection
    setMapSearchQuery('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!profile) {
      setError('Please set a username first (use the username box in the top-right corner)')
      return
    }

    if (!title.trim()) {
      setError('Please enter an event title')
      return
    }

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setError('Please select a location on the map')
      return
    }

    setLoading(true)

    try {
      console.log('[EventCreate] 📅 Creating event...')
      console.log('[EventCreate] Profile ID:', profile.id)
      console.log('[EventCreate] Title:', title)
      console.log('[EventCreate] Coordinates:', latitude, longitude)
      console.log('[EventCreate] Location:', locationName || 'none')
      console.log('[EventCreate] City/Country:', city, country)

      const eventData = {
        title,
        description: description || null,
        event_date: eventDate || null,
        latitude: latitude,
        longitude: longitude,
        location_name: locationName || null,
        city: city || null,
        country: country || null,
          created_by: profile.id,
      }

      console.log('[EventCreate] 💾 Inserting event record...')
      console.log('[EventCreate] Event data:', eventData)
      const { data, error: insertError } = await supabase
        .from('events')
        .insert(eventData)
        .select()

      if (insertError) {
        console.error('[EventCreate] ❌ Event insert failed:', insertError)
        console.error('[EventCreate] Error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        })
        
        // Handle foreign key constraint violations
        if (insertError.code === '23503' || insertError.message.includes('foreign key constraint')) {
          throw new Error('Your profile is not set up correctly. Please complete your profile setup and try again.')
        }
        
        throw insertError
      }

      if (!data || data.length === 0) {
        console.error('[EventCreate] ❌ Event was not created - no data returned')
        throw new Error('Event was not created. Please check your database permissions.')
      }

      console.log('[EventCreate] ✅ Event created successfully!')
      console.log('[EventCreate] Event ID:', data[0]?.id)

      onSuccess?.()
    } catch (err: any) {
      console.error('[EventCreate] ❌ Event creation failed with exception:', err)
      const errorMessage = err.message || err.error_description || 'Failed to create event. Please check console for details.'
      console.error('[EventCreate] Error message:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Event</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="Urban Sketching Meetup"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="Tell us about the event..."
          />
        </div>

        <div>
          <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
            Event Date
          </label>
          <input
            id="eventDate"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 mb-1">
            Location Name
          </label>
          <div className="flex gap-2">
            <input
              id="locationName"
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
              placeholder="La Candelaria"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && locationName.trim()) {
                  e.preventDefault()
                  setMapSearchQuery(locationName)
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (locationName.trim()) {
                  setMapSearchQuery(locationName)
                }
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors whitespace-nowrap"
              title="Search location on map"
            >
              🔍 Search
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Enter a location name and click Search to find it on the map
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
          </label>
          <MapPicker
            latitude={latitude}
            longitude={longitude}
            onLocationSelect={handleLocationSelect}
            height="300px"
            externalSearchQuery={mapSearchQuery}
            syncSearchQuery={locationName}
            onLocationNameUpdate={setLocationName}
          />
          <div className="mt-2 text-xs text-gray-500">
            Selected: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </div>
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
              placeholder="Medellín"
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
              placeholder="Colombia"
            />
          </div>
        </div>

        <div className="flex space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  )
}

