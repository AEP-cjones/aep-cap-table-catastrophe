import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get, update, onValue, remove, push } from 'firebase/database'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyAHnvT7oyR9HclZmcO-5ehkR1kMeVmzkSg',
  authDomain: 'cap-table-catastrophe.firebaseapp.com',
  databaseURL: 'https://cap-table-catastrophe-default-rtdb.firebaseio.com',
  projectId: 'cap-table-catastrophe',
  storageBucket: 'cap-table-catastrophe.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)
const auth = getAuth(app)

const ROOT = 'familyfeud'
const CLAUDIA_API_BASE = 'https://aep-claudia-bot.azurewebsites.net'

export function dbRef(path: string) {
  return ref(db, `${ROOT}/${path}`)
}

/**
 * Exchange the admin password for a Firebase custom token, then sign in.
 * After this resolves, all subsequent RTDB writes/reads carry an auth
 * context with `auth.token.gameAdmin === true`, which the rules use to
 * allow admin-only operations (read leads, write rounds/config).
 */
export async function signInAsGameAdmin(password: string): Promise<void> {
  const res = await fetch(`${CLAUDIA_API_BASE}/api/games/admin-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, game: 'equity-feud' }),
  })
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string }
    if (res.status === 401) throw new Error('Wrong password')
    throw new Error(errBody.error ?? `Game admin auth failed (HTTP ${res.status})`)
  }
  const { customToken } = (await res.json()) as { customToken: string }
  await signInWithCustomToken(auth, customToken)
}

export async function signOutGameAdmin(): Promise<void> {
  await signOut(auth)
}

export { db, auth, ref, set, get, update, onValue, remove, push, ROOT }
