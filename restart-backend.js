const { exec } = require('child_process');
const os = require('os');

console.log('🔄 Stopping all Node processes...');

const killCommand = os.platform() === 'win32' 
  ? 'taskkill /F /IM node.exe 2>nul'
  : 'pkill -9 node';

exec(killCommand, (error) => {
  setTimeout(() => {
    console.log('✅ Starting backend server...');
    const startCommand = os.platform() === 'win32'
      ? 'cd c:\\Documents\\Desktop\\job-portal\\backend && node server.js'
      : 'cd /path/to/job-portal/backend && node server.js';
    
    exec(startCommand, (error, stdout, stderr) => {
      if (error) console.error('Error:', error);
      console.log('Backend output:', stdout);
    });
  }, 1000);
});
