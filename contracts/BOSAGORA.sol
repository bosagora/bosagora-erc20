pragma solidity ^0.5.0;

//
// BOSAGORA is a standard ERC20 token.
//
// Copyright (c) 2019 BOS Platform Foundation
//

import "../openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract BOSAGORA is ERC20, ERC20Detailed {
    uint8 public constant DECIMALS = 7;
    uint256 public constant INITIAL_SUPPLY = 5421301301958463;

    constructor () public ERC20Detailed("BOSAGORA", "BOA", DECIMALS) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
