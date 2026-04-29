import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAHnvT7oyR9HclZmcO-5ehkR1kMeVmzkSg",
  authDomain: "cap-table-catastrophe.firebaseapp.com",
  databaseURL: "https://cap-table-catastrophe-default-rtdb.firebaseio.com",
  projectId: "cap-table-catastrophe",
  storageBucket: "cap-table-catastrophe.firebasestorage.app",
  messagingSenderId: "777636045302",
  appId: "1:777636045302:web:b594763cbe0d208de527d7",
  measurementId: "G-GDSQ4WS9K4"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export const auth = getAuth(app)

const CLAUDIA_API_BASE = 'https://aep-claudia-bot.azurewebsites.net'

/**
 * Exchange the admin password for a Firebase custom token, then sign in.
 * After this resolves, RTDB writes/reads carry an auth context with
 * `auth.token.gameAdmin === true` so the rules permit admin-only
 * operations (read leads, write config, write questions, manage leaderboard
 * + sessions). The previous `config.adminPassword` field in Firebase is
 * no longer authoritative — the env var GAME_ADMIN_PASSWORD on the Claudia
 * backend is the single source of truth.
 */
export async function signInAsGameAdmin(password: string): Promise<void> {
  const res = await fetch(`${CLAUDIA_API_BASE}/api/games/admin-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, game: 'cap-table-catastrophe' }),
  })
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string }
    if (res.status === 401) throw new Error('Incorrect password.')
    throw new Error(errBody.error ?? `Game admin auth failed (HTTP ${res.status})`)
  }
  const { customToken } = (await res.json()) as { customToken: string }
  await signInWithCustomToken(auth, customToken)
}

export async function signOutGameAdmin(): Promise<void> {
  await signOut(auth)
}
