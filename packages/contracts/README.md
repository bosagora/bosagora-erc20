# BOSAGORA Token and TokenSwap Contracts

This repository contains the smart contracts for the BOSAGORA (BOA) token and its token swap functionality.

## Overview

The project consists of two main contracts:

1. **BOSAGORA.sol**: The main token contract implementing the BOSAGORA (BOA) token
2. **TokenSwap.sol**: A contract for swapping old tokens for new tokens with a burning mechanism

## Features

### BOSAGORA Token

-   Fixed maximum supply of 4.95 billion BOA tokens
-   7 decimal places
-   MultiSig wallet ownership
-   Controlled minting functionality
-   Ownership transfer capability
-   ReentrancyGuard protection

### TokenSwap Contract

-   1:1 token swap ratio
-   Burning mechanism for old tokens
-   MultiSig wallet ownership
-   Pausable functionality
-   Token rescue capability
-   ReentrancyGuard protection
-   Decimals compatibility check

## Security Features

-   ReentrancyGuard implementation to prevent reentrancy attacks
-   MultiSig wallet ownership for enhanced security
-   Pausable functionality for emergency situations
-   Safe token transfer and burning mechanisms
-   Clear error messages and rollback capabilities
-   Gas-optimized implementation

## Technical Details

### Dependencies

-   OpenZeppelin Contracts
-   MultiSig Wallet Contracts

### Solidity Version

-   ^0.8.2

### Key Components

-   ERC20 implementation
-   ReentrancyGuard
-   Pausable (TokenSwap)
-   MultiSig wallet integration

## Development

### Prerequisites

-   Node.js
-   npm or yarn
-   Hardhat

### Installation

```bash
npm install
# or
yarn install
```

### Testing

```bash
npx hardhat test
```

### Compilation

```bash
npx hardhat compile
```

## Contract Addresses

-   BOSAGORA Token: [Address to be added]
-   TokenSwap Contract: [Address to be added]

## License

MIT License

## Author

BOSAGORA Foundation
