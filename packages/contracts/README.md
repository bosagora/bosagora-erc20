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

-   BOSAGORA Token: [0xc65A680ed408Ff0987a4f751F1999c96dB597482]
-   TokenSwap Contract: [0xB96E55C18Dd7578Af2726F87627c8aDe4088E52d]

## Audit Report

Latest audit report: `audit/REP-final-20250514T025615Z.pdf`

## Security Audit

**Auditor:** CertiK  
**Audit Date:** May 13, 2025  
**Report Status:** ✅ All Findings Resolved

### Audit Summary

Assessment covered Formal Verification, Manual Review, and Static Analysis. The BOSAGORA Token contract had **0 Critical** and **0 Major** issues.

| Category           | Count | Status             |
| :----------------- | :---: | :----------------- |
| **Critical**       | **0** | -                  |
| **Major**          | **0** | -                  |
| Medium             |   0   | -                  |
| Minor              |   3   | ✅ Resolved        |
| Centralization     |   2   | ✅ Removed (Fixed) |
| **Total Findings** | **5** | **All Resolved**   |

### Key Security Improvements

-   **Decentralization:** Removed privileged accounts and ownership controls to keep the contracts permissionless.
-   **Token Distribution:** Added a clear 128-year schedule and enforced Multi-Signature control.
-   **Compatibility:** Retested ERC20 compliance to ensure smooth integration with exchanges and DeFi protocols.

> See the full report in `audit/REP-final-20250514T025615Z.pdf`.

## License

MIT License

## Author

BOSAGORA Foundation
