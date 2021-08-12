const assert = require('assert')
const { toPairs, fromPairs, intersection, union, xor } = require('lodash')
const { prettify, formatSymbol, logger } = require('../shared')

class Condition {
  constructor(endPoints) {
    assert(endPoints.length >= 0)
    this.start = 0
    this.end = 100000
    this.buildGraph(endPoints)
    this.computeDominators()  // worklist算法计算支配集 TODO:选择更好的算法
    this.computeControls()
  }

  buildGraph(endPoints) { // 构造JUMPI的前后图
    const successors = {}
    const predecessors = {} 
    const nodes = new Set([this.start, this.end]) // 不可重复
    endPoints.forEach(({ ep }) => { // 将JUMPI的pc和前一个是JUMPI的pc存入nodes
      ep.forEach(({ opcode: { name }, pc }, idx) => {
        if (name == 'JUMPI' || (idx >= 1 && ep[idx - 1].opcode.name == 'JUMPI')) {  // 将JUMPI的pc和前一个是JUMPI的pc存入nodes
          nodes.add(pc)
        }
      })
    })
    endPoints.forEach(({ ep }) => { // 获取每个pc的前后pc，存入数组
      const markers = [
        { pc: this.start },
        ...ep.filter(({ pc }) => nodes.has(pc)),  // 过滤得到ep的pc包含在nodes中的ep，即得到每个endpoints中当前/前为JUMPI的ep列表
        { pc: this.end }
      ]
      markers.slice(1).forEach(({ pc: to }, idx) => { // 去掉第一个元素
        const from = markers[idx].pc
        if (!successors[from]) successors[from] = new Set()
        successors[from].add(to)
        if (!predecessors[to]) predecessors[to] = new Set()
        predecessors[to].add(from)
      })
    })
    this.successors = fromPairs(  // Set转数组赋给全局变量
      toPairs(successors).map(([key, values]) => [key, [...values]])
    )
    this.predecessors = fromPairs(  // Set转数组赋给全局变量
      toPairs(predecessors).map(([key, values]) => [key, [...values]])
    )
    this.nodes = [...nodes] // Set转数组赋给全局变量
  }

  computeDominators() { // workLIS算法计算支配/后支配
    const trees = [
      {
        predecessors: this.predecessors,
        successors: this.successors,
        nodes: this.nodes,
        start: this.start,
      },
      {
        predecessors: this.successors,
        successors: this.predecessors,
        nodes: this.nodes,
        start: this.end,
      }
    ]
    // 支配/后支配 0开始，然后10000开始 后支配等同于支配？
    const [dominators, postdominators] = trees.map(({ start, predecessors, successors, nodes }) => {
      const dominators = {}
      nodes.forEach(node => dominators[node] = nodes) // 全赋值为nodes
      let workList = [start]  // 这就是workList算法...(A worklist algorithm for dominators查阅相关论文)
      while (workList.length > 0) {
        const node = workList.pop()
        const preds = predecessors[node] || []
        const pdominators = intersection.apply(intersection, preds.map(p => dominators[p])) // node的前继的dominators
        const ndominators = union([node], pdominators)  // 将node与node的前继的dominators合并成new dominators  
        if (ndominators.join('') != dominators[node].join('')) {  // 新的支配集不等于原来的则替换
          dominators[node] = ndominators  // 替换
          const succs = successors[node]
          workList = union(workList, succs) // 将后继添加到worklist中
        }
      }
      return dominators // 把支配赋值给后支配？
    })
    this.dominators = dominators
    this.postdominators = postdominators
  }

  computeControls() {
    this.fullControls = {}
    const domDict = this.nodes.map(node => {
      const succs = this.successors[node] || []
      return {
        node,
        iters: intersection.apply(intersection, succs.map(s => this.postdominators[s])),  // node的所有后继的后支配取交集
        unios: union.apply(union, succs.map(s => this.postdominators[s])) // node的所有后继的后支配取并集去重
      }
    })
    this.nodes.forEach(node => {
      if (node == this.start) return
      toPairs(domDict).forEach(([_, { node: onode, iters, unios }]) => {
        if (!iters.includes(node) && unios.includes(node)) {  // 全控制：交集内并集外
          !this.fullControls[node] && (this.fullControls[node] = [])
          this.fullControls[node].push(onode)
        }
      })
    })
  }
}

module.exports = Condition 
