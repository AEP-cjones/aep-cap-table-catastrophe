import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// TODO: Replace with real Firebase config before deployment
const firebaseConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "PLACEHOLDER_PROJECT.firebaseapp.com",
  databaseURL: "https://PLACEHOLDER_PROJECT-default-rtdb.firebaseio.com",
  projectId: "PLACEHOLDER_PROJECT",
  storageBucket: "PLACEHOLDER_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
