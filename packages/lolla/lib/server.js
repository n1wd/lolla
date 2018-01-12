const fs = require('mz/fs')
const express = require('express')
const webpack = require('webpack')
const path = require('path')
const jsonFormat = require('json-format')
const union = require('lodash/union')
const cors = require('cors')
const compression = require('compression')
const webpackDevMiddleware = require('webpack-dev-middleware')
const webpackHotMiddleware = require('webpack-hot-middleware')

const renderHTML = require('./html')
const configFile = require('./config')

const hotMiddlewareScript = 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000&reload=true'

process.nextTick(() => {

  const { packages } = configFile
  const webroot = path.join(process.cwd(), configFile.webroot || configFile.devPublicPath || './')

  const app = express()
  app.use(cors())
  app.use(compression())

  if (!configFile.preview) {
    packages.forEach(pkg => {
      if (!pkg.webpack) return null
      const target = pkg.webpack
      Object.keys(target.entry, (key) => {
        target.entry[key].push(hotMiddlewareScript)
      })
      target.devtool = 'inline-source-map'
      if (pkg.hot) target.plugins.push(new webpack.HotModuleReplacementPlugin())
      target.plugins.push(new webpack.NoEmitOnErrorsPlugin())

      target.devServer = {
        hot: true,
        inline: true
      }

      const compiler = webpack(target)
      app.use(webpackDevMiddleware(compiler, {
        publicPath: target.output.publicPath,
        stats: {
          colors: true
        }
      }))
      if (pkg.hot) app.use(webpackHotMiddleware(compiler))
    })
  }


  configFile.packages.filter(pkg => {
    return pkg.platform === 'web' || !pkg.hasOwnProperty('platform')
  }).forEach(packageConfig => {
    if (packageConfig.hasOwnProperty('html')) {
      app.route(`/${packageConfig.name}`).all((req, res, next) => {
        res.write(renderHTML(packageConfig, configFile))
        res.end()
      })
    }
  })

  app.route('*').all((req, res, next) => {
    try {
      res.sendFile(`${webroot}/${req.path}`)
    } catch (e) {
      res.sendStatus(404)
    }
  })

  app.listen(configFile.port, '127.0.0.1', (err) => {
    if (err) return console.log(err)
    console.log(`webpack:  Listening at http://127.0.0.1:${configFile.port}`)
  })

  console.warn('lolla: you should install loaders in this project directory')
})