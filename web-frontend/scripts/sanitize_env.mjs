import fs from 'fs';

const paths = [
  'd:/smart traffic control 2.0/web-frontend/.env',
  'd:/smart traffic control 2.0/web-frontend/src/services/.env'
];

paths.forEach(p => {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('VITE_SUPABASE_URL')) {
        const [k, ...rest] = trimmed.split('=');
        let val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
        try {
          const u = new URL(val);
          val = u.origin;
        } catch (e) {}
        return `${k.trim()}=${val}`;
      }
      return line;
    });
    fs.writeFileSync(p, lines.join('\n'));
    console.log('Sanitized successfully:', p);
  }
});
