// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

/**
 * @title TokenSwap
 * @dev A contract for swapping old tokens for new tokens with burning mechanism
 * @notice This contract allows users to swap their old tokens for new tokens at a 1:1 ratio
 * @author BOSAGORA Foundation
 */
contract TokenSwap is Pausable, ReentrancyGuard {
    /// @dev The address where old tokens will be burned
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @dev The old token contract
    IERC20 public immutable oldToken;

    /// @dev The new token contract
    IERC20 public immutable newToken;

    /// @dev The MultiSig wallet that owns the contract
    address public owner;

    /**
     * @notice Emitted when old tokens are burned
     * @param user The address of the user whose tokens were burned
     * @param amount The amount of tokens that were burned
     */
    event OldTokenBurned(address indexed user, uint256 amount);

    /**
     * @notice Emitted when tokens are swapped
     * @param user The address of the user who swapped tokens
     * @param amount The amount of tokens that were swapped
     */
    event TokenSwapped(address indexed user, uint256 amount);

    /**
     * @notice Emitted when ownership is transferred
     * @param previousOwner The address of the previous owner
     * @param newOwner The address of the new owner
     */
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "TokenSwap: Only the owner can execute");
        _;
    }

    /**
     * @notice Contract constructor
     * @param oldTokenAddress Address of the old token contract
     * @param newTokenAddress Address of the new token contract
     * @param multisigWallet Address of the MultiSig wallet that will own the contract
     * @dev Validates token contracts and checks decimals compatibility
     */
    constructor(address oldTokenAddress, address newTokenAddress, address multisigWallet) {
        require(oldTokenAddress != address(0), "TokenSwap: Old token is zero address");
        require(newTokenAddress != address(0), "TokenSwap: New token is zero address");
        require(multisigWallet != address(0), "TokenSwap: Owner is zero address");

        // Initialize token contracts
        oldToken = IERC20(oldTokenAddress);
        newToken = IERC20(newTokenAddress);

        // Validate that the contracts actually exist and implement ERC20
        require(isContract(oldTokenAddress), "TokenSwap: Old token address is not a contract");
        require(isContract(newTokenAddress), "TokenSwap: New token address is not a contract");

        // Validate owner is a MultiSig wallet
        require(
            IMultiSigWallet(multisigWallet).supportsInterface(type(IMultiSigWallet).interfaceId),
            "TokenSwap: Invalid interface ID of multi sig wallet"
        );
        owner = multisigWallet;

        // Check token decimals compatibility
        try IERC20Metadata(oldTokenAddress).decimals() returns (uint8 oldDecimals) {
            try IERC20Metadata(newTokenAddress).decimals() returns (uint8 newDecimals) {
                require(oldDecimals == newDecimals, "TokenSwap: Token decimals mismatch");
            } catch {
                revert("TokenSwap: New token does not implement decimals");
            }
        } catch {
            revert("TokenSwap: Old token does not implement decimals");
        }
    }

    /**
     * @notice Transfers ownership of the contract to a new MultiSig wallet
     * @param newOwner The address of the new MultiSig wallet owner
     * @dev Only callable by the current owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "TokenSwap: New owner is zero address");
        require(
            IMultiSigWallet(newOwner).supportsInterface(type(IMultiSigWallet).interfaceId),
            "TokenSwap: Invalid interface ID of new multi sig wallet"
        );

        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @dev Checks if an address contains contract code
     * @param addr The address to check
     * @return bool True if the address contains contract code
     */
    function isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    /**
     * @notice Allows the owner to pause the contract
     * @dev Only callable by the contract owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Allows the owner to unpause the contract
     * @dev Only callable by the contract owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Swaps old tokens for new tokens
     * @dev The function will:
     * 1. Transfer old tokens from the user to this contract
     * 2. Transfer new tokens to the user
     * 3. Burn the old tokens
     * If any step fails, the transaction will be reverted and old tokens returned
     * @param amount The amount of tokens to swap
     */
    function swap(uint256 amount) external whenNotPaused nonReentrant {
        // Gas optimization: Check zero amount first (cheap check)
        require(amount > 0, "TokenSwap: Amount must be greater than 0");

        // Gas optimization: Check allowance before balance (cheap check)
        uint256 allowance = oldToken.allowance(msg.sender, address(this));
        require(allowance >= amount, "TokenSwap: Insufficient allowance");

        // Gas optimization: Check new token balance
        uint256 newTokenBalance = newToken.balanceOf(address(this));
        require(newTokenBalance >= amount, "TokenSwap: Insufficient new token balance");

        // Transfer old token directly to BURN_ADDRESS
        bool oldTokenTransferSuccess = oldToken.transferFrom(msg.sender, BURN_ADDRESS, amount);
        require(oldTokenTransferSuccess, "TokenSwap: Old token transfer failed");

        // Transfer new token to user
        bool newTokenTransferSuccess = newToken.transfer(msg.sender, amount);
        require(newTokenTransferSuccess, "TokenSwap: New token transfer failed");

        // Gas optimization: Emit events at the end in the correct order
        emit TokenSwapped(msg.sender, amount); // Emit the successful swap
    }

    /**
     * @notice Emergency function to rescue tokens stuck in the contract
     * @dev Only callable by the contract owner
     * @param token The address of the token to rescue
     * @param amount The amount of tokens to rescue
     * @param to The address to send the rescued tokens to
     */
    function rescueTokens(address token, uint256 amount, address to) external onlyOwner nonReentrant {
        require(token != address(0), "TokenSwap: Token address is zero");
        require(to != address(0), "TokenSwap: Recipient address is zero");
        require(amount > 0, "TokenSwap: Amount must be greater than 0");

        IERC20 tokenContract = IERC20(token);
        require(tokenContract.balanceOf(address(this)) >= amount, "TokenSwap: Insufficient token balance");

        bool success = tokenContract.transfer(to, amount);
        require(success, "TokenSwap: Token rescue failed");
    }
}
