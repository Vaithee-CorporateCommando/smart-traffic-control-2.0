import https from 'https';
import fs from 'fs';

// 1. Generic internet test
const req1 = https.get('https://www.google.com', (res) => {
  console.log('INTERNET_CONNECTIVITY: OK (Status ' + res.statusCode + ')');
});
req1.on('error', (err) => {
  console.log('INTERNET_CONNECTIVITY: FAILED (' + err.message + ')');
});

// 2. Supabase endpoint test
const envPath = 'd:/smart traffic control 2.0/web-frontend/src/services/.env';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/);
  if (match) {
    const rawUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
    try {
      const urlObj = new URL(rawUrl);
      const req2 = https.get(urlObj.origin + '/rest/v1/', (res) => {
        console.log('SUPABASE_ENDPOINT_CONNECTIVITY: OK (Status ' + res.statusCode + ')');
      });
      req2.on('error', (err) => {
        console.log('SUPABASE_ENDPOINT_CONNECTIVITY: FAILED (' + err.message + ')');
      });
    } catch (e) {
      console.log('SUPABASE_URL_PARSE: INVALID FORMAT (' + e.message + ')');
    }
  } else {
    console.log('SUPABASE_URL: NOT MATCHED');
  }
} else {
  console.log('ENV FILE NOT FOUND AT ' + envPath);
}
