# Getting started(Linux)
## 1.Clone the project
Clone the project to `project_folder/` and install dependencies

```bash
cd project_folder/
npm install && mkdir contracts/
```

## 2.Place the contract
Place the following contract to `contracts/sample.sol`
```solidity
// contracts/sample.sol

pragma solidity^0.4.26;

contract Fund {
  mapping(address => uint) balances;
  uint counter = 0;
  uint dontFixMe = 0;

  function main(uint x) public {
    if (counter < 100) {
      msg.sender.send(x + 1);
      counter += 1;
      dontFixMe ++;
    }
  }
}
```
## 3.Install Python3

## 4.Install solc-select
```shell
pip3 install solc-select

solc-select install 0.4.26

solc-select use 0.4.26
```

## 5.Run test
Run `npm run dev` to patch `sample.sol`. The fixed file is `contracts/fixed.sol`

```solidity
//contracts/fixed.sol

contract sGuard{
  function add_uint256(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }

  bool internal locked_;
  constructor() internal {
    locked_ = false;
  }
  modifier nonReentrant_() {
    require(!locked_);
    locked_ = true;
    _;
    locked_ = false;
  }
}
pragma solidity^0.4.26;

contract Fund  is sGuard {
  mapping(address => uint) balances;
  uint counter = 0;
  uint dontFixMe = 0;

   function main(uint x) nonReentrant_  public {
    if (counter < 100) {
      msg.sender.send(add_uint256(x, 1));
      counter = add_uint256(counter, 1);
      dontFixMe ++;
    }
  }
}
```
## Note: the source code is currently unstable. It will be refactored and updated soon
