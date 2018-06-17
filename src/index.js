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

const configFile = path.resolve(rootPath, 'wproxy.js');
if (!fs.existsSync(configFile)) {
  log.error(`No wproxy.js folder found in ${rootPath}`);
  process.exit(-1);
}

// 获取到所有需要替换的参数
const replaceParamMap = getReplaceParamMap(paramList);
let config = requireUncached(configFile);

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

let currentRuleList = config[currentEnv];

// 将responder中的变量替换掉
const replaceKeys = Object.keys(replaceParamMap);
currentRuleList = currentRuleList.map((rule) => {
  if (getTypeOf(rule.responder) !== 'string') return rule;
  replaceKeys.forEach((key) => {
    const value = replaceParamMap[key];
    const regexp = `#\\{${key}\\}`;
    rule.responder = rule.responder.replace(new RegExp(regexp, 'g'), value);
  });
  return rule;
});

const globleRuleList = config.globalRules || [];

currentRuleList = globleRuleList.concat(currentRuleList);

function getTypeOf(obj) {
  if (/^\[object\s(.*)\]/.test(Object.prototype.toString.call(obj))) {
    return RegExp.$1.toLowerCase();
  }
  return ''
}


function getReplaceParamMap(paramList) {
  let paramMap = {};
  paramList.forEach((item) => {
    const paramList = item.split('=');
    if (paramList.length === 2) {
      paramMap[paramList[0]] = paramList[1];
    }
  });
  return paramMap;
}

// 给一个list返回
function getCurrentEnv(args = [], envs) {
  let result = '';
  args.forEach((item) => {
    if (!item) return;
    if (envs.includes(item.split('=')[0])) {
      result = item;
    }
  });
  return result;
}

function getRule(currentRuleList, req, replaceParamMap) {
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
  if (type === 'string') {
    // 判断是文件夹还是域名
    if (validUrl.isWebUri(executer)) {
      executerType = 'web'; //  http or https
    }
    if (fs.existsSync(path.join(rootPath, executer))) {
      executerType = 'dir'; //   本地目录
    }
  }
  else if (type === 'function') {
    executerType = 'func';
  }
  return executerType;
}

function executeHttpResponder(rule, req, res) {
  log.info(req.url, '----->', rule);
  proxy.web(req, res, {
    target: rule,
    changeOrigin: true,
  });
}

function executeDirResponder(mockPath, req, res) {
  const url = parseUrl(req.url).pathname;
  const jsonPath = path.join(rootPath, mockPath, `${url}.json`);
  log.info(req.url, '----->', jsonPath);
  const json = fs.readFileSync(jsonPath);
  res.setHeader('Content-Type', 'application/json;charset=UTF-8');
  res.end(json);
}

function executeFuncResponder(func, req, res) {
  const json = JSON.stringify(func(req));
  res.setHeader('Content-Type', 'application/json;charset=UTF-8');
  res.end(json);
}

function executeRule(rule, req, res) {

  // 判断类型 根据类型分别调用不同的方法
  // 检查类型 分别给不同的路由函数进行处理
  const executerType = getExecuterType(rule);
  if (!executerType) {
    log.error(`${rule} config error, please retry after fix it`)
    process.exit(-1);
  }
  switch (executerType) {
    case 'web':
      executeHttpResponder(rule, req, res);
      break;
    case 'dir':
      executeDirResponder(rule, req, res);
      break;
    case 'func':
      executeFuncResponder(rule, req, res);
      break;
  }
}


module.exports = function (req, res, next) {

  // 获取当前url适配的url,执行
  const rule = getRule(currentRuleList, req, replaceParamMap);

  if (rule) {
    executeRule(rule, req, res);
    return;
  }
  next && next();
};