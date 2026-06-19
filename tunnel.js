import { spawn } from 'child_process';
import fs from 'fs';

console.log('Starting Pinggy SSH Tunnel on port 443...');

const child = spawn('ssh', [
  '-tt',
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'ServerAliveInterval=30',
  '-R', '80:localhost:5000',
  '-p', '443',
  'a.pinggy.io'
]);

const logStream = fs.createWriteStream('./tunnel.log', { flags: 'a' });

child.stdout.on('data', (data) => {
  const output = data.toString();
  logStream.write(output);
  console.log(output);

  // Search for the public URL in the output
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('pinggy.link') || line.includes('pinggy.online')) {
      const match = line.match(/https:\/\/[a-zA-Z0-9.-]+\.pinggy\.(link|online)/);
      if (match) {
        const url = match[0];
        console.log('\n========================================');
        console.log('FOUND TUNNEL URL:', url);
        console.log('========================================\n');
        fs.writeFileSync('./tunnel_url.txt', url);
      }
    }
  }
});

child.stderr.on('data', (data) => {
  const output = data.toString();
  logStream.write('[STDERR] ' + output);
  console.error('[STDERR]', output);
});

child.on('close', (code) => {
  console.log(`SSH tunnel process exited with code ${code}`);
});
