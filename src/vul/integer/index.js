const assert = require('assert')
const { formatSymbol, findSymbols } = require('../../shared')

class Integer {
  constructor(srcmap, ast) {
    this.srcmap = srcmap
    this.ast = ast
    this.fragments = this.findOperands()
  }

  findOperands() {
    const stack = [this.ast]
    const operators = ['--', '-=', '-', '++', '+=', '+', '*', '*=', '/', '/=', '**']
    const fragments = {}
    while (stack.length) {
      const item = stack.pop()
      const children = item.children || []
      if (item.attributes && item.attributes.contractKind == 'library') { // 库函数不处理
        continue
      }
      const operator = item.attributes ? item.attributes.operator || '' : ''
      if (['+', '-'].includes(operator) && item.name == 'UnaryOperation') { // 一元操作符
        continue
      }
      if (operators.includes(operator)) {
        const [s, l] = item.src.split(':').map(x => parseInt(x))  //s:237 l:12
        const frag = { range: [s, s + l], operands: [], operator }
        item.children.forEach(({ src, attributes }) => {
          const { type } = attributes
          const [s, l] = src.split(':').map(x => parseInt(x))
          frag.operands.push({ type, range: [s, s + l]})
        })
        fragments[`${s}:${l}`] = frag
      }
      children.forEach(c => stack.push(c))
    }
    return fragments
  }

  // 根据srcmap、tree,返回包含指定targets操作的fragments{operand:[{},{}],operator:'+=',range:[],selected:true}
  scan(tree, endPoints) {
    const targets = ['ADD', 'SUB', 'MUL', 'EXP', 'DIV']
    const dnodes = tree.root.traverse(({ node: { me } }) => { // 遍历
      const sy = formatSymbol(me)
      /* 
      root
      CALL(MUL(ISZERO(ADD(CALLDATALOAD(4,20),1,42)),8fc,46),AND(ffffffffffffffffffffffffffffffffffffffff,CALLER(3c)),ADD(CALLDATALOAD(4,20),1,42),MLOAD(80,0,1,54),80,0)
      ISZERO(LT(SLOAD(1,1,37),64))
      SSTORE(1,ADD(SLOAD(1,1,60),1,61))
      ISZERO(CALLVALUE(16))
      EQ(ab3ae255,AND(ffffffff,DIV(CALLDATALOAD(0,20),100000000000000000000000000000000000000000000000000000000,d)))
      LT(CALLDATASIZE(5),4)
      */
      for (let i = 0; i < targets.length; i++) {
        if (sy.includes(`${targets[i]}(`)) return true  // 返回sy满足条件（包含targets）的集合
      }
      return false
    })
    dnodes.forEach(dnode => { // 标记每个fragments是否是所要检查的操作类型（targets）
      const { node: { me, endPointIdx } } = dnode
      const nodes = findSymbols(me, ([_, name]) => targets.includes(name))
      nodes.forEach(node => {
        const epIdx = node[4][1].toNumber() - 1 // -1？ 
        const endPoint = endPoints[endPointIdx]
        const { pc, opcode } = endPoint.get(epIdx)
        const { s, l } = this.srcmap.toSL(pc) // 根据pc从源映射获取s,l
        const id = `${s}:${l}`
        if (this.fragments[id]) {
          this.fragments[id].selected = true
        }
      })
    })
    const fragments = Object.values(this.fragments) // 过滤满足标记的fragments数据
      .filter(({ selected }) => selected)
    return fragments
  }
} 

module.exports = Integer 
