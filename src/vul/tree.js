const assert = require('assert')
const { toPairs } = require('lodash')
const { DNode } = require('../analyzer')

class Tree {

  constructor(cache) {
    this.root = new DNode(['symbol', 'root'], 0, 0, 0)  // symbol pc endPointIdx epIdx 
    this.cache = cache
  }

  toKey(endPointIdx, epIdx) {
    assert(endPointIdx >= 0 && epIdx >= 0)
    return [endPointIdx, epIdx].join(':')
  }

  build(endPointIdx, epIdx, value) {  // 大ep索引，小ep索引，ep的calls的值
    const stack = [
      { 
        directParent: this.root,
        endPointIdx,
        epIdx,
        value,
      }
    ]
    const visited = new Set()
    while (stack.length) {
      const { directParent, endPointIdx, epIdx, value } = stack.pop()
      const { expression, sloads, mloads, links } = value
      const { mem: { branches, mstores, sstores } } = this.cache
      const { pc } = this.cache.endPoints[endPointIdx].ep[epIdx]
      const dnode = new DNode(expression, pc, endPointIdx, epIdx)
      const branch = branches[endPointIdx]
      const bug = { stack: stack.length, visited: visited.size }
      process.send && process.send({ bug })
      directParent.node.childs.push(dnode)
      links.forEach(epIdx => {    // 遍历links向stack添加元素
        const key = this.toKey(endPointIdx, epIdx)
        if (!visited.has(key)) {
          visited.add(key)
          stack.push({ 
            directParent: dnode,
            endPointIdx,
            epIdx,
            value: branch[epIdx],
          })
        }
      })
      const mstore = mstores[endPointIdx]
      const mloadStack = [...mloads]
      while (mloadStack.length) { // 遍历
        const mload = mloadStack.pop()
        const pairs = toPairs(mstore).reverse() // 键值对转Set数组[[key, value]] [mstoreEpIdx, value]
        for (let i = 0; i < pairs.length; i++) {  // 相当于遍历mstore
          const [mstoreEpIdx, value] = pairs[i]
          if (parseInt(mstoreEpIdx) < parseInt(epIdx)) {
            if (mload.eq(value.key)) {  // value.key:LocalVariable
              const key = this.toKey(endPointIdx, mstoreEpIdx)
              if (!visited.has(key)) {
                visited.add(key)
                stack.push({ 
                  directParent: dnode,
                  endPointIdx,
                  epIdx: mstoreEpIdx,
                  value,
                })
              }
              if (
                mload.locs.length == 1
                && value.key.locs.length == 1
              ) break
            }
          }
        }
      }
      sstores.forEach((sstore, endPointIdx) => {
        toPairs(sstore).forEach(([sstoreEpIdx, value]) => {
          sloads.forEach(sload => {
            if (sload.eq(value.key)) {
              const key = this.toKey(endPointIdx, sstoreEpIdx)
              if (!visited.has(key)) {
                visited.add(key)
                stack.push({ 
                  directParent: dnode,
                  endPointIdx,
                  epIdx: sstoreEpIdx,
                  value,
                })
              }
            }
          })
        })
      })
    }
  }
}

module.exports = Tree
