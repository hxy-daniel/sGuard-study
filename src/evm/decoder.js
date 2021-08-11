const assert = require('assert')
const opcodes = require('./opcodes')

class Decoder {
  constructor(bin) {
    this.stats = { 
      njumpis: 0, // JUMPI的数量(public变量/函数)
      nexts: 0,
      nexts: 0, // 除PUSH、JUMPI外的其他6个操作的数量 多余？
      pc: 0,  // 程序计数器
    }
    while (this.stats.pc < bin.length) {
      const opcode = opcodes[bin[this.stats.pc]]
      if (!opcode) break
      switch (opcode.name) {
        case 'PUSH': {  // 未考虑PUSH多个？(PUSH2~PUSH32)
          this.stats.pc += bin[this.stats.pc] - 0x5f
          break
        }
        case 'JUMPI': {
          this.stats.njumpis ++
          break
        }
        case 'DELEGATECALL':
        case 'CALLCODE':
        case 'CREATE':
        case 'CREATE2':
        case 'SELFDESTRUCT':
        case 'CALL': {
          this.stats.nexts ++
          break
        }
      }
      this.stats.pc ++
    }
  }
}

module.exports = Decoder
