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

## Audit Report

The latest security audit is available at `packages/contracts/audit/REP-final-20250514T025615Z.pdf`.

## Security Audit

**Auditor:** CertiK  
**Audit Date:** May 13, 2025  
**Report Status:** ✅ All Findings Resolved

### Audit Summary
The BOSAGORA Token contract was assessed through Formal Verification, Manual Review, and Static Analysis. The report confirmed **0 Critical** and **0 Major** findings across the audited surface.

| Category | Count | Status |
| :--- | :---: | :--- |
| **Critical** | **0** | - |
| **Major** | **0** | - |
| Medium | 0 | - |
| Minor | 3 | ✅ Resolved |
| Centralization | 2 | ✅ Removed (Fixed) |
| **Total Findings** | **5** | **All Resolved** |

### Key Security Improvements
* **Decentralization:** Removed privileged accounts, ownership controls, and administrative functions to preserve a permissionless design.
* **Token Distribution:** Added a clear 128-year distribution schedule and Multi-Signature Wallet controls to remove single points of failure.
* **Compatibility:** Re-verified ERC20 compliance to ensure interoperability with exchanges and DeFi tooling.

> For more details, please refer to the full audit report.

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
- BOSAGORA Token: [0xc65A680ed408Ff0987a4f751F1999c96dB597482]
- TokenSwap Contract: [0xB96E55C18Dd7578Af2726F87627c8aDe4088E52d]

### Testnet
- BOSAGORA Token: [0x0195a6DD3Aa109567bb38958D48a86b3A08BC48b]
- TokenSwap Contract: [0x84ED8636b5F613fb30D6906320302467686fEDEE]

## License

MIT License

## Author

BOSAGORA Foundation
