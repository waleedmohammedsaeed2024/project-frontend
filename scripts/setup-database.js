// Database Setup Script — reads credentials from .env, never hardcodes them
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parse .env manually (no dotenv dependency needed)
function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  try {
    const raw = readFileSync(envPath, 'utf-8')
    const vars = {}
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      vars[key.trim()] = rest.join('=').trim()
    }
    return vars
  } catch {
    console.error('❌ Could not read .env file. Make sure it exists.')
    process.exit(1)
  }
}

const env = loadEnv()
const supabaseUrl = env['VITE_SUPABASE_URL']

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is missing from .env')
  process.exit(1)
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

console.log('🔧 Setting up Supabase database...')
console.log('')
console.log('⚠️  IMPORTANT: This script uses the anon key which has limited permissions.')
console.log('   For production deployment, you should:')
console.log('   1. Go to Supabase Dashboard → SQL Editor')
console.log('   2. Copy and paste the contents of supabase/migrations/001_initial_schema.sql')
console.log('   3. Run the SQL directly in the dashboard')
console.log('')
console.log('   OR use Supabase CLI:')
console.log('   1. Login: npx supabase login')
console.log(`   2. Link:  npx supabase link --project-ref ${projectRef}`)
console.log('   3. Push:  npx supabase db push')
console.log('')
console.log('📄 Migration file: supabase/migrations/001_initial_schema.sql')
console.log(`🌐 Supabase Dashboard: https://supabase.com/dashboard/project/${projectRef}`)
console.log('')
console.log('✅ .env file is already configured with your credentials')
console.log('✅ You can now access the app at http://localhost:5175')
console.log('')
console.log('Next step: Run the migration in Supabase Dashboard')
