module.exports = {
  local: [
    {
      pattern: /^\/proxy/,
      responder: 'https://www.easy-mock.com/mock/5a5e9b7aef967f55f1ce698d/example/',
    },
    {
      pattern: /^\/test/,
      responder: '/mock',
    },
    {
      pattern: /^\/test/,
      responder: function () {
        return {
          status: 1
        }
      },
    },
  ],
  mock: [
    {
      pattern: /^\/test/,
      responder: '/mock',
    },
  ],
  beta: [
    {
      pattern: /^\/test/,
      responder: '/mock',
    },
  ],
  prod: [
    {
      pattern: /^\/test/,
      responder: '/mock',
    },
  ],
  globalRules: [
    {
      pattern: /^\/test/,
      responder: '/mock',
    },
  ],
};
