"use strict";
const chalk = require("chalk");
const LOG_LEVELS = {
  error: {
    color: "red"
  },
  warn: {
    color: "yellow"
  },
  info: {
    color: "cyan"
  },
  debug: {
    color: "white"
  }
};

function customerLog(message, severity) {
  if (severity === void 0) severity = "info";
  let color = "cyan";
  color = LOG_LEVELS[severity] && LOG_LEVELS[severity].color;
  if (process.env.SILENT !== "true") {
    console.log(chalk[color]("[wproxy]: ", message));
  }
}

const log = {
  info: function (...list) {
    customerLog(list.join(''), 'info');
  },
  warn: function (...list) {
    customerLog(list.join(''), 'warn');
  },
  error: function (...list) {
    customerLog(list.join(''), 'error');
  },
  debug: function (...list) {
    customerLog(list.join(''), 'debug');
  }
};


exports.log = log;
