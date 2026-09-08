const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const port = Number(process.env.PORT || 3000);
const assetsDirectory = path.join(__dirname, 'src', 'assets');
const projectsDirectory = path.join(assetsDirectory, 'projets');
const employeesDirectory = path.join(assetsDirectory, 'employees');

const server = http.createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, POST, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    return response.end();
  }

  const requestUrl = new URL(request.url || '/', `http://localhost:${port}`);
  if (request.method === 'GET' && requestUrl.pathname === '/api/projects/files') {
    try {
      await fs.mkdir(projectsDirectory, { recursive: true });
      const files = (await fs.readdir(projectsDirectory))
        .filter((file) => /\.xlsx?$/i.test(file))
        .sort((first, second) => first.localeCompare(second));
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify(files));
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ message: 'Impossible de lire les fichiers assets.', error: error.message }));
    }
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/employees/files') {
    try {
      await fs.mkdir(employeesDirectory, { recursive: true });
      const files = (await fs.readdir(employeesDirectory))
        .filter((file) => /\.xlsx?$/i.test(file))
        .sort((first, second) => first.localeCompare(second));
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify(files));
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ message: 'Impossible de lire les fichiers employés.', error: error.message }));
    }
  }

  if (request.method === 'DELETE' && requestUrl.pathname === '/api/employees/file') {
    const fileName = requestUrl.searchParams.get('fileName') || '';
    const safeFileName = fileName.replace(/[^a-zA-Z0-9À-ÿ._-]/g, '_');
    if (!safeFileName.toLowerCase().endsWith('.xlsx')) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ message: 'Le fichier doit être au format .xlsx.' }));
    }
    try {
      await fs.unlink(path.join(employeesDirectory, safeFileName));
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ fileName: safeFileName }));
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ message: 'Impossible de supprimer le fichier employé.', error: error.message }));
    }
  }

  if (request.method === 'DELETE' && requestUrl.pathname === '/api/projects/file') {
    const fileName = requestUrl.searchParams.get('fileName') || '';
    const safeFileName = fileName.replace(/[^a-zA-Z0-9À-ÿ._-]/g, '_');
    if (!safeFileName.toLowerCase().endsWith('.xlsx')) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ message: 'Le fichier doit être au format .xlsx.' }));
    }
    try {
      await fs.unlink(path.join(projectsDirectory, safeFileName));
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ fileName: safeFileName }));
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ message: 'Impossible de supprimer le fichier.', error: error.message }));
    }
  }

  if (request.method !== 'POST' || !['/api/projects/workbook', '/api/assets/workbook', '/api/employees/workbook'].includes(requestUrl.pathname)) {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    return response.end(JSON.stringify({ message: 'Route introuvable.' }));
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const fileName = requestUrl.searchParams.get('fileName') || 'Projet.xlsx';
  const safeFileName = fileName.replace(/[^a-zA-Z0-9À-ÿ._-]/g, '_');

  if (!safeFileName.toLowerCase().endsWith('.xlsx')) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    return response.end(JSON.stringify({ message: 'Le fichier doit être au format .xlsx.' }));
  }

  try {
    const targetDirectory = requestUrl.pathname === '/api/projects/workbook'
      ? projectsDirectory
      : requestUrl.pathname === '/api/employees/workbook' ? employeesDirectory : assetsDirectory;
    await fs.mkdir(targetDirectory, { recursive: true });
    await fs.writeFile(path.join(targetDirectory, safeFileName), body);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    const relativeDirectory = requestUrl.pathname === '/api/projects/workbook'
      ? 'projets/' : requestUrl.pathname === '/api/employees/workbook' ? 'employees/' : '';
    return response.end(JSON.stringify({ fileName: safeFileName, path: `src/assets/${relativeDirectory}${safeFileName}` }));
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'application/json' });
    return response.end(JSON.stringify({ message: 'Impossible d’enregistrer le fichier.', error: error.message }));
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`Project Cost API déjà active sur http://localhost:${port}`);
    return;
  }
  console.error('Erreur API:', error);
  process.exitCode = 1;
});

server.listen(port, () => {
  console.log(`Project Cost API disponible sur http://localhost:${port}`);
});
