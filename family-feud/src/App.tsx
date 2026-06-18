import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Board from './screens/Board'
import Host from './screens/Host'
import Admin from './screens/Admin'
import Player from './screens/Player'
import { initializeGame } from './hooks/useFirebase'
import { DEFAULT_GAME_STATE, DEFAULT_CONFIG } from './types'

export default function App() {
  useEffect(() => {
    initializeGame({ gameState: DEFAULT_GAME_STATE, config: DEFAULT_CONFIG })
  }, [])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/board" element={<Board />} />
        <Route path="/host" element={<Host />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/play" element={<Player />} />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
