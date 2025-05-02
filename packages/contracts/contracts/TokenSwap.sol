// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title TokenSwap
 * @dev A contract for swapping old tokens for new tokens with burning mechanism.
 * This contract is immutable and permissionless after deployment.
 * @notice This contract allows users to swap their old tokens for new tokens at a 1:1 ratio.
 * @author BOSAGORA Foundation
 */
contract TokenSwap is ReentrancyGuard {
    /// @dev The address where old tokens will be burned
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @dev The old token contract
    IERC20 public immutable oldToken;

    /// @dev The new token contract
    IERC20 public immutable newToken;

    /**
     * @notice Emitted when tokens are swapped successfully.
     * @param user The address of the user who swapped tokens.
     * @param amount The amount of tokens that were swapped.
     */
    event TokenSwapped(address indexed user, uint256 amount);

    /**
     * @notice Contract constructor.
     * @param oldTokenAddress Address of the old token contract.
     * @param newTokenAddress Address of the new token contract.
     * @dev Validates token contracts and checks decimals compatibility.
     */
    constructor(address oldTokenAddress, address newTokenAddress) {
        require(oldTokenAddress != address(0), "TokenSwap: Old token is zero address");
        require(newTokenAddress != address(0), "TokenSwap: New token is zero address");

        // Initialize token contracts
        oldToken = IERC20(oldTokenAddress);
        newToken = IERC20(newTokenAddress);

        // Validate that the contracts actually exist and implement ERC20
        require(isContract(oldTokenAddress), "TokenSwap: Old token address is not a contract");
        require(isContract(newTokenAddress), "TokenSwap: New token address is not a contract");

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
     * @notice Swaps old tokens for new tokens.
     * @dev Transfers `amount` of old tokens from `msg.sender` directly to the BURN_ADDRESS
     * and transfers the same `amount` of new tokens from this contract to `msg.sender`.
     * Reverts if any transfer fails or checks do not pass.
     * @param amount The amount of tokens to swap.
     */
    function swap(uint256 amount) external nonReentrant {
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

        // Emit the successful swap event
        emit TokenSwapped(msg.sender, amount);
    }
}
