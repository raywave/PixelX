
const { wssLinks } = require('./config.json')
const PixelBot = require('./core')
const Store = require('./store')

;(async () => {
  console.log('> Производится запуск [PixelX - github.com/aeonixlegit/PixelX]')
  for (const link of wssLinks) {
    await new Promise((resolve) => setTimeout(resolve, 3000)).then((r) => {
      const bot = new PixelBot(link, Store)
      bot && console.log('> Бот запущен.')
    })
  }
})()
