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

function log(message, severity) {
  if (severity === void 0) severity = "info";
  let color = "cyan";
  color = LOG_LEVELS[severity] && LOG_LEVELS[severity].color;
  if (process.env.SILENT !== "true") {
    console.log(chalk[color]("validate-git-branch:", message));
  }
}

exports.log = log;
