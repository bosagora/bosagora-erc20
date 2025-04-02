import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "solidity-docgen";

import * as dotenv from "dotenv";
import { Wallet } from "ethers";
import { HardhatAccount } from "./src/HardhatAccount";

dotenv.config({ path: "env/.env" });

function getAccounts() {
    const accounts: string[] = [];
    const reg_bytes64: RegExp = /^(0x)[0-9a-f]{64}$/i;
    if (
        process.env.DEPLOYER_MULTISIG !== undefined &&
        process.env.DEPLOYER_MULTISIG.trim() !== "" &&
        reg_bytes64.test(process.env.DEPLOYER_MULTISIG)
    ) {
        accounts.push(process.env.DEPLOYER_MULTISIG);
    } else {
        process.env.DEPLOYER_MULTISIG = Wallet.createRandom().privateKey;
        accounts.push(process.env.DEPLOYER_MULTISIG);
    }
    if (
        process.env.DEPLOYER !== undefined &&
        process.env.DEPLOYER.trim() !== "" &&
        reg_bytes64.test(process.env.DEPLOYER)
    ) {
        accounts.push(process.env.DEPLOYER);
    } else {
        process.env.DEPLOYER = Wallet.createRandom().privateKey;
        accounts.push(process.env.DEPLOYER);
    }

    if (
        process.env.TOKEN_OWNER1 !== undefined &&
        process.env.TOKEN_OWNER1.trim() !== "" &&
        reg_bytes64.test(process.env.TOKEN_OWNER1)
    ) {
        accounts.push(process.env.TOKEN_OWNER1);
    } else {
        process.env.TOKEN_OWNER1 = Wallet.createRandom().privateKey;
        accounts.push(process.env.TOKEN_OWNER1);
    }

    if (
        process.env.TOKEN_OWNER2 !== undefined &&
        process.env.TOKEN_OWNER2.trim() !== "" &&
        reg_bytes64.test(process.env.TOKEN_OWNER2)
    ) {
        accounts.push(process.env.TOKEN_OWNER2);
    } else {
        process.env.TOKEN_OWNER2 = Wallet.createRandom().privateKey;
        accounts.push(process.env.TOKEN_OWNER2);
    }

    if (
        process.env.TOKEN_OWNER3 !== undefined &&
        process.env.TOKEN_OWNER3.trim() !== "" &&
        reg_bytes64.test(process.env.TOKEN_OWNER3)
    ) {
        accounts.push(process.env.TOKEN_OWNER3);
    } else {
        process.env.TOKEN_OWNER3 = Wallet.createRandom().privateKey;
        accounts.push(process.env.TOKEN_OWNER3);
    }

    while (accounts.length < 50) {
        accounts.push(Wallet.createRandom().privateKey);
    }

    if (HardhatAccount.keys.length === 0) {
        for (const account of accounts) {
            HardhatAccount.keys.push(account);
        }
    }

    return accounts;
}

function getTestAccounts() {
    const defaultBalance = "2000000000000000000000000";
    const acc = getAccounts();
    return acc.map((m) => {
        return {
            privateKey: m,
            balance: defaultBalance,
        };
    });
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config = {
    solidity: {
        compilers: [
            {
                version: "0.8.2",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 2000,
                    },
                },
            },
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            accounts: getTestAccounts(),
            gas: 8000000,
            gasPrice: 8000000000,
            blockGasLimit: 8000000,
        },
        standalone: {
            url: process.env.URL_STANDALONE,
            accounts: getAccounts(),
            chainId: 24680,
        },
        ethereum: {
            url: process.env.ETHEREUM_URL || "",
            chainId: 1,
            accounts: getAccounts(),
        },
        sepolia: {
            url: process.env.SEPOLIA_URL || "",
            chainId: 11155111,
            accounts: getAccounts(),
        },
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
    },
};

export default config;
