import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HostScreen from './components/host/HostScreen'
import PlayerScreen from './components/player/PlayerScreen'
import AdminPanel from './components/admin/AdminPanel'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/host" replace />} />
        <Route path="/host" element={<HostScreen />} />
        <Route path="/play" element={<PlayerScreen />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  )
}
