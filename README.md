# BOSAGORA Smart Contracts

This repository contains smart contracts for the BOSAGORA ecosystem.

## Project Structure

```
bosagora-erc20/
├── packages/
│   ├── contracts/                 # Main contracts package
│   │   ├── contracts/            # Solidity contracts
│   │   │   ├── BOSAGORA.sol     # Main token contract
│   │   │   ├── TokenSwap.sol    # Token swap contract
│   │   │   └── MockERC20.sol    # Mock token for testing
│   │   ├── test/                # Test files
│   │   ├── deploy/              # Deployment scripts
│   │   └── hardhat.config.ts    # Hardhat configuration
│   └── library/                 # Shared libraries
├── .github/                     # GitHub configuration
└── active_contracts.json        # Active contract addresses
```

## Projects

### 1. BOSAGORA Token
The main token contract implementing the BOSAGORA (BOA) token.

**Features:**
- Fixed maximum supply of 4.95 billion BOA tokens
- 7 decimal places
- MultiSig wallet ownership
- Controlled minting functionality
- Ownership transfer capability
- ReentrancyGuard protection

**Contract:** `packages/contracts/contracts/BOSAGORA.sol`

### 2. TokenSwap
A contract for swapping old tokens for new tokens with a burning mechanism.

**Features:**
- 1:1 token swap ratio
- Burning mechanism for old tokens
- MultiSig wallet ownership
- Pausable functionality
- Token rescue capability
- ReentrancyGuard protection
- Decimals compatibility check

**Contract:** `packages/contracts/contracts/TokenSwap.sol`

## Security Features

All contracts implement the following security measures:
- ReentrancyGuard implementation to prevent reentrancy attacks
- MultiSig wallet ownership for enhanced security
- Pausable functionality where applicable
- Safe token transfer and burning mechanisms
- Clear error messages and rollback capabilities
- Gas-optimized implementation

## Technical Details

### Dependencies
- OpenZeppelin Contracts
- MultiSig Wallet Contracts

### Solidity Version
- ^0.8.2

### Key Components
- ERC20 implementation
- ReentrancyGuard
- Pausable
- MultiSig wallet integration

## Development

### Prerequisites
- Node.js
- npm or yarn
- Hardhat

### Installation
```bash
# Install root dependencies
npm install

# Install contracts package dependencies
cd packages/contracts
npm install
```

### Testing
```bash
cd packages/contracts
npx hardhat test
```

### Compilation
```bash
cd packages/contracts
npx hardhat compile
```

## Contract Addresses

### Mainnet
- BOSAGORA Token: [Address to be added]
- TokenSwap Contract: [Address to be added]

### Testnet
- BOSAGORA Token: [Address to be added]
- TokenSwap Contract: [Address to be added]

## License

MIT License

## Author

BOSAGORA Foundation
