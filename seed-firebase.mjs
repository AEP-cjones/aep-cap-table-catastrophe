/**
 * seed-firebase.mjs
 * Seeds all 100 questions from questions.json to Firebase Realtime Database
 * using the REST API with a PUT request.
 *
 * Usage: node seed-firebase.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const FIREBASE_URL = 'https://cap-table-catastrophe-default-rtdb.firebaseio.com/questions.json'

// Load questions from JSON file
const questions = JSON.parse(
  readFileSync(join(__dirname, 'src/data/questions.json'), 'utf-8')
)

// Convert array to object keyed by question ID (Firebase Realtime DB format)
const questionsById = {}
for (const q of questions) {
  questionsById[q.id] = q
}

console.log(`Seeding ${questions.length} questions to Firebase...`)

const response = await fetch(FIREBASE_URL, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(questionsById),
})

if (!response.ok) {
  const text = await response.text()
  console.error(`❌ Firebase PUT failed: ${response.status} ${response.statusText}`)
  console.error(text)
  process.exit(1)
}

const result = await response.json()
const count = Object.keys(result).length
console.log(`✅ Successfully seeded ${count} questions to Firebase Realtime Database.`)
console.log(`   URL: ${FIREBASE_URL}`)
