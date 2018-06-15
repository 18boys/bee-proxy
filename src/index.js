/**
 * @file index.js
 * @author shuai.li
 */
const path = require('path');
const fs = require('fs');
const requireUncached = require('require-uncached');
const httpProxy = require('http-proxy');
const parseUrl = require('url').parse;
const {log} = require('../lib/utils');

const rootPath = process.cwd();
const proxy = httpProxy.createProxyServer({});
const paramList = process.argv;
//
// function getTypeOf(obj){
//   return String.prototype.toString(obj)
// }
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
  log.info('args:' , args.length)
  args.forEach((item) => {
    if(!item) return;
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


function executeRule(rule, req, res, next) {
  const url = rule;
  log.info(url);
  // 检查类型 分别处理
  proxy.web(req, res, {
    target: url,
    changeOrigin: true,
  });
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

  // 2.根据传入的环境变量,调用适当的回调函数
  // 如果有localDir 那么优先取此文件夹下面的请求,如果没有那么继续找其他
  // 如果有responder 属性,localDir/string/function,那么查看是否有可以匹配的变量,之后再请求
  // 如果

  const currentRuleList = config[currentEnv];
  // 获取当前url适配的url,执行
  const rule = getRule(currentRuleList, req);

  if (rule) {
    executeRule(rule, req, res);
    return;
  }
  next && next();
};