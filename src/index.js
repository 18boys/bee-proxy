/**
 * @file index.js
 * @author shuai.li
 */
const path = require('path');
const fs = require('fs');
const requireUncached = require('require-uncached');
const httpProxy = require('http-proxy');
const parseUrl = require('url').parse;
const { log } = require('../lib/utils');


const rootPath = process.cwd();
const proxy = httpProxy.createProxyServer({});
const paramList = process.argv;

function getParmsByName(name) {
  let result;
  paramList.forEach((item) => {
    if (item.split('=')[0] !== name) return;
    if (item.split('=').length === 2) {
      result = item.split('=')[1];
    }
    if (item.split('=').length === 1) {
      result = item;
    }
  })
  return result;
}

function getRule(currentRuleList, req) {
  let currentRule = '';
  // const url = parseUrl(req.url);
  // log('url111:' + req.url)
  // log('url222:' + JSON.parse(url));
  currentRuleList.forEach((item) => {

    if (item.pattern.test(req.url)) {
      // if (item.pattern.test(url.host + url.pathname)) {
      currentRule = item.responder;
    }
  })
  return currentRule;
}


function executeRule(rule, req, res, next) {
  const url = rule;
  // 检查类型 分别处理
  proxy.web(req, res, {
    target: url,
    changeOrigin: true,
  });
}

module.exports = function (req, res, next) {
  const configFile = path.resolve(rootPath, 'wproxy.js');
  if (!fs.existsSync(configFile)) {
    log(`No wproxy.js folder found in ${rootPath}`, 'error');
    process.exit(-1);
  }

  const config = requireUncached(configFile);

  // 1.搞定获取参数  beta=beta3  或者beta

  // 2.根据传入的环境变量,调用适当的回调函数
  // 如果有localDir 那么优先取此文件夹下面的请求,如果没有那么继续找其他
  // 如果有responder 属性,localDir/string/function,那么查看是否有可以匹配的变量,之后再请求
  // 如果

  // local环境

  if (getParmsByName('local')) {
    // url中可能会使用的变量
    let targetEnv = getParmsByName('local');
    const currentRuleList = config['local'];
    // 获取当前url适配的url,执行
    const rule = getRule(currentRuleList, req);
    if (rule) {
      executeRule(rule, req, res);
      return;
    }
    next && next();
  }
};