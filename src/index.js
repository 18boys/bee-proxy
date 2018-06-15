/**
 * @file index.js
 * @author shuai.li
 */
const path = require('path');
const fs = require('fs');
const requireUncached = require('require-uncached');
const httpProxy = require('http-proxy');
const validUrl = require('valid-url');
const parseUrl = require('url').parse;
const {log} = require('../lib/utils');

const rootPath = process.cwd();
const proxy = httpProxy.createProxyServer({});
const paramList = process.argv;

function getTypeOf(obj) {
  if (/^\[object\s(.*)\]/.test(Object.prototype.toString.call(obj))) {
    return RegExp.$1;
  }
  return ''
}

//
// function getParmsByName(name) {
//   let result;
//   paramList.forEach((item) => {
//     if (item.split('=')[0] !== name
//     )
//       return;
//     if (item.split('=').length === 2) {
//       result = item.split('=')[1];
//     }
//     if (item.split('=').length === 1) {
//       result = item;
//     }
//   })
//   return result;
// }

// 给一个list返回
function getCurrentEnv(args = [], envs) {
  let result = '';
  log.info('args:', args.length)
  args.forEach((item) => {
    if (!item) return;
    if (envs.includes(item.split('=')[0])) {
      result = item;
    }
  });
  return result;
}

function getRule(currentRuleList, req) {
  let currentRule = '';
  currentRuleList.forEach((item) => {
    if (item.pattern.test(req.url)) {
      currentRule = item.responder;
    }
  });
  return currentRule;
}

function getExecuterType(executer) {
  let executerType = '';
  const type = getTypeOf(executer);
  log.info('type', type)
  if (type === 'String') {
    // 判断是文件夹还是域名
    if (validUrl.isWebUri(executer)) {
      executerType = 'web'; //  http or https
    }
    if (fs.existsSync(path.join(rootPath, executer))) {
      executerType = 'dir'; //   本地目录
    }
  }
  else if (type === 'Function') {
    executerType = 'func';
  }
  return executerType;
}

function executeHttpResponder(rule, req, res) {
  proxy.web(req, res, {
    target: rule,
    changeOrigin: true,
  });
}

function executeDirResponder(mockPath, req, res) {
  const url = parseUrl(req.url).pathname;
  const jsonPath = path.join(rootPath, mockPath, `${url}.json`);
  const json = fs.readFileSync(jsonPath);
  res.setHeader('Content-Type', 'application/json;charset=UTF-8');
  res.end(json);
}

function executeFuncResponder(func, req, res) {
  const json = JSON.stringify(func(req, res));
  res.setHeader('Content-Type', 'application/json;charset=UTF-8');
  res.end(json);
}

function executeRule(rule, req, res) {
  const url = rule;
  log.info(url);

  // 判断类型 根据类型分别调用不同的方法
  // 检查类型 分别给不同的路由函数进行处理
  const executerType = getExecuterType(rule);
  if (!executerType) {
    log.error(`${rule} config error, please retry after fix it`)
    process.exit(-1);
  }
  switch (executerType) {
    case 'web':
      log.info('类型是http');
      executeHttpResponder(rule, req, res);
      break;
    case 'dir':
      log.info('类型是目录');
      executeDirResponder(rule, req, res);
      break;
    case 'func':
      log.info('类型是函数');
      executeFuncResponder(rule, req, res);
      break;
  }
}


module.exports = function (req, res, next) {

  const configFile = path.resolve(rootPath, 'wproxy.js');
  if (!fs.existsSync(configFile)) {
    log.error(`No wproxy.js folder found in ${rootPath}`);
    process.exit(-1);
  }
  const config = requireUncached(configFile);
  const envList = Object.keys(config).filter((item) => item !== 'globalRules');

  if (envList.length === 0) {
    log.error(`No available env found in wproxy.js, please retry a later!!!`);
    process.exit(-1);
  }
  let currentEnv = getCurrentEnv(paramList, envList);
  if (!currentEnv) {
    log.warn(`You have not set a  backend env params ,use ${envList[0]} as default env`);
    currentEnv = envList[0];
  }


  let targetParam = '';
  if (currentEnv.split('=').length > 1) {
    [currentEnv, targetParam] = currentEnv.split('=');
  }

  const currentRuleList = config[currentEnv];
  // 获取当前url适配的url,执行
  const rule = getRule(currentRuleList, req);

  if (rule) {
    executeRule(rule, req, res);
    return;
  }
  next && next();
};