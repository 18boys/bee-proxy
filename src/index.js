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
const {log, getTypeOf} = require('../lib/utils');
const proxy = httpProxy.createProxyServer({});

class BeeProxy {
  constructor() {
    this.rootPath = process.cwd();
    this.argvList = process.argv;
    this.configFilePath = path.resolve(this.rootPath, 'wproxy.js');

    this.config = {};
    this.currentRuleList = [];
    this.replaceVariableMap = {};

    this._checkConfigFileExist();
    this._readConfigFileContent();
    this._getReplaceParamMap();
    this._getCurrentEnvAndRuleList();
    this._replaceVariableInResponder();
    this._addGlobleRule();
  }

  _checkConfigFileExist() {
    if (!fs.existsSync(this.configFilePath)) {
      log.error(`No wproxy.js folder found in ${this.rootPath}`);
      process.exit(-1);
    }
  }

  _readConfigFileContent() {
    this.config = requireUncached(this.configFilePath);
  }

  _getReplaceParamMap() {
    let paramMap = {};
    this.argvList.forEach((item) => {
      const paramList = item.split('=');
      if (paramList.length === 2) {
        paramMap[paramList[0]] = paramList[1];
      }
    });
    this.replaceVariableMap = paramMap;
  }

  _getCurrentEnvAndRuleList() {
    const envList = Object.keys(this.config).filter((item) => item !== 'globalRules');
    if (envList.length === 0) {
      log.error(`No available env found in wproxy.js, please retry a later after fix it correctly!!!`);
      process.exit(-1);
    }
    let currentEnv = this._getCurrentEnv(envList);
    if (!currentEnv) {
      log.warn(`You have not specify backend env,use ${envList[0]} as default`);
      currentEnv = envList[0];
    }
    this.currentRuleList = this.config[currentEnv];
  }

  _getCurrentEnv(envs) {
    let result = '';
    this.argvList.forEach((item) => {
      if (!item) return;
      const key = item.split('=')[0];
      if (envs.includes(key)) {
        result = key;
      }
    });
    return result;
  }

  _replaceVariableInResponder() {
    const replaceKeys = Object.keys(this.replaceVariableMap);
    this.currentRuleList = this.currentRuleList.map((rule) => {
      if (getTypeOf(rule.responder) !== 'string') return rule;
      replaceKeys.forEach((key) => {
        const value = this.replaceVariableMap[key];
        const regexp = `#\\{${key}\\}`;
        rule.responder = rule.responder.replace(new RegExp(regexp, 'g'), value);
      });
      return rule;
    });
  }

  _addGlobleRule() {
    const globleRuleList = this.config.globalRules || [];
    this.currentRuleList = globleRuleList.concat(this.currentRuleList);
  }

  getResponder(req) {
    let currentRes = '';
    this.currentRuleList.forEach((item) => {
      if (item.pattern.test(req.url)) {
        currentRes = item.responder;
      }
    });
    return currentRes;
  }

  _getResponderType(responderProcessor) {
    let responderType = '';
    const type = getTypeOf(responderProcessor);
    if (type === 'string') {
      if (validUrl.isWebUri(responderProcessor)) {
        responderType = 'web'; //  http or https
      }
      if (fs.existsSync(path.join(this.rootPath, responderProcessor))) {
        responderType = 'dir'; //  local folder
      }
    }
    else if (type === 'function') {
      responderType = 'func';
    }
    return responderType;
  }

  _executeHttpResponder(rule, req, res) {
    log.info(req.url, ' -> ', rule + req.url);
    proxy.web(req, res, {
      target: rule,
      changeOrigin: true,
    });
  }

  _executeDirResponder(mockPath, req, res) {
    const url = parseUrl(req.url).pathname;
    const jsonPath = path.join(this.rootPath, mockPath, `${url}.json`);
    log.info(req.url, '----->', jsonPath);
    const json = fs.readFileSync(jsonPath);
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    res.end(json);
  }

  _executeFuncResponder(func, req, res) {
    const json = JSON.stringify(func(req));
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    res.end(json);
  }

  executeResponderProcessor(responderProcessor, req, res) {

    // check type ,then dispatch corresponding processor
    const responderType = this._getResponderType(responderProcessor);
    if (!responderType) {
      log.error(`${responderType} config error, please retry after fix it`)
      process.exit(-1);
    }
    switch (responderType) {
      case 'web':
        this._executeHttpResponder(responderProcessor, req, res);
        break;
      case 'dir':
        this._executeDirResponder(responderProcessor, req, res);
        break;
      case 'func':
        this._executeFuncResponder(responderProcessor, req, res);
        break;
    }
  }

}

const beeProxy = new BeeProxy();
module.exports = function (req, res, next) {
  const responderProcessor = beeProxy.getResponder(req);
  if (responderProcessor) {
    beeProxy.executeResponderProcessor(responderProcessor, req, res);
    return;
  }
  next && next();
};
