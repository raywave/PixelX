const axios = require('axios')
const { createCanvas, Image } = require('canvas')
const { image } = require('./config.json')

const decode_colors = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15,
  g: 16,
  h: 17,
  i: 18,
  j: 19,
  k: 20,
  l: 21,
  m: 22,
  n: 23,
  o: 24,
  p: 25,
}

const colors = [
  [255, 255, 255, 0], // #FFFFFF
  [194, 194, 194, 1], // #C2C2C2
  [133, 133, 133, 2], // #858585
  [71, 71, 71, 3], // #474747
  [0, 0, 0, 4], // #000000
  [58, 175, 255, 5], // #3AAFFF
  [113, 170, 235, 6], // #71AAEB
  [74, 118, 168, 7], // #4a76a8
  [7, 75, 243, 8], // #074BF3
  [94, 48, 235, 9], // #5E30EB
  [255, 108, 91, 10], // #FF6C5B
  [254, 37, 0, 11], // #FE2500
  [255, 33, 139, 12], // #FF218B
  [153, 36, 79, 13], // #99244F
  [77, 44, 156, 14], // #4D2C9C
  [255, 207, 74, 15], // #FFCF4A
  [254, 180, 63, 16], // #FEB43F
  [254, 134, 72, 17], // #FE8648
  [255, 91, 54, 18], // #FF5B36
  [218, 81, 0, 19], // #DA5100
  [148, 224, 68, 20], // #94E044
  [92, 191, 13, 21], // #5CBF0D
  [195, 209, 23, 22], // #C3D117
  [252, 199, 0, 23], // #FCC700
  [211, 131, 1, 24], // #D38301
]

const chunkString = function (str, length) {
  return str.match(new RegExp('.{1,' + length + '}', 'g'))
}

const randomInteger = function (min, max) {
  const rand = min - 0.5 + Math.random() * (max - min + 1)
  return Math.round(rand)
}

const loadImage = function (src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

const replaceAll = function (string, search, replacement) {
  var target = string
  return target.split(search).join(replacement)
}

module.exports = {
  data: null,
  canvas: null,
  pixelDataToDraw: {},
  lastUpdate: 0,
  replaceAll: replaceAll,

  async load () {
    const nowTime = parseInt(+new Date() / 1000)
    if (nowTime - this.lastUpdate > 60) {
      this.lastUpdate = nowTime
      await this.loadData()
      await this.loadImg()
    }
  },

  async loadData () {
    this.data = {}

    const startPixels = await axios.get('https://pixel-dev.w84.vkforms.ru/api/data/' + randomInteger(1, 19))
    let chunkedString = chunkString(startPixels.data, 1590)
    chunkedString = chunkedString.slice(0, chunkedString.length - 1)
    let y = 0
    for (const line of chunkedString) {
      let x = 0
      const lined = line.split('')
      for (const pixel of lined) {
        const color = decode_colors[pixel]
        this.data[[x, y]] = color
        x += 1
      }
      y += 1
    }
    console.log('> Состояние полотна обновлено,')
  },

  async loadImg () {
    this.canvas = createCanvas()
    const ctx = this.canvas.getContext('2d')

    const img = await loadImage(`${image}?${parseInt(new Date().getTime() / 1000)}`)

    this.canvas.width = img.width
    this.canvas.height = img.height
    ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)

    var imd = ctx.getImageData(0, 0, img.width, img.height).data
    for (var i = 0; i < imd.length; i += 4) {
      var x = (i / 4) % img.width + 1,
        y = ~~((i / 4) / img.width) + 1

      const color = [imd[i], imd[i + 1], imd[i + 2]]
      if (imd[i + 3] < 1) {
        continue
      } else {
        for (const colord of colors) {
          if (color[0] === colord[0] && color[1] === colord[1] && color[2] === colord[2]) {
            this.pixelDataToDraw[[x, y]] = colord[3]
            break
          }
        }
      }
    }
    console.log('> Шаблон обнолен.')
  },

}
