const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const routesDir = path.join(__dirname, 'src/routes');
const controllersDir = path.join(__dirname, 'src/controllers');

if (!fs.existsSync(controllersDir)) {
  fs.mkdirSync(controllersDir);
}

function processFile(filename) {
  const code = fs.readFileSync(path.join(routesDir, filename), 'utf8');
  
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });

  const controllerFunctions = [];
  const controllerImports = [];
  let counter = 1;
  let hasExtracted = false;

  // Extract top level requires for the controller
  traverse(ast, {
    VariableDeclaration(path) {
      if (path.parent.type === 'Program') {
        const decl = path.node.declarations[0];
        if (decl.init && decl.init.type === 'CallExpression' && decl.init.callee.name === 'require') {
          const reqStr = decl.init.arguments[0].value;
          if (reqStr !== 'express') {
            controllerImports.push(generate(path.node).code);
          }
        }
      }
    }
  });

  traverse(ast, {
    CallExpression(callPath) {
      // Find router.get, router.post, etc
      if (
        callPath.node.callee.type === 'MemberExpression' &&
        callPath.node.callee.object.name === 'router' &&
        ['get', 'post', 'put', 'delete', 'patch'].includes(callPath.node.callee.property.name)
      ) {
        const method = callPath.node.callee.property.name;
        const endpointNode = callPath.node.arguments[0];
        if (!endpointNode || endpointNode.type !== 'StringLiteral') return;
        
        const endpoint = endpointNode.value;
        let endpointName = endpoint.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
        if (endpointName === '_' || endpointName === '') endpointName = 'Root';
        const functionName = `${method}${endpointName}_${counter++}`;

        // Find asyncHandler argument
        const args = callPath.node.arguments;
        for (let i = 1; i < args.length; i++) {
          if (args[i].type === 'CallExpression' && args[i].callee.name === 'asyncHandler') {
            const asyncFunc = args[i].arguments[0]; // The async (req, res) => {} function

            // Generate controller function code
            const funcCode = `exports.${functionName} = ${generate(asyncFunc).code};\n\n`;
            controllerFunctions.push({ name: functionName, code: funcCode });

            // Replace the asyncFunc with the functionName identifier
            args[i].arguments[0] = t.identifier(functionName);
            hasExtracted = true;
          }
        }
      }
    }
  });

  if (hasExtracted) {
    const controllerName = filename.replace('.js', 'Controller');
    const importStatement = `const { ${controllerFunctions.map(f => f.name).join(', ')} } = require('../controllers/${controllerName}');\n`;
    
    // Inject the import at the top of the route file AST
    const importAst = parser.parse(importStatement, { sourceType: 'module' }).program.body[0];
    
    // Find the last require in Program
    let insertIndex = 0;
    for (let i = 0; i < ast.program.body.length; i++) {
      const node = ast.program.body[i];
      if (node.type === 'VariableDeclaration' && node.declarations[0].init && node.declarations[0].init.type === 'CallExpression' && node.declarations[0].init.callee.name === 'require') {
        insertIndex = i + 1;
      }
    }
    
    ast.program.body.splice(insertIndex, 0, importAst);
    
    // Generate new route code
    const newRouteCode = generate(ast, { retainLines: true }).code;
    
    // Generate controller code
    let finalControllerCode = controllerImports.join('\n') + '\n\n';
    controllerFunctions.forEach(f => {
      finalControllerCode += f.code;
    });

    fs.writeFileSync(path.join(controllersDir, `${controllerName}.js`), finalControllerCode);
    fs.writeFileSync(path.join(routesDir, filename), newRouteCode);
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
