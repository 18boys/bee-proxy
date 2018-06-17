'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * @file index.js
 * @author shuai.li
 */
var path = require('path');
var fs = require('fs');
var requireUncached = require('require-uncached');
var httpProxy = require('http-proxy');
var validUrl = require('valid-url');
var parseUrl = require('url').parse;

var _require = require('../lib/utils'),
    log = _require.log;

var rootPath = process.cwd();
var proxy = httpProxy.createProxyServer({});
var paramList = process.argv;

var configFile = path.resolve(rootPath, 'wproxy.js');
if (!fs.existsSync(configFile)) {
  log.error('No wproxy.js folder found in ' + rootPath);
  process.exit(-1);
}

// 获取到所有需要替换的参数
var replaceParamMap = getReplaceParamMap(paramList);
var config = requireUncached(configFile);

var envList = Object.keys(config).filter(function (item) {
  return item !== 'globalRules';
});

if (envList.length === 0) {
  log.error('No available env found in wproxy.js, please retry a later!!!');
  process.exit(-1);
}
var currentEnv = getCurrentEnv(paramList, envList);
if (!currentEnv) {
  log.warn('You have not set a  backend env params ,use ' + envList[0] + ' as default env');
  currentEnv = envList[0];
}

var targetParam = '';
if (currentEnv.split('=').length > 1) {
  var _currentEnv$split = currentEnv.split('=');

  var _currentEnv$split2 = _slicedToArray(_currentEnv$split, 2);

  currentEnv = _currentEnv$split2[0];
  targetParam = _currentEnv$split2[1];
}

var currentRuleList = config[currentEnv];

// 将responder中的变量替换掉
var replaceKeys = Object.keys(replaceParamMap);
currentRuleList = currentRuleList.map(function (rule) {
  if (getTypeOf(rule.responder) !== 'string') return rule;
  replaceKeys.forEach(function (key) {
    var value = replaceParamMap[key];
    var regexp = '#\\{' + key + '\\}';
    rule.responder = rule.responder.replace(new RegExp(regexp, 'g'), value);
  });
  return rule;
});

var globleRuleList = config.globalRules || [];

currentRuleList = globleRuleList.concat(currentRuleList);

function getTypeOf(obj) {
  if (/^\[object\s(.*)\]/.test(Object.prototype.toString.call(obj))) {
    return RegExp.$1.toLowerCase();
  }
  return '';
}

function getReplaceParamMap(paramList) {
  var paramMap = {};
  paramList.forEach(function (item) {
    var paramList = item.split('=');
    if (paramList.length === 2) {
      paramMap[paramList[0]] = paramList[1];
    }
  });
  return paramMap;
}

// 给一个list返回
function getCurrentEnv() {
  var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var envs = arguments[1];

  var result = '';
  args.forEach(function (item) {
    if (!item) return;
    if (envs.includes(item.split('=')[0])) {
      result = item;
    }
  });
  return result;
}

function getRule(currentRuleList, req, replaceParamMap) {
  var currentRule = '';
  currentRuleList.forEach(function (item) {
    if (item.pattern.test(req.url)) {
      currentRule = item.responder;
    }
  });
  return currentRule;
}

function getExecuterType(executer) {
  var executerType = '';
  var type = getTypeOf(executer);
  if (type === 'string') {
    // 判断是文件夹还是域名
    if (validUrl.isWebUri(executer)) {
      executerType = 'web'; //  http or https
    }
    if (fs.existsSync(path.join(rootPath, executer))) {
      executerType = 'dir'; //   本地目录
    }
  } else if (type === 'function') {
    executerType = 'func';
  }
  return executerType;
}

function executeHttpResponder(rule, req, res) {
  log.info(req.url, '----->', rule);
  proxy.web(req, res, {
    target: rule,
    changeOrigin: true
  });
}

function executeDirResponder(mockPath, req, res) {
  var url = parseUrl(req.url).pathname;
  var jsonPath = path.join(rootPath, mockPath, url + '.json');
  log.info(req.url, '----->', jsonPath);
  var json = fs.readFileSync(jsonPath);
  res.setHeader('Content-Type', 'application/json;charset=UTF-8');
  res.end(json);
}

function executeFuncResponder(func, req, res) {
  var json = JSON.stringify(func(req));
  res.setHeader('Content-Type', 'application/json;charset=UTF-8');
  res.end(json);
}

function executeRule(rule, req, res) {

  // 判断类型 根据类型分别调用不同的方法
  // 检查类型 分别给不同的路由函数进行处理
  var executerType = getExecuterType(rule);
  if (!executerType) {
    log.error(rule + ' config error, please retry after fix it');
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
  var rule = getRule(currentRuleList, req, replaceParamMap);

  if (rule) {
    executeRule(rule, req, res);
    return;
  }
  next && next();
};