// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

/**
 * @title BOSAGORA Token
 * @dev Implementation of the BOSAGORA token.
 *
 * This contract implements the BOSAGORA token with the following features:
 * - Fixed maximum supply of 4.95 billion BOA tokens
 * - 7 decimal places
 * - MultiSig wallet ownership
 * - Controlled minting functionality
 * - Ownership transfer capability
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
    address private _owner; // Address of the MultiSig wallet that owns the contract

    /*
     *  Events
     */
    event TokensMinted(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /*
     *  Modifiers
     */
    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == _owner, "BOSAGORA: Only the owner can execute");
        _;
    }

    /*
     * Public functions
     */
    /**
     * @dev Initializes the contract with a MultiSig wallet as the owner.
     * @param account_ The address of the MultiSig wallet that will own the contract.
     *
     * Requirements:
     * - The account must be a valid MultiSig wallet contract
     */
    constructor(address account_) ERC20(NAME, SYMBOL) {
        _owner = account_;
        require(
            IMultiSigWallet(_owner).supportsInterface(type(IMultiSigWallet).interfaceId),
            "BOSAGORA: Invalid interface ID of multi sig wallet"
        );
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function getOwner() external view returns (address) {
        return _owner;
    }

    /**
     * @dev Transfers ownership of the contract to a new MultiSig wallet.
     * @param newOwner The address of the new MultiSig wallet owner.
     *
     * Requirements:
     * - The caller must be the current owner
     * - The new owner cannot be the zero address
     * - The new owner must be a valid MultiSig wallet contract
     *
     * Emits a {OwnershipTransferred} event.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "BOSAGORA: New owner is zero address");
        require(newOwner != _owner, "BOSAGORA: New owner is same as current owner");
        require(
            IMultiSigWallet(newOwner).supportsInterface(type(IMultiSigWallet).interfaceId),
            "BOSAGORA: Invalid interface ID of new multi sig wallet"
        );
        address previousOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @dev Mints new tokens to the owner's address.
     * @param amount The amount of tokens to mint.
     *
     * Requirements:
     * - The caller must be the owner
     * - The total supply after minting must not exceed MAX_SUPPLY
     *
     * Emits a {TokensMinted} event.
     */
    function mint(uint256 amount) external onlyOwner {
        require(amount > 0, "BOSAGORA: Amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "BOSAGORA: Exceeds maximum supply");
        _mint(_owner, amount);
        emit TokensMinted(_owner, amount);
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
