// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title BOSAGORA Token
 * @dev Implementation of the BOSAGORA token with scheduled minting based on yearly timestamps.
 *
 * This contract implements the BOSAGORA token with the following features:
 * - Fixed maximum supply of 4.95 billion BOA tokens
 * - 7 decimal places
 * - Scheduled minting over 128 years based on predefined deadlines and cumulative limits.
 * - Minting up to the yearly limit targets a specific asset account.
 * - Permissionless minting trigger (anyone can call mint after conditions are met).
 * - No ownership or administrative functions after deployment.
 */
contract BOSAGORA is ERC20 {
    /*
     *  Constants
     */
    string private constant NAME = "BOSAGORA";
    string private constant SYMBOL = "BOA";
    uint8 private constant DECIMALS = 7;
    uint256 public constant MAX_SUPPLY = 4_950_000_000 * 10 ** DECIMALS;

    /*
     *  Storage
     */
    address public immutable assetAccount; // Address that receives all minted tokens.

    /*
     *  Events
     */
    /**
     * @notice Emitted when tokens are created by the owner.
     * @param account The account that received the minted tokens.
     * @param amount The amount of tokens minted.
     */
    event TokensMinted(address indexed account, uint256 amount);

    /*
     * Public functions
     */
    /**
     * @dev Initializes the contract, setting the asset account address.
     * @param account The address that will receive all minted tokens.
     *
     * Requirements:
     * - The account cannot be the zero address.
     */
    constructor(address account) ERC20(NAME, SYMBOL) {
        require(account != address(0), "BOSAGORA: Asset account is zero address");
        assetAccount = account;
        // nextMintingPeriodIndex starts at 0
    }

    /**
     * @dev Mints new tokens to `account`.
     * @param amount The amount of tokens to mint.
     *
     * Requirements:
     * - The total supply after minting must not exceed MAX_SUPPLY
     *
     * Emits a {TokensMinted} event.
     */
    function mint(uint256 amount) external {
        require(amount > 0, "BOSAGORA: Amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "BOSAGORA: Exceeds maximum supply");
        _mint(assetAccount, amount);
        emit TokensMinted(assetAccount, amount);
    }

    /**
     * @dev Returns the number of decimals.
     */
    function decimals() public view virtual override returns (uint8) {
        return DECIMALS;
    }
}
