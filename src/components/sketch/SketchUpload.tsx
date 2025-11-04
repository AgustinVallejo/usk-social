import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useUsername } from '@/hooks/useUsername'
import { useEvents } from '@/hooks/useEvents'
import { MapPicker } from '@/components/common/MapPicker'
import { formatDateOnly } from '@/lib/utils'
import type { Event } from '@/lib/types'
import type { Sketch } from '@/lib/types'

interface SketchUploadProps {
  onSuccess?: () => void
  onCancel?: () => void
  initialEventId?: string
  sketch?: Sketch // For editing mode
}

export function SketchUpload({ onSuccess, onCancel, initialEventId, sketch }: SketchUploadProps) {
  const { profile } = useUsername()
  const { events } = useEvents()
  const isEditing = !!sketch
  
  const [title, setTitle] = useState(sketch?.title || '')
  const [description, setDescription] = useState(sketch?.description || '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(sketch?.image_url || null)
  const [latitude, setLatitude] = useState(sketch?.latitude || 6.2476)
  const [longitude, setLongitude] = useState(sketch?.longitude || -75.5658)
  const [locationName, setLocationName] = useState(sketch?.location_name || '')
  const [selectedEventId, setSelectedEventId] = useState<string>(sketch?.event_id || initialEventId || '')
  const [sketchDate, setSketchDate] = useState(sketch?.sketch_date ? sketch.sketch_date.split('T')[0] : new Date().toISOString().split('T')[0])
  const [city, setCity] = useState('Medellín')
  const [country, setCountry] = useState('Colombia')
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Initialize fields from sketch when editing
  useEffect(() => {
    if (sketch) {
      setTitle(sketch.title || '')
      setDescription(sketch.description || '')
      setImagePreview(sketch.image_url || null)
      setLatitude(sketch.latitude || 6.2476)
      setLongitude(sketch.longitude || -75.5658)
      setLocationName(sketch.location_name || '')
      setSelectedEventId(sketch.event_id || '')
      if (sketch.sketch_date) {
        setSketchDate(sketch.sketch_date.split('T')[0])
      }
      // Get city and country from event if sketch has an event
      if (sketch.event_id) {
        const event = events.find((e: Event) => e.id === sketch.event_id)
        if (event) {
          setCity(event.city || 'Medellín')
          setCountry(event.country || 'Colombia')
        }
      }
    } else {
      // Try to get user's current location only when creating new sketch
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLatitude(position.coords.latitude)
            setLongitude(position.coords.longitude)
          },
          () => {
            // Silently fail if user denies location
          }
        )
      }
    }
  }, [sketch, events])

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
    // Clear the search trigger after selection
    setMapSearchQuery('')
  }

  // Update selectedEventId when initialEventId changes
  useEffect(() => {
    setSelectedEventId(initialEventId || '')
  }, [initialEventId])

  // Update fields when event is selected/deselected
  useEffect(() => {
    if (selectedEventId) {
      // Find the selected event
      const selectedEvent = events.find((event: Event) => event.id === selectedEventId)
      if (selectedEvent) {
        // Populate fields from event
        if (selectedEvent.event_date) {
          setSketchDate(selectedEvent.event_date.split('T')[0]) // Extract date part if it's a datetime
        }
        setLatitude(selectedEvent.latitude)
        setLongitude(selectedEvent.longitude)
        setLocationName(selectedEvent.location_name || '')
        setCity(selectedEvent.city || 'Medellín')
        setCountry(selectedEvent.country || 'Colombia')
      }
      // Close advanced section when event is selected
      setAdvancedOpen(false)
    } else {
      // Reset to defaults when no event is selected
      setSketchDate(new Date().toISOString().split('T')[0])
      // Reset coordinates to user's location if available, otherwise defaults
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLatitude(position.coords.latitude)
            setLongitude(position.coords.longitude)
          },
          () => {
            setLatitude(6.2476)
            setLongitude(-75.5658)
          }
        )
      } else {
        setLatitude(6.2476)
        setLongitude(-75.5658)
      }
      setLocationName('')
      setCity('Medellín')
      setCountry('Colombia')
    }
  }, [selectedEventId, events])

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      setError('Image must be JPEG, PNG, or WebP format')
      return
    }
    setImageFile(file)
    setError(null)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const validateCoordinates = (lat: number, lng: number): boolean => {
    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!profile) {
      setError('Please set a username first (use the username box in the top-right corner)')
      return
    }

    // Image is required for new uploads, optional for edits
    if (!isEditing && !imageFile) {
      setError('Please select an image')
      return
    }

    if (!validateCoordinates(latitude, longitude)) {
      setError('Please provide valid coordinates (latitude: -90 to 90, longitude: -180 to 180)')
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        console.log('[SketchUpload] ✏️ Starting sketch update...')
        console.log('[SketchUpload] Sketch ID:', sketch.id)
      } else {
        console.log('[SketchUpload] 📤 Starting sketch upload...')
      }
      console.log('[SketchUpload] Profile ID:', profile.id)
      console.log('[SketchUpload] Title:', title)
      console.log('[SketchUpload] Coordinates:', latitude, longitude)
      console.log('[SketchUpload] Event ID:', selectedEventId || 'none')

      let publicUrl = sketch?.image_url || ''
      let thumbnailUrl = sketch?.thumbnail_url || ''

      // Upload new image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `${profile.id}/${fileName}`

        console.log('[SketchUpload] 📤 Uploading image to storage...')
        console.log('[SketchUpload] File path:', filePath)
        const { error: uploadError } = await supabase.storage
          .from('sketches')
          .upload(filePath, imageFile)

        if (uploadError) {
          console.error('[SketchUpload] ❌ Storage upload failed:', uploadError)
          console.error('[SketchUpload] Error details:', {
            message: uploadError.message,
          })
          throw uploadError
        }

        console.log('[SketchUpload] ✅ Image uploaded successfully')

        // Get public URL
        console.log('[SketchUpload] 🔗 Getting public URL...')
        const { data: { publicUrl: newPublicUrl } } = supabase.storage
          .from('sketches')
          .getPublicUrl(filePath)
        publicUrl = newPublicUrl
        thumbnailUrl = newPublicUrl // Use same image for thumbnail

        // Delete old image if editing
        if (isEditing && sketch?.image_url) {
          try {
            const urlParts = sketch.image_url.split('/')
            const oldFilePath = urlParts.slice(urlParts.indexOf('sketches') + 1).join('/')
            await supabase.storage.from('sketches').remove([oldFilePath])
            
            // Delete old thumbnail if different
            if (sketch.thumbnail_url && sketch.thumbnail_url !== sketch.image_url) {
              const thumbParts = sketch.thumbnail_url.split('/')
              const oldThumbPath = thumbParts.slice(thumbParts.indexOf('sketches') + 1).join('/')
              await supabase.storage.from('sketches').remove([oldThumbPath])
            }
          } catch (deleteError) {
            console.warn('[SketchUpload] ⚠️ Failed to delete old image:', deleteError)
            // Continue anyway - old image deletion is not critical
          }
        }
      }

      // Prepare sketch data
      const sketchData = {
        title,
        description: description || null,
        image_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        latitude: latitude,
        longitude: longitude,
        location_name: locationName || null,
        event_id: selectedEventId || null,
        sketch_date: sketchDate,
      }

      if (isEditing) {
        console.log('[SketchUpload] 💾 Updating sketch record...')
        console.log('[SketchUpload] Sketch data:', { ...sketchData, image_url: '...' })

        const { data: updateData, error: updateError } = await supabase
          .from('sketches')
          .update(sketchData)
          .eq('id', sketch.id)
          .select()

        if (updateError) {
          console.error('[SketchUpload] ❌ Database update failed:', updateError)
          console.error('[SketchUpload] Error details:', {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
          })
          throw updateError
        }

        console.log('[SketchUpload] ✅ Sketch updated successfully!')
        console.log('[SketchUpload] Updated sketch ID:', updateData?.[0]?.id)
      } else {
        console.log('[SketchUpload] 💾 Inserting sketch record...')
        console.log('[SketchUpload] Sketch data:', { ...sketchData, image_url: '...' })

        const { data: insertData, error: insertError } = await supabase
          .from('sketches')
          .insert({
            ...sketchData,
            user_id: profile.id,
          })
          .select()

        if (insertError) {
          console.error('[SketchUpload] ❌ Database insert failed:', insertError)
          console.error('[SketchUpload] Error details:', {
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

        console.log('[SketchUpload] ✅ Sketch uploaded successfully!')
        console.log('[SketchUpload] Inserted sketch ID:', insertData?.[0]?.id)
      }

      onSuccess?.()
    } catch (err: any) {
      console.error('[SketchUpload] ❌ Operation failed with exception:', err)
      const errorMessage = err.message || (isEditing ? 'Failed to update sketch' : 'Failed to upload sketch')
      console.error('[SketchUpload] Error message:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Editar Sketch' : 'Subir Sketch'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="Mi dibujito a rapidógrafo"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="Mientras dibujaba se arrimó un gamín..."
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
            Imagen {!isEditing && <span className="text-red-500">*</span>}
            {isEditing && <span className="text-gray-500 text-xs ml-2">(Opcional - deja vacío para mantener la imagen actual)</span>}
          </label>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            id="image"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleImageChange}
            required={!isEditing}
            className="hidden"
          />

          {/* Fancy upload area */}
          {!imagePreview ? (
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-all duration-300 ease-in-out
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg' 
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 hover:shadow-md'
                }
              `}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />
              
              <div className="relative z-10">
                {/* Upload icon */}
                <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
                  <svg 
                    className={`w-full h-full transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                    />
                  </svg>
                </div>
                
                <p className="text-gray-700 font-medium text-lg mb-1">
                  {isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
                </p>
                <p className="text-gray-500 text-sm">
                  PNG, JPG, WEBP hasta 10MB
                </p>
                
                {/* Decorative dots */}
                <div className="flex justify-center mt-4 space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group">
              {/* Preview with overlay on hover */}
              <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-auto max-h-96 object-contain bg-gray-100"
                />
                
                {/* Hover overlay with change button */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleClick}
                    className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white text-gray-800 px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-gray-100"
                  >
                    Cambiar Imagen
                  </button>
                </div>
              </div>
              
              {/* File info */}
              {imageFile && (
                <div className="mt-2 flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {imageFile.name}
                  </span>
                  <span className="text-gray-500">
                    {(imageFile.size / 1024).toFixed(2)} KB
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-1">
            Asociar a Evento (Opcional)
          </label>
          <select
            id="event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
          >
            <option value="">Sin Evento</option>
            {events.map((event: Event) => (
              <option key={event.id} value={event.id}>
                {event.event_date ? formatDateOnly(event.event_date) : 'Sin fecha'} - {event.title}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Options Accordion - Only shown when no event is selected */}
        {!selectedEventId && (
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Avanzados (Opcional)</span>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {advancedOpen && (
              <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                <div>
                  <label htmlFor="sketchDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha del Sketch
                  </label>
                  <input
                    id="sketchDate"
                    type="date"
                    value={sketchDate}
                    onChange={(e) => setSketchDate(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Lugar
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
                      title="Buscar ubicación en el mapa"
                    >
                      🔍 Buscar
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Ingresa un nombre de lugar y haz clic en Buscar para encontrarlo en el mapa
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación <span className="text-red-500">*</span>
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
                    Seleccionado: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
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
                      País
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
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (isEditing ? 'Actualizando...' : 'Subiendo...') : (isEditing ? 'Actualizar Sketch' : 'Subir Sketch')}
          </button>
        </div>
      </form>
    </div>
  )
}

