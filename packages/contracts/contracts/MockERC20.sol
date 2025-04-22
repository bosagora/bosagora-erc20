// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev A mock ERC20 token contract for testing purposes.
 *
 * This contract implements a basic ERC20 token with the following features:
 * - Fixed 7 decimal places
 * - Configurable error simulation for testing
 * - Standard ERC20 transfer functionality
 *
 * This contract is used in test scenarios to simulate token behavior
 * and test error conditions in dependent contracts.
 */
contract MockERC20 is ERC20 {
    /*
     *  Constants
     */
    uint8 private constant DECIMALS = 7;

    /**
     * @dev Flag to simulate transfer errors for testing purposes.
     * When set to true, all transfer operations will revert.
     */
    bool public errorCausing;

    /**
     * @dev Initializes the mock token with a name, symbol, and initial supply.
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param initialSupply The initial supply of tokens
     *
     * The initial supply is minted to the contract deployer.
     */
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        errorCausing = false;
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Override of the standard transfer function with error simulation.
     * @param to The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     * @return bool indicating whether the transfer was successful
     *
     * If errorCausing is true, the function will revert with "Error for test".
     * This is used to simulate transfer failures in test scenarios.
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        if (errorCausing) revert("Error for test");
        return ERC20.transfer(to, amount);
    }

    /**
     * @dev Override of the standard transferFrom function with error simulation.
     * @param from The address to transfer tokens from
     * @param to The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     * @return bool indicating whether the transfer was successful
     *
     * If errorCausing is true, the function will revert with "Error for test".
     * This is used to simulate transferFrom failures in test scenarios.
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        if (errorCausing) revert("Error for test");
        return ERC20.transferFrom(from, to, amount);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * @return uint8 The number of decimals
     *
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     */
    function decimals() public view virtual override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Sets the error simulation flag.
     * @param value The new value for errorCausing
     *
     * This function allows testers to toggle the error simulation
     * to test error handling in dependent contracts.
     */
    function setErrorCausing(bool value) public {
        errorCausing = value;
    }
}
