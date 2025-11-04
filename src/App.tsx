import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SelectedGroupProvider } from '@/hooks/useSelectedGroup'
import { Navbar } from '@/components/common/Navbar'
import { Home } from '@/pages/Home'
import { Map } from '@/pages/Map'
import { Profile } from '@/pages/Profile'
import { Auth } from '@/pages/Auth'

function App() {
  return (
    <SelectedGroupProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<Map />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </SelectedGroupProvider>
  )
}

export default App

