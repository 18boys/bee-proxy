# bee-proxy
⚒ bee-proxy是一个express中间件,可以方便的将本地服务的请求代理到命令行指定的后端环境去.

### 0.主要特点
* 1.可以按照不同环境使用不同的代理配置
* 2.responder支持函数  本地文件夹  字符串域名
* 3.支持全局规则
* 4.支持url中存在变量
* 5.自动生成默认的配置文件

### 1.主要目标
* 我们在开发联调以及查找线上问题的时候,经常要使用本地的开发服务器来对接不同的后端系统,能不能找到一种方式,在启动本地服务器的时候
通过命令行指定要连接的后端
* 有的时候在前端进入开发之后,后端接口还未就绪,需要前端童鞋使用mock服务器或者本地的json来mock,那么怎么将本地服务的请求都转发到
对应的mock服务器或者本地对应的json文件呢?

bee-proxy正是为了解决上述两个问题的.


### 2.开始使用

#### 2.1 安装
```js
npm  install bee-proxy --save-dev
```
安装之后会默认在工程根目录生成wproxy.js文件,里面有配置示例
如果在工程根目录没有发现wproxy.js文件,请手动创建此文件

#### 2.2 在wproxy.js配置转发规则(配置项的详细含义见后面 [3.配置规则说明])
```js
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
```

#### 2.3 给本地的服务器加上bee-proxy中间件
注意: 如果对此不熟,可以参照  [4.一步一步教你加中间件]
```js
var proxy = require('bee-proxy')

app.use('/',proxy)
```

#### 2.4 启动本地服务器,然后去玩把~

```js
npm start -- ams

# 将后端代理到响应的beta环境,只需要要改变beta=[1,2,3,4,5,6,7,8]就可以将请求代理到对应beta环境
npm start -- beta=4

# 将后端代理到响应的prod环境
npm start -- prod

```

### 3.配置规则说明

#### 3.1环境参数配置
示例配置中的 local,mock等key是环境参数,和你启动的时候传入的环境变量参数一致. 这里可以随便指定后端的环境参数
比如说,你可以增加dev配置
```js
dev: [
    {
      pattern: /^\/test/,
      responder: '/mock',
    },
  ],

```
然后启动的时候使用
```js
npm start -- dev
```
然后就可以将所有的请求使用dev的配置进行转发

#### 3.2 pattern参数
pattern指定你的配置规则,只允许正则表达式

#### 3.3 responder参数
指定对应的pattern的响应处理规则,可以是 web url(如https://baidu.com),也可以是本地目录(如/mock),
也可以是函数[函数的入参是(req)]

web url中可以使用  #{beta}  来获取参数,比如说
```js
    {
      pattern: /^\/proxy/,
      responder: 'https://#{beta}.easy-mock.com/mock/#{id}}/example/',
    },
```
在启动的时候传入 beta  id 的值
```js
npm start -- local=mock  id=5a5e9b7aef967f55f1ce698d
```
这样最终responder会被重写为 https://mock.easy-mock.com/mock/5a5e9b7aef967f55f1ce698d/example/


这在对应多个beta环境的时候特别有用,比如说可以这样配置
```js
    {
      pattern: /^\/proxy/,
      responder: 'https://beta#{beta}.easy-mock.com/mock/123',
    },
```
这样在启动的时候
```js
npm start -- beta=4
```
就可以将proxy开头的请求打到https://beta4.easy-mock.com/mock/123 环境

这样在启动的时候使用另外的命令
```js
npm start -- beta=5
```
就可以将proxy开头的请求打到https://beta5.easy-mock.com/mock/123 环境

#### 3.4 全局配置globalRules
🆙 有的时候希望所有的环境的某个请求都走同一个代理,此时可以在globalRules配置
注意此配置的优先级比较低,如果请求同时符合globalRules以及对应环境的配置,此时
globalRules中的配置将会被忽略.

### 4.一步一步教你加中间件
#### 4.1 ykit配置示例
```
var proxy = require('bee-proxy')
var path = require('path');
module.exports = {
  config: {
    exports: ['./scripts/app.js'],
    modifyWebpackConfig: function (baseConfig) {
      // 示例：处理 .hello 类型文件，全部返回文字 "hello!"
      this.applymiddleware(proxy)
      return baseConfig;
    }
  }
};

```

#### 4.2 vue-cli 构建的工程 配置示例
早期版本使用http-proxy-middleware来作为本地服务器,这种情况下找到dev-server.js,加入中间件即可.
```js
var proxy = require('bee-proxy')

app.use('/',proxy)
```
近期版本(2018年6月),使用webpack-dev-server来直接启动本地服务器,像下面的配置
```js
"scripts": {
    "dev": "webpack-dev-server --inline --progress --config build/webpack.dev.conf.js",
    "start": "npm run dev -- --env",
  },
```
配置稍稍麻烦
首先,找到 /build/webpack.dev.conf.js 文件,找到配置devServer的地方.比如说
```js
const devWebpackConfig = merge(baseWebpackConfig, {
  module: {
    rules: utils.styleLoaders({ sourceMap: config.dev.cssSourceMap, usePostCSS: true })
  },
  // cheap-module-eval-source-map is faster for development
  devtool: config.dev.devtool,

  // these devServer options should be customized in /config/index.js
  devServer: {
    disableHostCheck: true,
    clientLogLevel: 'warning',
    historyApiFallback: {
      rewrites: [
        { from: /.*/, to: path.posix.join(config.dev.assetsPublicPath, 'index.html') },
      ],
    },
    hot: true,
    contentBase: false, // since we use CopyWebpackPlugin.
    compress: true,
    host: HOST || config.dev.host,
    port: PORT || config.dev.port,
    open: config.dev.autoOpenBrowser,
    overlay: config.dev.errorOverlay
      ? { warnings: false, errors: true }
      : false,
    publicPath: config.dev.assetsPublicPath,
    proxy: config.dev.proxyTable,
    quiet: true, // necessary for FriendlyErrorsPlugin
    watchOptions: {
      poll: config.dev.poll,
    }
  },
}
```
在文件开头引入bee-proxy,然后在devServer引入before项的配置即可.
```js
const proxy = require('bee-proxy')
const devWebpackConfig = merge(baseWebpackConfig, {
  module: {
    rules: utils.styleLoaders({sourceMap: config.dev.cssSourceMap, usePostCSS: true})
  },
  // cheap-module-eval-source-map is faster for development
  devtool: config.dev.devtool,

  // these devServer options should be customized in /config/index.js
  devServer: {
    disableHostCheck: true,
    clientLogLevel: 'warning',
    historyApiFallback: {
      rewrites: [
        {from: /.*/, to: path.posix.join(config.dev.assetsPublicPath, 'index.html')},
      ],
    },
    hot: true,
    contentBase: false, // since we use CopyWebpackPlugin.
    compress: true,
    host: HOST || config.dev.host,
    port: PORT || config.dev.port,
    open: config.dev.autoOpenBrowser,
    overlay: config.dev.errorOverlay
      ? {warnings: false, errors: true}
      : false,
    publicPath: config.dev.assetsPublicPath,
    proxy: config.dev.proxyTable,
    quiet: false, // necessary for FriendlyErrorsPlugin
    watchOptions: {
      poll: config.dev.poll,
    },

    // 主要是下面的配置
    before: function (app) {
      app.use(proxy)
    }
  },
}
```
