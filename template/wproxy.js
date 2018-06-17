module.exports = {
  local: [
    {
      pattern: /^\/proxy/,
      responder: 'https://www.easy-mock.com/mock/5a5e9b7aef967f55f1ce698d/example/',
    },
    {
      pattern: /^\/test1/,
      responder: '/mock',
    },
    {
      pattern: /^\/test2/,
      responder: function () {
        return {
          status: 1
        }
      },
    },
  ],
  ams: [
    {
      pattern: /^\/test1/,
      responder: '/mock',
    },
  ],
  beta: [
    {
      pattern: /^\/test1/,
      responder: '/mock',
    },
  ],
  prod: [
    {
      pattern: /^\/test1/,
      responder: '/mock',
    },
  ],
  globalRules: [
    {
      pattern: /^\/test1/,
      responder: '/mock',
    },
  ],
};
