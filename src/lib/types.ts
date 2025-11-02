export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  country: string | null
  created_at: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  event_date: string | null
  latitude: number
  longitude: number
  location_name: string | null
  city: string | null
  country: string | null
  created_by: string | null
  created_at: string
}

export interface Sketch {
  id: string
  user_id: string
  event_id: string | null
  title: string
  description: string | null
  image_url: string
  thumbnail_url: string | null
  latitude: number | null
  longitude: number | null
  location_name: string | null
  sketch_date: string
  uploaded_at: string
  profiles?: Profile
  events?: Event
}

