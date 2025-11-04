import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import type { Sketch } from '@/lib/types'

interface SketchModalProps {
  sketch: Sketch
  onClose: () => void
  onUpdate?: () => void
  onEdit?: (sketch: Sketch) => void
}

export function SketchModal({ sketch, onClose, onUpdate, onEdit }: SketchModalProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isOwner = user?.id === sketch.user_id

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este sketch?')) {
      return
    }

    try {
      // Delete from storage
      const urlParts = sketch.image_url.split('/')
      const filePath = urlParts.slice(urlParts.indexOf('sketches') + 1).join('/')
      
      // Try to delete thumbnail if it exists and is different
      if (sketch.thumbnail_url && sketch.thumbnail_url !== sketch.image_url) {
        const thumbParts = sketch.thumbnail_url.split('/')
        const thumbPath = thumbParts.slice(thumbParts.indexOf('sketches') + 1).join('/')
        await supabase.storage.from('sketches').remove([thumbPath]).catch(() => {
          // Ignore thumbnail deletion errors
        })
      }
      
      await supabase.storage.from('sketches').remove([filePath])

      // Delete from database
      const { error } = await supabase
        .from('sketches')
        .delete()
        .eq('id', sketch.id)

      if (error) throw error

      onUpdate?.()
      onClose()
    } catch (err) {
      alert('Error al eliminar el sketch')
      console.error('Error deleting sketch:', err)
    }
  }

  const handleEdit = () => {
    onEdit?.(sketch)
  }

  const handleViewOnMap = () => {
    if (sketch.latitude && sketch.longitude) {
      navigate(`/map?lat=${sketch.latitude}&lng=${sketch.longitude}&zoom=15`)
      onClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 z-10"
          >
            ✕
          </button>
          <img
            src={sketch.image_url}
            alt={sketch.title}
            className="w-full h-auto"
          />
        </div>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{sketch.title}</h2>
          {sketch.description && (
            <p className="text-gray-600 mb-4">{sketch.description}</p>
          )}
          <div className="flex items-center space-x-4 mb-4">
            {sketch.profiles?.avatar_url && (
              <img
                src={sketch.profiles.avatar_url}
                alt={sketch.profiles.username}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              {sketch.profiles?.username ? (
                <Link
                  to={`/profile/${sketch.profiles.username}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                  }}
                  className="font-medium text-gray-800 hover:text-blue-600"
                >
                  {sketch.profiles.username}
                </Link>
              ) : (
                <p className="font-medium text-gray-800">Unknown</p>
              )}
              <p className="text-sm text-gray-500">
                {new Date(sketch.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          {(sketch.location_name || (sketch.latitude && sketch.longitude)) && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                📍 {sketch.location_name || `${sketch.latitude}, ${sketch.longitude}`}
              </p>
            </div>
          )}
          <div className="flex space-x-4">
            {sketch.latitude && sketch.longitude && (
              <button
                onClick={handleViewOnMap}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Ver en Mapa
              </button>
            )}
            {isOwner && (
              <>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

