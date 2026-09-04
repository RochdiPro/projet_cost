const { spawn } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const api = spawn(process.execPath, ['server.cjs'], { stdio: 'inherit' });
const angularPort = process.env.ANGULAR_PORT || '4201';
const angular = spawn(npmCommand, ['ng', 'serve', '--port', angularPort], { stdio: 'inherit', shell: process.platform === 'win32' });

const stopProcessTree = (child) => {
  if (child.killed || !child.pid) return;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    child.kill('SIGTERM');
  }
};

const stop = () => {
  stopProcessTree(api);
  stopProcessTree(angular);
};

process.on('SIGINT', () => {
  stop();
  process.exit(0);
});
process.on('SIGTERM', stop);
angular.on('exit', (code) => {
  stop();
  process.exit(code ?? 0);
});
