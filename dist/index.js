'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
    log = _require.log,
    getTypeOf = _require.getTypeOf;

var proxy = httpProxy.createProxyServer({});

var BeeProxy = function () {
  function BeeProxy() {
    _classCallCheck(this, BeeProxy);

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

  _createClass(BeeProxy, [{
    key: '_checkConfigFileExist',
    value: function _checkConfigFileExist() {
      if (!fs.existsSync(this.configFilePath)) {
        log.error('No wproxy.js folder found in ' + this.rootPath);
        process.exit(-1);
      }
    }
  }, {
    key: '_readConfigFileContent',
    value: function _readConfigFileContent() {
      this.config = requireUncached(this.configFilePath);
    }
  }, {
    key: '_getReplaceParamMap',
    value: function _getReplaceParamMap() {
      var paramMap = {};
      this.argvList.forEach(function (item) {
        var paramList = item.split('=');
        if (paramList.length === 2) {
          paramMap[paramList[0]] = paramList[1];
        }
      });
      this.replaceVariableMap = paramMap;
    }
  }, {
    key: '_getCurrentEnvAndRuleList',
    value: function _getCurrentEnvAndRuleList() {
      var envList = Object.keys(this.config).filter(function (item) {
        return item !== 'globalRules';
      });
      if (envList.length === 0) {
        log.error('No available env found in wproxy.js, please retry a later after fix it correctly!!!');
        process.exit(-1);
      }
      var currentEnv = this._getCurrentEnv(envList);
      if (!currentEnv) {
        log.warn('You have not specify backend env,use ' + envList[0] + ' as default');
        currentEnv = envList[0];
      }
      this.currentRuleList = this.config[currentEnv];
    }
  }, {
    key: '_getCurrentEnv',
    value: function _getCurrentEnv(envs) {
      var result = '';
      this.argvList.forEach(function (item) {
        if (!item) return;
        var key = item.split('=')[0];
        if (envs.includes(key)) {
          result = key;
        }
      });
      return result;
    }
  }, {
    key: '_replaceVariableInResponder',
    value: function _replaceVariableInResponder() {
      var _this = this;

      var replaceKeys = Object.keys(this.replaceVariableMap);
      this.currentRuleList = this.currentRuleList.map(function (rule) {
        if (getTypeOf(rule.responder) !== 'string') return rule;
        replaceKeys.forEach(function (key) {
          var value = _this.replaceVariableMap[key];
          var regexp = '#\\{' + key + '\\}';
          rule.responder = rule.responder.replace(new RegExp(regexp, 'g'), value);
        });
        return rule;
      });
    }
  }, {
    key: '_addGlobleRule',
    value: function _addGlobleRule() {
      var globleRuleList = this.config.globalRules || [];
      this.currentRuleList = globleRuleList.concat(this.currentRuleList);
    }
  }, {
    key: 'getResponder',
    value: function getResponder(req) {
      var currentRes = '';
      this.currentRuleList.forEach(function (item) {
        if (item.pattern.test(req.url)) {
          currentRes = item.responder;
        }
      });
      return currentRes;
    }
  }, {
    key: '_getResponderType',
    value: function _getResponderType(responderProcessor) {
      var responderType = '';
      var type = getTypeOf(responderProcessor);
      if (type === 'string') {
        if (validUrl.isWebUri(responderProcessor)) {
          responderType = 'web'; //  http or https
        }
        if (fs.existsSync(path.join(this.rootPath, responderProcessor))) {
          responderType = 'dir'; //  local folder
        }
      } else if (type === 'function') {
        responderType = 'func';
      }
      return responderType;
    }
  }, {
    key: '_executeHttpResponder',
    value: function _executeHttpResponder(rule, req, res) {
      log.info(req.url, ' -> ', rule + req.url);
      proxy.web(req, res, {
        target: rule,
        changeOrigin: true
      });
    }
  }, {
    key: '_executeDirResponder',
    value: function _executeDirResponder(mockPath, req, res) {
      var url = parseUrl(req.url).pathname;
      var jsonPath = path.join(this.rootPath, mockPath, url + '.json');
      log.info(req.url, '----->', jsonPath);
      var json = fs.readFileSync(jsonPath);
      res.setHeader('Content-Type', 'application/json;charset=UTF-8');
      res.end(json);
    }
  }, {
    key: '_executeFuncResponder',
    value: function _executeFuncResponder(func, req, res) {
      var json = JSON.stringify(func(req));
      res.setHeader('Content-Type', 'application/json;charset=UTF-8');
      res.end(json);
    }
  }, {
    key: 'executeResponderProcessor',
    value: function executeResponderProcessor(responderProcessor, req, res) {

      // check type ,then dispatch corresponding processor
      var responderType = this._getResponderType(responderProcessor);
      if (!responderType) {
        log.error(responderType + ' config error, please retry after fix it');
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
  }]);

  return BeeProxy;
}();

var beeProxy = new BeeProxy();
module.exports = function (req, res, next) {
  var responderProcessor = beeProxy.getResponder(req);
  if (responderProcessor) {
    beeProxy.executeResponderProcessor(responderProcessor, req, res);
    return;
  }
  next && next();
};