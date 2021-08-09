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