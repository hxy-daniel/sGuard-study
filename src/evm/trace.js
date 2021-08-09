const assert = require('assert')
const chalk = require('chalk')
const { reverse } = require('lodash')
const { prettify, logger } = require('../shared')

class Trace {
  constructor() {
    this.ts = []
  }

  clear() {
    this.ts.length = 0
  }

  add({ pc, t, epIdx, vTrackingPos, kTrackingPos }) {
    this.ts.push({ pc, t, epIdx, vTrackingPos, kTrackingPos })
  }

  clone() {
    const trace = new Trace()
    trace.ts = [...this.ts]
    return trace
  }

  sub(traceSize) {
    assert(traceSize >= 0)
    assert(traceSize <= this.ts.length)
    const trace = new Trace()
    const ts = this.ts.slice(0, traceSize)
    trace.ts = [...ts]
    return trace
  }

  filter(cond) {
    assert(cond)
    return reverse([...this.ts]).filter(t => cond(t))
  }

  find(cond) {
    assert(cond)
    return reverse([...this.ts]).find(t => cond(t))
  }

  memValueAt(loc) { // 调用2次
    /*
    loc
    [ 'const', BN { negative: 0, words: [ 64, 0 ], length: 1, red: null } ]
    */
    assert(loc && loc[0] == 'const')
    const r = this.find(({ t }) => {
      // console.log(t[4][1])  // BN对象
      /*
      t
      [
        'symbol',
        'MSTORE',
        [ 'const', BN { negative: 0, words: [ 64, 0 ], length: 1, red: null } ],
        [ 'const', BN { negative: 0, words: [ 128, 0 ], length: 1, red: null } ],
        [ 'const', BN { negative: 0, words: [ 32 ], length: 1, red: null } ]
      ]
      */
      const [_, name, targetLoc, value] = t
      /*
      console.log(targetLoc)
      console.log(value)
      [ 'const', BN { negative: 0, words: [ 64, 0 ], length: 1, red: null } ]
      [
        'const',
        BN { negative: 0, words: [ 128, 0 ], length: 1, red: null }
      ]
      */
      return name == 'MSTORE' && targetLoc[0] == 'const' && targetLoc[1].eq(loc[1])
    })
    /*
    r
    {
      pc: 4,
      t: [
        'symbol',
        'MSTORE',
        [ 'const', BN { negative: 0, words: [ 64, 0 ], length: 1, red: null } ],
        [ 'const', BN { negative: 0, words: [ 128, 0 ], length: 1, red: null } ],
        [ 'const', BN { negative: 0, words: [ 32 ], length: 1, red: null } ]
      ],
      epIdx: 2,
      vTrackingPos: 0,
      kTrackingPos: 1
    }
    */
    if (r) return r.t[3]
    /*
    r.t[3]
    [
      'const',
      BN { negative: 0, words: [ 128, 0 ], length: 1, red: null }
    ]
    */
    assert(false, `Access to uninitialized memory location: 0x${loc[1].toString(16)}`)
  }

  get(idx) {
    assert(idx >= 0 && idx <= this.ts.length)
    return this.ts[idx]
  }

  last() {
    assert(this.ts.length > 0)
    return this.ts[this.ts.length - 1]
  }

  size() {
    return this.ts.length
  }

  prettify() {
    logger.info(chalk.yellow.bold(`>> Full traces ${this.ts.length}`))
    prettify(this.ts.map(({ t }) => t))
  }
}

module.exports = Trace
