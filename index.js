
const { wssLinks } = require('./config.json')
const PixelBot = require('./core')
const Store = require('./store')
;(async () => {
  console.log('> Производится запуск [PixelX - github.com/aeonixlegit/PixelX]')
  await Store.load()
  for (const link of wssLinks) {
    const bot = new PixelBot(link, Store, wssLinks.indexOf(link), wssLinks.length)
  }
})()
