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
// contracts/sample.sol

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

  function transfer(
    uint x, uint y,
    uint z, uint m, uint n
  ) {
    while (x < 100) {
      x = add_uint256(y, 1);
      if (y < 100) {
        y = add_uint256(z, 1);
        if (z < 100) {
          z = add_uint256(m, 1);
        } else {
          m = add_uint256(n, 1);
        }
      } else {
        n = add_uint256(x, 1);
      }
    }
    msg.sender.send(x);
  }
}