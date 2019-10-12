const WS = require('ws')
const { createCanvas, Image } = require('canvas')
const { image } = require('./config.json')

module.exports = class PixelBot {
  constructor (wsslink, store) {
    this.wsslink = wsslink
    this.MAX_WIDTH = 1590
    this.MAX_HEIGHT = 400
    this.MAX_COLOR_ID = 25
    this.MIN_COLOR_ID = 0

    this.SIZE = this.MAX_WIDTH * this.MAX_HEIGHT
    this.SEND_PIXEL = 0

    this.pixelDataToDraw = {}
    this.initPixelCanvas = {}

    this.canvas = null
    this.img = null
    this.ws = null
    this.wsloaded = false
    this.busy = false

    this.colors = [
      [255, 255, 255, 0],
      [0, 0, 0, 4],
      [58, 175, 255, 5],
      [255, 0, 0, 11],
    ]

    this.isStartedWork = false
    this.thatsMy = false

    this.load(store).catch(console.error)
  }

  async load (store) {
    this.canvas = createCanvas()
    const ctx = this.canvas.getContext('2d')

    this.img = new Image()
    this.img.onload = () => {
      console.log('> Image was loaded.')
      this.canvas.width = this.img.width
      this.canvas.height = this.img.height
      ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height)

      const imd = ctx.getImageData(0, 0, this.img.width, this.img.height).data
      for (let i = 0; i < imd.length; i += 4) {
        const x = (i / 4) % this.img.width + 1
        const y = ~~((i / 4) / this.img.width) + 1

        const color = [imd[i], imd[i + 1], imd[i + 2]]
        if (imd[i + 3] < 1) {
          continue
        } else {
          for (const colord of this.colors) {
            if (color[0] === colord[0] && color[1] === colord[1] && color[2] === colord[2]) {
              this.pixelDataToDraw[[x, y]] = colord[3]
              break
            }
          }
        }
      }
      console.log('> Pixels was loaded.')
      this.startWork(store)
    }

    this.img.src = `${image}?${parseInt(new Date().getTime() / 1000)});`
  }

  initWs (store) {
    this.ws = new WS(this.wsslink)

    this.ws.on('open', async () => {
      console.log('> Connected to WebSocket.')
      this.wsloaded = true
    })

    this.ws.on('message', async (event) => {
      while (this.busy) {
        await this.sleep(500)
      }
      try {
        this.busy = true
        if (!store.initPixelCanvas) {
          store.initPixelCanvas = {}
          this.thatsMy = true
        }

        if (this.thatsMy) {
          const c = this.toArrayBuffer(event)
          for (let d = c.byteLength / 4, e = new Int32Array(c, 0, d), f = Math.floor(d / 3), g = 0; g < f; g++) {
            const h = e[3 * g], k = this.unpack(h), l = k.x, m = k.y, n = k.color
            store.initPixelCanvas[[l, m]] = n
          }
        }

        if (!this.isStartedWork) {
          this.startWork()
        }
        this.busy = false
      } catch (e) {
        this.busy = false
        console.log(e)
      }
    })

    this.ws.on('close', () => {
      this.ws = null
      this.wsloaded = false
    })
  }

  async startWork (store) {
    console.log('> Bot started.')
    this.isStartedWork = true
    for (const ind of Object.keys(this.pixelDataToDraw)) {
      const color = this.pixelDataToDraw[ind]
      const coords = ind.split(',')
      if (store.initPixelCanvas && store.initPixelCanvas[ind] && store.initPixelCanvas[ind] === color) {
        continue
      }

      await this.send(color, this.SEND_PIXEL, coords[0], coords[1], store)
      if (store.initPixelCanvas) {
        store.initPixelCanvas[ind] = color
      }

      await this.sleep(60000)
    }
    this.isStartedWork = false
  }

  async send (colorId, flag, x, y, store) {
    const c = new ArrayBuffer(4)
    new Int32Array(c, 0, 1)[0] = this.pack(colorId, flag, x, y)
    if (!this.ws) {
      this.initWs(store)
    }
    while (!this.wsloaded) {
      await this.sleep(500)
    }
    this.ws.send(c)
    console.log(`> Установлен пиксель на [${x}, ${y}] (${colorId})`)
  }

  pack (colorId, flag, x, y) {
    return parseInt(x, 10) + parseInt(y, 10) * this.MAX_WIDTH + this.SIZE * (parseInt(colorId, 10) + parseInt(flag, 10) * this.MAX_COLOR_ID)
  }

  unpack (b) {
    const d = (b -= Math.floor(b / this.SIZE) * this.SIZE) % this.MAX_WIDTH
    return {
      x: d,
      y: (b - d) / this.MAX_WIDTH,
      color: Math.floor(b / this.SIZE) % this.MAX_COLOR_ID,
      flag: Math.floor(Math.floor(b / this.SIZE) / this.MAX_COLOR_ID),
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
}
