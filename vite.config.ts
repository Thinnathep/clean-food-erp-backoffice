import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// DEBUG: พิมพ์ค่าออกมาดูตอนที่ Cloudflare กำลัง Build
console.log('--- CLOUDFLARE BUILD DEBUG ---');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'FOUND' : 'NOT FOUND');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'FOUND' : 'NOT FOUND');
console.log('------------------------------');

export default defineConfig({
  plugins: [tailwindcss(), react()],
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  }
})
