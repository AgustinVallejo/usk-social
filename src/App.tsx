import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from '@/components/common/Navbar'
import { Home } from '@/pages/Home'
import { Map } from '@/pages/Map'
import { Profile } from '@/pages/Profile'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<Map />} />
            <Route path="/profile/:username" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App

