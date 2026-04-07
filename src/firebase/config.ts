import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

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
