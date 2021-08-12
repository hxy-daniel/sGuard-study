const assert = require('assert')  //断言
const fs = require('fs')  // 文件系统
const path = require('path')
const shell = require('shelljs')  //js中调用shell执行命令
const { Evm, Decoder } = require('./evm')
const { logger, gb, prettify, addFunctionSelector } = require('./shared')
const { forEach } = require('lodash')
const { Condition, Cache } = require('./analyzer')
const { Scanner } = require('./vul')
const SRCMap = require('./srcmap')

let contractFile = 'contracts/sample.sol'
let fixedFile = 'contracts/fixed.sol'
let jsonFile = 'contracts/sample.sol.json'

if (process.send) { // undefined
  const d = JSON.parse(process.argv[2])
  contractFile = d.contractFile
  fixedFile = d.fixedFile
  jsonFile = d.jsonFile
} else {
  // asm(汇编码) solc可以输出函数签名--hashes
  const { code } = shell.exec(`solc --combined-json bin-runtime,srcmap-runtime,ast,asm ${contractFile} > ${jsonFile}`)
  if (code != 0) {
    console.log(`[+] Failed to compile`)
    return
  } 
}
/* strip comments */
source = fs.readFileSync(contractFile, 'utf8')
const lines = source.split('\n').length
const output = fs.readFileSync(jsonFile, 'utf8')
const jsonOutput = JSON.parse(output)
assert(jsonOutput.sourceList.length == 1)
const sourceIndex = jsonOutput.sourceList[0]  // "contracts/sample.sol"
const { AST } = jsonOutput.sources[sourceIndex] // 从sources数组中获取索引为"contracts/sample.sol"的AST
const { children } = AST
const { attributes: { name } } = children[children.length - 1]  //从AST的children中获取合约的名字"Fund" -- "Contract Fund" 如果有多个合约名字name呢？只取最后一个？只考虑了一个合约的情况？
addFunctionSelector(AST)  // 函数签名：如果有函数，则在AST对应函数attributes中存放functionSelector，值为main(uint256)的16进制hash的前8位，否则值为"fallback"

// console.log(AST.children[1].children[3].attributes.functionSelector)  // "ab3ae255"

forEach(jsonOutput.contracts, (contractJson, full) => { // 遍历合约列表 full:"contracts/sample.sol:Fund"
  const contractName = full.split(':')[1] // 获取合约名称 Fund
  if (name != contractName) return  // 如果有多个合约名字name呢？
  let rawBin = contractJson['bin-runtime']
    .split('_').join('0')
    .split('$').join('0') // 与bin-runtime相比无变化608060405260043610603f576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff168063ab3ae255146044575b600080fd5b348015604f57600080fd5b50606c60048036038101908080359060200190929190505050606e565b005b6064600154101560d4573373ffffffffffffffffffffffffffffffffffffffff166108fc600183019081150290604051600060405180830381858888f1935050505050600180600082825401925050819055506002600081548092919060010191905055505b505600a165627a7a72305820f7f8081d2836678481e466d2362c09204c5160c2d2c351c02f5ef1e13bbf098a0029
  const auxdata = contractJson['asm']['.data'][0]['.auxdata'] // 翻译：辅助数据 0有无关系？与rawBin后部分相同 a165627a7a72305820f7f8081d2836678481e466d2362c09204c5160c2d2c351c02f5ef1e13bbf098a0029
  rawBin = rawBin.slice(0, -auxdata.length) // 获取rawBin除后部分auxdata的前部分
  const bin = Buffer.from(rawBin, 'hex')  // 整理数据格式 <Buffer 60 80 60 40 52 60 04 36 10 60 3f 57 60 00 35 7c 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 90 04 63 ff ff ... 166 more bytes>
  const decoder = new Decoder(bin)  // Decoder { stats: { njumpis: 4, nexts: 1, pc: 216 } }
  const { stats: { nexts } } = decoder  // 获取操作码中是除PUSH、JUMPI外其他6个操作码的数量"1"
  process.send && process.send({  // 向父进程发送信息?
    contract: { name },
    duration: { runAt: Date.now() },
  })
  if (nexts == 0) process.exit()  // ?没有其他6个操作码，没有bug，不需要修补？
  const evm = new Evm(bin, decoder)
  const srcmap = new SRCMap(contractJson['srcmap-runtime'] || '0:0:0:0', source, bin)
  const { endPoints, njumpis, cjumpis } = evm.start() // njumpis=cjumpis，都是JUMPI时++
  process.send && process.send({ 
    contract: { name: contractName },
    sevm: { paths: endPoints.length, njumpis, cjumpis },
    duration: { sevmAt: Date.now() },
    patch : { origin: { bytecodes: rawBin.length, lines } } 
  })
  /* Dependency */
  const condition = new Condition(endPoints)  // 获取节点/前后/支配/控制关系
  const cache = new Cache(condition, endPoints, srcmap) // 处理计算mem/成功失败stats数据
  process.send && process.send({ duration: { dependencyAt: Date.now() } })
  const scanner = new Scanner(cache, srcmap, AST)
  const uncheckOperands = scanner.scan()
  /* Bug found */
  const operators = uncheckOperands.map(({ operator }) => operator)
  const integer = !!operators.find(x => ['--', '-=', '-', '+', '++', '+=', '*', '*=', '/', '/=', '**'].includes(x))
  const reentrancy = !!operators.find(x => ['lock:function'].includes(x))
  process.send && process.send({ bug: { integer, reentrancy }})
  /* Patch */
  const bugFixes = scanner.generateBugFixes(uncheckOperands)
  process.send && process.send({ duration: { bugAt: Date.now() }})
  const guard = scanner.fix(bugFixes)
  fs.writeFileSync(fixedFile, guard, 'utf8')
  process.send && process.send({ duration: { patchAt: Date.now() }})
})
