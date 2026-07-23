const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src/routes');
const controllersDir = path.join(__dirname, 'src/controllers');

if (!fs.existsSync(controllersDir)) {
  fs.mkdirSync(controllersDir);
}

function processFile(filename) {
  let code = fs.readFileSync(path.join(routesDir, filename), 'utf8');
  let originalCode = code;

  // Find all router.METHODS
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*,([\s\S]*?)asyncHandler\s*\(\s*async\s*\(\s*req\s*,\s*res\s*(?:,\s*next)?\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)\s*\)?\s*;/g;

  let controllerCode = '';
  let controllerFunctions = [];

  // Extract all imports that might be needed in controller
  const importsRegex = /const\s+\{.*\}\s*=\s*require\(.*\);|const\s+\w+\s*=\s*require\(.*\);/g;
  let imports = [...new Set(code.match(importsRegex) || [])];

  // For controller, we don't need express, router
  imports = imports.filter(imp => !imp.includes('express'));

  controllerCode += imports.join('\n') + '\n\n';

  let match;
  let routeFileCode = code;
  let counter = 1;

  while ((match = routeRegex.exec(originalCode)) !== null) {
    const method = match[1];
    const endpoint = match[2];
    const middlewares = match[3];
    const body = match[4];

    // Generate a unique function name based on method and endpoint
    let endpointName = endpoint.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    if (endpointName === '_' || endpointName === '') endpointName = 'Root';
    const functionName = `${method}${endpointName}_${counter++}`;

    controllerFunctions.push(functionName);

    // Build the controller function
    controllerCode += `exports.${functionName} = async (req, res, next) => {${body}};\n\n`;

    // Replace in route code
    const exactMatch = match[0];
    const replacement = `router.${method}("${endpoint}", ${middlewares}asyncHandler(${functionName}));`;
    routeFileCode = routeFileCode.replace(exactMatch, replacement);
  }

  if (controllerFunctions.length > 0) {
    const controllerName = filename.replace('.js', 'Controller');
    const importStatement = `const { ${controllerFunctions.join(', ')} } = require('../controllers/${controllerName}');\n`;
    
    // Insert import statement after other imports
    routeFileCode = routeFileCode.replace(/(const .*require\(.*\);[\s\n]*)(?!const .*require)/, `$1\n${importStatement}\n`);

    fs.writeFileSync(path.join(controllersDir, `${controllerName}.js`), controllerCode);
    fs.writeFileSync(path.join(routesDir, filename), routeFileCode);
    console.log(`Processed ${filename}`);
  }
}

const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  try {
    processFile(file);
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}
