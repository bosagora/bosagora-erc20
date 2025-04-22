// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title BOSAGORA Token
 * @dev Implementation of the BOSAGORA token.
 *
 * This contract implements the BOSAGORA token with the following features:
 * - Fixed maximum supply of 4.95 billion BOA tokens
 * - 7 decimal places
 * - Owner-controlled minting functionality
 * - Transferable ownership
 */
contract BOSAGORA is ERC20 {
    /*
     *  Constants
     */
    string private constant NAME = "BOSAGORA";
    string private constant SYMBOL = "BOA";
    uint8 private constant DECIMALS = 7;
    uint256 public constant MAX_SUPPLY = 4_950_000_000 * 10 ** DECIMALS; // 4.95 billion BOA tokens

    /*
     *  Storage
     */
    address public owner; // Address of the account that owns the contract

    /*
     *  Events
     */
    /**
     * @notice Emitted when tokens are created by the owner.
     * @param account The account that received the minted tokens.
     * @param amount The amount of tokens minted.
     */
    event TokensMinted(address indexed account, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /*
     *  Modifiers
     */
    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "BOSAGORA: Only the owner can execute");
        _;
    }

    /*
     * Public functions
     */
    /**
     * @dev Initializes the contract, setting the deployer as the initial owner.
     * @param initialOwner The initial address that will own the contract.
     *
     * Requirements:
     * - The initial owner cannot be the zero address.
     */
    constructor(address initialOwner) ERC20(NAME, SYMBOL) {
        require(initialOwner != address(0), "BOSAGORA: Initial owner is zero address");
        owner = initialOwner;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     * @param newOwner The address of the new owner.
     *
     * Requirements:
     * - The caller must be the current owner.
     * - `newOwner` cannot be the zero address.
     * - `newOwner` cannot be the current owner.
     *
     * Emits an {OwnershipTransferred} event.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "BOSAGORA: New owner is zero address");
        require(newOwner != owner, "BOSAGORA: New owner is same as current owner");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @dev Mints new tokens to `account`.
     * @param account The account of tokens to mint.
     * @param amount The amount of tokens to mint.
     *
     * Requirements:
     * - The caller must be the owner
     * - The total supply after minting must not exceed MAX_SUPPLY
     *
     * Emits a {TokensMinted} event.
     */
    function mint(address account, uint256 amount) external onlyOwner {
        require(amount > 0, "BOSAGORA: Amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "BOSAGORA: Exceeds maximum supply");
        _mint(account, amount);
        emit TokensMinted(account, amount);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     */
    function decimals() public view virtual override returns (uint8) {
        return DECIMALS;
    }
}
