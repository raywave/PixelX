const WebSocket = require('ws')

module.exports = class PixelBot {
  constructor (wsslink, store, index, totalBots) {
    this.wsslink = wsslink
    this.MAX_WIDTH = 1590
    this.MAX_HEIGHT = 400
    this.MAX_COLOR_ID = 25
    this.MIN_COLOR_ID = 0
    this.index = index
    this.totalBots = totalBots

    this.SIZE = this.MAX_WIDTH * this.MAX_HEIGHT
    this.SEND_PIXEL = 0

    this.ws = null
    this.busy = false

    this.isStartedWork = false
    this.noPixelsBefore = false
    this.store = store

    this.load().catch(console.error)
  }

  async load () {
    this.startWork()
  }

  async initWs () {
    this.ws = new WebSocket(this.wsslink)

    this.ws.on('open', async () => {
      this.log('Подключение к WebSocket было успешным.')
    })

    this.ws.on('error', () => {})

    this.ws.on('message', async (event) => {
      while (this.busy) {
        await this.sleep(500)
      }

      try {
        if (typeof event === 'string') return
        this.busy = true

        const c = this.toArrayBuffer(event)

        for (let d = c.byteLength / 4, e = new Int32Array(c, 0, d), f = Math.floor(d / 3), g = 0; g < f; g++) {
          const h = e[3 * g], k = this.unpack(h), l = k.x, m = k.y, n = k.color
          this.store.data[[l, m]] = n
        }

        if (!this.isStartedWork) {
          this.startWork()
        }
        this.busy = false
      } catch (e) {
        this.busy = false
      }
    })

    this.ws.on('error', (err) => console.error(err))

    this.ws.on('close', () => {
      this.log('Подключение к WebSocket было закрыто.')
      this.ws = null
    })
  }

  async sendPixel () {
    const keys = Object.keys(this.store.pixelDataToDraw)

    const pixelsToDraw = []

    for (let i = 0; i < keys.length; i++) {
      const index = keys[i]
      const colorWeNeed = this.store.pixelDataToDraw[index]
      if (this.store.data[index] !== colorWeNeed) {
        pixelsToDraw.push([index, colorWeNeed])
      }
    }

    if (pixelsToDraw.length > 0) {
      if (this.index >= pixelsToDraw.length - 1 && !this.noPixelsBefore) {
        this.noPixelsBefore = true
        await this.sleep(1000)
        return this.sendPixel()
      }
      const [coords, color] = pixelsToDraw[this.noPixelsBefore ? Math.max(pixelsToDraw.length - 1, 0) : this.index]
      this.noPixelsBefore = false
      const [x, y] = coords.split(',')
      if (this.store.data) {
        this.store.data[coords] = color
      }
      await this.send(color, this.SEND_PIXEL, x, y)
      setTimeout(() => {
        this.sendPixel()
      }, 60000)
    } else {
      await this.store.load()
      await this.sleep(1000)
      return this.sendPixel()
    }
  }

  // Thanks to @nitreojs (nitrojs)
  log (text) {
    console.log(`\x1b[33m[#${this.index}]\x1b[0m ${text}`)
  }

  async startWork () {
    this.log('Производится запуск скрипта.')
    this.isStartedWork = true
    if (!this.ws) {
      await this.initWs()
    }
    await this.sendPixel()
  }

  async send (colorId, flag, x, y) {
    if (!this.ws) {
      await this.initWs()
    }

    if (this.ws.readyState !== 1) {
      await this.sleep(100)
      return this.send(colorId, flag, x, y)
    }

    const c = new ArrayBuffer(4)
    new Int32Array(c, 0, 1)[0] = this.pack(colorId, flag, x, y)
    this.ws.send(c)
    this.log(`Был закрашен пиксель [${x}, ${y}] -> \x1b[35m${colorId}\x1b[0m`)
  }

  pack (colorId, flag, x, y) {
    const b = parseInt(colorId, 10) + parseInt(flag, 10) * this.MAX_COLOR_ID
    return parseInt(x, 10) + parseInt(y, 10) * this.MAX_WIDTH + this.SIZE * b
  }

  unpack (b) {
    const c = Math.floor(b / this.SIZE)
    const d = (b -= c * this.SIZE) % this.MAX_WIDTH
    return {
      x: d,
      y: (b - d) / this.MAX_WIDTH,
      color: c % this.MAX_COLOR_ID,
      flag: Math.floor(c / this.MAX_COLOR_ID),
    }
  }

  sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time))
  }

  toArrayBuffer (buf) {
    const ab = new ArrayBuffer(buf.length)
    const view = new Uint8Array(ab)
    for (let i = 0; i < buf.length; ++i) {
      view[i] = buf[i]
    }
    return ab
  }

  chunkString (str, length) {
    return str.match(new RegExp('.{1,' + length + '}', 'g'))
  }

  shuffle (array) {
    let currentIndex = array.length, temporaryValue, randomIndex

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1

      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }

    return array
  }
}
