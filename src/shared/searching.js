const assert = require('assert')
const { uniqBy, lastIndexOf } = require('lodash')
const ethutil = require('ethereumjs-util')
const { prettify, formatSymbol } = require('./prettify')
const BN = require('bn.js')
const jp = require('jsonpath')

const findSymbol = (symbol, cond) => {
  const [type, name, ...params] = symbol
  if (cond(symbol)) return [symbol]
  return params.reduce(
    (agg, symbol) => [...agg, ...findSymbol(symbol, cond)],
    [],
  )
}

const findSymbols = (symbol, cond) => {
  const [type, name, ...params] = symbol
  if (type == 'const') return []
  return params.reduce(
    (agg, symbol) => [...agg, ...findSymbols(symbol, cond)],
    cond(symbol) ? [symbol] : [],
  )
} 

const addFunctionSelector = (ast) => {
  const responses = jp.query(ast, `$..children[?(@.name=="FunctionDefinition")]`) //从AST中查找name="FunctionDefinition"/即AST中的函数定义部分
  responses.forEach(({ children, attributes }) => { // 遍历所有函数
    const { name: functionName } = attributes // 获取函数名
    const params = children.find(({ name }) => name == 'ParameterList') // 获取参数列表 uint x

    // console.log(params)
    // {
    //   children: [
    //     {
    //       attributes: [Object],
    //       children: [Array],
    //       id: 13,
    //       name: 'VariableDeclaration',
    //       src: '171:6:0'
    //     }
    //   ],
    //   id: 14,
    //   name: 'ParameterList',
    //   src: '170:8:0'
    // }

    assert(params)
    const d = params.children.map(c => c.attributes.type) // 获取参数类型 [ 'uint256' ]
    const functionSignature = `${functionName}(${d.join(',')})` // 获取函数样式 main(uint256)
    const functionSelector = functionName
      ? ethutil.keccak(functionSignature).toString('hex').slice(0, 8)
      : 'fallback'  // ab3ae255 如果有函数，则在AST对应函数attributes中存放functionSelector，值为main(uint256)的16进制hash的前8位，否则值为"fallback"
    attributes.functionSelector = functionSelector
  })
}

module.exports = {
  findSymbol,
  findSymbols,
  addFunctionSelector,
}

