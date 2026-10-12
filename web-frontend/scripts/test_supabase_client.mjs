import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('d:/smart traffic control 2.0/web-frontend/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.trim().split('=');
  if (key && rest.length > 0) {
    env[key] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

let url = env.VITE_SUPABASE_URL;
let key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const parsed = new URL(url);
console.log('PARSED_PATHNAME:', parsed.pathname);
console.log('PARSED_HOSTNAME_ENDS_WITH_SUPABASE:', parsed.hostname.endsWith('.supabase.co'));

// If URL has trailing slash or path, sanitize it to origin
if (parsed.pathname && parsed.pathname !== '/') {
  console.log('NOTE: URL has non-root pathname:', parsed.pathname);
}
const cleanUrl = parsed.origin;

const supabase = createClient(cleanUrl, key);

async function test() {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('AUTH_TEST:', error ? 'ERROR: ' + error.message : 'OK');

    const { data: profiles, error: pError } = await supabase.from('profiles').select('id').limit(1);
    console.log('PROFILES_TEST:', pError ? 'ERROR: ' + pError.message : 'OK, rows returned: ' + profiles.length);
  } catch (err) {
    console.log('EXCEPTION: ' + err.message);
  }
}

test();
