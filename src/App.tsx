import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/common/Navbar'
import { Footer } from '@/components/common/Footer'
import { Home } from '@/pages/Home'
import { Map } from '@/pages/Map'
import { Profile } from '@/pages/Profile'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupForm } from '@/components/auth/SignupForm'
import { ProfileSetup } from '@/components/auth/ProfileSetup'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { user, loading } = useAuth()
  const [needsProfile, setNeedsProfile] = useState(false)

  useEffect(() => {
    checkProfile()
  }, [user])

  const checkProfile = async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()
    setNeedsProfile(!data)
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (user && needsProfile) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <ProfileSetup onComplete={() => setNeedsProfile(false)} />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      {isLogin ? (
        <LoginForm
          onSuccess={() => window.location.reload()}
          onSwitchToSignup={() => setIsLogin(false)}
        />
      ) : (
        <SignupForm
          onSuccess={() => {
            checkProfile()
            setIsLogin(true)
          }}
          onSwitchToLogin={() => setIsLogin(true)}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<Map />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App

