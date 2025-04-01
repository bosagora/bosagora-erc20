// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title TokenSwap
 * @dev A contract for swapping old tokens for new tokens with burning mechanism
 * @notice This contract allows users to swap their old tokens for new tokens at a 1:1 ratio
 * @author BOSAGORA Foundation
 */
contract TokenSwap is Pausable, Ownable {
    /// @notice The address where old tokens will be burned
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @notice The old token contract
    IERC20 public immutable oldToken;

    /// @notice The new token contract
    IERC20 public immutable newToken;

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
     * @notice Contract constructor
     * @param _oldToken Address of the old token contract
     * @param _newToken Address of the new token contract
     * @dev Validates token contracts and checks decimals compatibility
     */
    constructor(address _oldToken, address _newToken) {
        require(_oldToken != address(0), "TokenSwap: Old token is zero address");
        require(_newToken != address(0), "TokenSwap: New token is zero address");

        // Initialize token contracts
        oldToken = IERC20(_oldToken);
        newToken = IERC20(_newToken);

        // Validate that the contracts actually exist and implement ERC20
        require(isContract(_oldToken), "TokenSwap: Old token address is not a contract");
        require(isContract(_newToken), "TokenSwap: New token address is not a contract");

        // Check token decimals compatibility
        try IERC20Metadata(_oldToken).decimals() returns (uint8 oldDecimals) {
            try IERC20Metadata(_newToken).decimals() returns (uint8 newDecimals) {
                require(oldDecimals == newDecimals, "TokenSwap: Token decimals mismatch");
            } catch {
                revert("TokenSwap: New token does not implement decimals");
            }
        } catch {
            revert("TokenSwap: Old token does not implement decimals");
        }
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
    function swap(uint256 amount) external whenNotPaused {
        // Gas optimization: Check zero amount first (cheap check)
        require(amount > 0, "TokenSwap: Amount must be greater than 0");

        // Gas optimization: Check allowance before balance (cheap check)
        uint256 allowance = oldToken.allowance(msg.sender, address(this));
        require(allowance >= amount, "TokenSwap: Insufficient allowance");

        // Gas optimization: Check new token balance
        uint256 newTokenBalance = newToken.balanceOf(address(this));
        require(newTokenBalance >= amount, "TokenSwap: Insufficient new token balance");

        // Transfer old token from user
        bool oldTokenTransferSuccess = oldToken.transferFrom(msg.sender, address(this), amount);
        if (!oldTokenTransferSuccess) {
            revert("TokenSwap: Old token transfer failed");
        }

        // Check if new token transfer would succeed before burning
        bool newTokenTransferSuccess = newToken.transfer(msg.sender, amount);
        if (!newTokenTransferSuccess) {
            // If new token transfer fails, return old token to user
            require(oldToken.transfer(msg.sender, amount), "TokenSwap: Failed to return old token");
            revert("TokenSwap: New token transfer failed");
        }

        // Only burn old token after confirming new token transfer success
        bool burnSuccess = oldToken.transfer(BURN_ADDRESS, amount);
        if (!burnSuccess) {
            // If burning fails, return old token to user
            require(oldToken.transfer(msg.sender, amount), "TokenSwap: Failed to return old token");
            revert("TokenSwap: Burning old token failed");
        }

        // Gas optimization: Emit events at the end in the correct order
        emit TokenSwapped(msg.sender, amount); // First emit the successful swap
        emit OldTokenBurned(msg.sender, amount); // Then emit the burning of old tokens
    }

    /**
     * @notice Emergency function to rescue tokens stuck in the contract
     * @dev Only callable by the contract owner
     * @param token The address of the token to rescue
     * @param amount The amount of tokens to rescue
     * @param to The address to send the rescued tokens to
     */
    function rescueTokens(address token, uint256 amount, address to) external onlyOwner {
        require(token != address(0), "TokenSwap: Token address is zero");
        require(to != address(0), "TokenSwap: Recipient address is zero");
        require(amount > 0, "TokenSwap: Amount must be greater than 0");

        // Prevent rescue of tokens involved in the swap
        require(token != address(oldToken) && token != address(newToken), "TokenSwap: Cannot rescue swap tokens");

        IERC20 tokenContract = IERC20(token);
        require(tokenContract.balanceOf(address(this)) >= amount, "TokenSwap: Insufficient token balance");

        bool success = tokenContract.transfer(to, amount);
        require(success, "TokenSwap: Token rescue failed");
    }
}
