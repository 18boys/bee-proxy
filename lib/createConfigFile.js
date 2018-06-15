#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const workspaceRoot = process.cwd().split('node_modules')[0];
// console.log('process.env.npm_package_config_root', JSON.stringify(process.env));
const configFile = path.join(workspaceRoot, 'wproxy.js');

if (!fs.existsSync(configFile)) {
  // copy template file
  const templateContent = fs.readFileSync('./template/wproxy.js');
  fs.writeFileSync(configFile, templateContent)
}


