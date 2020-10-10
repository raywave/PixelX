const WebSocket = require('ws')

module.exports = class PixelBot {
  constructor (wsslink, store) {
    this.wsslink = wsslink
    this.MAX_WIDTH = 1590
    this.MAX_HEIGHT = 400
    this.MAX_COLOR_ID = 25
    this.MIN_COLOR_ID = 0

    this.SIZE = this.MAX_WIDTH * this.MAX_HEIGHT
    this.SEND_PIXEL = 0

    this.ws = null
    this.busy = false

    this.isStartedWork = false
    this.rCode = null

    this.load(store).catch(console.error)
  }

  async load (store) {
    this.startWork(store)
  }

  async initWs (store) {
    this.ws = new WebSocket(this.wsslink)

    this.ws.on('open', async () => {
      console.log('> Подключение к WebSocket было успешным.')
    })

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
          store.data[[l, m]] = n
        }

        if (!this.isStartedWork) {
          this.startWork(store)
        }
        this.busy = false
      } catch (e) {
        this.busy = false
      }
    })

    this.ws.on('close', () => {
      console.log('> Exit')
      this.ws = null
    })
  }

  async sendPixel (store) {
    const keys = Object.keys(store.pixelDataToDraw)
    const ind = keys[Math.floor(Math.random() * keys.length)]

    const color = store.pixelDataToDraw[ind]
    const coords = ind.split(',')

    if (store.data && store.data[ind] && store.data[ind] === color) {
      return this.sendPixel(store)
    }

    await this.send(color, this.SEND_PIXEL, coords[0], coords[1], store)
    if (store.data) {
      store.data[ind] = color
    }
    setTimeout(() => {
      this.sendPixel(store)
    }, 60000)
  }

  async startWork (store) {
    console.log('> Производится запуск скрипта.')
    this.isStartedWork = true
    await store.load()
    await this.sendPixel(store)
  }

  async send (colorId, flag, x, y, store) {
    const c = new ArrayBuffer(4)
    new Int32Array(c, 0, 1)[0] = this.pack(colorId, flag, x, y)
    if (!this.ws) {
      await this.initWs(store)
    }

    if (this.ws.readyState !== 1) {
      await this.sleep(100)
      return this.send(colorId, flag, x, y, store)
    }

    this.ws.send(c)
    console.log(`> Был раскрашен пиксель [${x}, ${y}] (${colorId})`)
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
