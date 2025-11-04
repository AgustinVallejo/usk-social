import { HashRouter, Routes, Route } from 'react-router-dom'
import { SelectedGroupProvider } from '@/hooks/useSelectedGroup'
import { Navbar } from '@/components/common/Navbar'
import { Home } from '@/pages/Home'
import { Map } from '@/pages/Map'
import { Profile } from '@/pages/Profile'
import { Auth } from '@/pages/Auth'
import { Info } from '@/pages/Info'

function App() {
  return (
    <SelectedGroupProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<Map />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/info" element={<Info />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </SelectedGroupProvider>
  )
}

export default App

