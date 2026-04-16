import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ Remplace 'mariage-app' par le nom exact de ton repo GitHub
// Exemple : si ton repo s'appelle "mariage-marie-thomas" → '/mariage-marie-thomas/'
export default defineConfig({
  plugins: [react()],
base: '/mariage-app/',

})
