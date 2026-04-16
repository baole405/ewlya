const fs = require('fs');
const path = require('path');

function removeRedundantSettings(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let json;
  try {
    json = JSON.parse(content);
  } catch (e) {
    console.error(`Failed to parse ${filePath}`);
    return;
  }

  let modified = false;

  // Remove redundant compilerOptions if strict: true
  if (json.compilerOptions) {
    const redundantCompilerKeys = [
      'strict',
      'noImplicitOverride',
      'noPropertyAccessFromIndexSignature',
      'noImplicitReturns',
      'noFallthroughCasesInSwitch',
    ];
    redundantCompilerKeys.forEach((key) => {
      if (key in json.compilerOptions) {
        delete json.compilerOptions[key];
        modified = true;
      }
    });

    // If compilerOptions is empty now, remove it?
    // Usually keep it if there are other keys like isolatedModules
  }

  // Remove redundant angularCompilerOptions
  if (json.angularCompilerOptions) {
    delete json.angularCompilerOptions;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
    console.log(`Cleaned up ${filePath}`);
  }
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      // Avoid reference folder
      if (f !== 'reference' && f !== 'node_modules' && f !== '.next') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(path.join(dir, f));
    }
  });
}

const webLibsDir = path.join(process.cwd(), 'libs/web');
walkDir(webLibsDir, (filePath) => {
  if (path.basename(filePath) === 'tsconfig.json') {
    removeRedundantSettings(filePath);
  }
});

const appsDir = path.join(process.cwd(), 'apps');
walkDir(appsDir, (filePath) => {
  if (
    path.basename(filePath) === 'tsconfig.app.json' ||
    path.basename(filePath) === 'tsconfig.json'
  ) {
    removeRedundantSettings(filePath);
  }
});
