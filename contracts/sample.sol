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

  function transfer(
    uint x, uint y,
    uint z, uint m, uint n
  ) {
    while (x < 100) {
      x = y + 1;
      if (y < 100) {
        y = z + 1;
        if (z < 100) {
          z = m + 1;
        } else {
          m = n + 1;
        }
      } else {
        n = x + 1;
      }
    }
    msg.sender.send(x);
  }
}