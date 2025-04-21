import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";

import { HardhatAccount } from "../src/HardhatAccount";
import { BOAToken } from "../src/utils/Amount";
import { ContractUtils } from "../src/utils/ContractUtils";
import { BOSAGORA, MockERC20, MultiSigWallet, MultiSigWalletFactory, TokenSwap } from "../typechain-types";

import fs from "fs";
import { BaseContract, BigNumber, Wallet } from "ethers";
import { AddressZero } from "@ethersproject/constants";

interface IChainInfo {
    multisigWalletFactoryAddress: string;
    multisigWalletAddress: string;
    swapSupply: BigNumber;
    additionalSupply: BigNumber;
    bridgeAddress: string;
    oldBOATokenAddress: string;
}

export const CHAIN_INFORMATION: { [key: string]: IChainInfo } = {
    1: {
        multisigWalletFactoryAddress: AddressZero,
        multisigWalletAddress: AddressZero,
        swapSupply: BOAToken.make(450_000_000).value,
        additionalSupply: BOAToken.make(450_000_000).value,
        bridgeAddress: AddressZero,
        oldBOATokenAddress: "0x746DdA2ea243400D5a63e0700F190aB79f06489e",
    },
    24680: {
        multisigWalletFactoryAddress: AddressZero,
        multisigWalletAddress: AddressZero,
        swapSupply: BOAToken.make(450_000_000).value,
        additionalSupply: BOAToken.make(800_000_000).value,
        bridgeAddress: "0xEC2F78F41fD1BfF65f9f6f6C60Be738719B18488",
        oldBOATokenAddress: AddressZero,
    },
};

interface IDeployedContract {
    name: string;
    address: string;
    contract: BaseContract;
}

interface IAccount {
    deployerMultisig: Wallet;
    deployer: Wallet;
    tokenOwners: Wallet[];
}

type FnDeployer = (accounts: IAccount, deployment: Deployments) => Promise<any>;

class Deployments {
    public deployments: Map<string, IDeployedContract>;
    public deployers: FnDeployer[];
    public accounts: IAccount;
    public chainId: number;

    public requiredMultiSigWallet: number = 2;

    constructor(chainId: number) {
        console.log("ChainId: ", chainId);

        this.chainId = chainId;
        this.deployments = new Map<string, IDeployedContract>();
        this.deployers = [];

        const raws = HardhatAccount.keys.map((m) => new Wallet(m, ethers.provider));
        const [deployerMultisig, deployer, tokenOwner1, tokenOwner2, tokenOwner3] = raws;

        this.accounts = {
            deployerMultisig,
            deployer,
            tokenOwners: [tokenOwner1, tokenOwner2, tokenOwner3],
        };
    }

    public addContract(name: string, address: string, contract: BaseContract) {
        this.deployments.set(name, {
            name,
            address,
            contract,
        });
    }

    public getContract(name: string): BaseContract | undefined {
        const info = this.deployments.get(name);
        if (info !== undefined) {
            return info.contract;
        } else {
            return undefined;
        }
    }

    public getContractAddress(name: string): string | undefined {
        const info = this.deployments.get(name);
        if (info !== undefined) {
            return info.address;
        } else {
            return undefined;
        }
    }

    public addDeployer(deployer: FnDeployer) {
        this.deployers.push(deployer);
    }

    public async doDeploy() {
        for (const elem of this.deployers) {
            try {
                await elem(this.accounts, this);
            } catch (error) {
                console.log(error);
            }
        }
    }

    static filename = "./deploy/deployed_contracts.json";

    public saveContractInfo() {
        const contents: any = {};
        for (const key of this.deployments.keys()) {
            const item = this.deployments.get(key);
            if (item !== undefined) {
                contents[key] = item.address;
            }
        }
        fs.writeFileSync(Deployments.filename, JSON.stringify(contents), "utf-8");
    }
}

async function deployMultiSigWalletFactory(accounts: IAccount, deployment: Deployments) {
    const contractName = "MultiSigWalletFactory";
    if (CHAIN_INFORMATION[deployment.chainId].multisigWalletFactoryAddress === AddressZero) {
        console.log(`Deploy ${contractName}...`);
        const factory = await ethers.getContractFactory("MultiSigWalletFactory");
        const contract = (await factory.connect(accounts.deployerMultisig).deploy()) as MultiSigWalletFactory;
        await contract.deployed();
        await contract.deployTransaction.wait();

        deployment.addContract(contractName, contract.address, contract);
        console.log(`Deployed ${contractName} to ${contract.address}`);
    } else {
        console.log(`Attach ${contractName}...`);
        const factory = await ethers.getContractFactory("MultiSigWalletFactory");
        const contract = factory.attach(CHAIN_INFORMATION[deployment.chainId].multisigWalletFactoryAddress);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Attached ${contractName} to ${contract.address}`);
    }
}

async function deployMultiSigWallet(accounts: IAccount, deployment: Deployments): Promise<MultiSigWallet | undefined> {
    const contractName = "MultiSigWallet";
    if (CHAIN_INFORMATION[deployment.chainId].multisigWalletAddress === AddressZero) {
        console.log(`Deploy ${contractName}...`);
        if (deployment.getContract("MultiSigWalletFactory") === undefined) {
            console.error("Contract is not deployed!");
            return;
        }

        const factoryContract = deployment.getContract("MultiSigWalletFactory") as MultiSigWalletFactory;
        const address = await ContractUtils.getEventValueString(
            await factoryContract.connect(accounts.deployerMultisig).create(
                "OwnerWallet",
                "",
                deployment.accounts.tokenOwners.map((m) => m.address),
                deployment.requiredMultiSigWallet,
                1
            ),
            factoryContract.interface,
            "ContractInstantiation",
            "wallet"
        );
        if (address !== undefined) {
            const contract = (await ethers.getContractFactory("MultiSigWallet")).attach(address) as MultiSigWallet;

            const owners = await contract.getMembers();
            for (let idx = 0; idx < owners.length; idx++) {
                console.log(`MultiSigWallet's owners[${idx}]: ${owners[idx]}`);
            }

            deployment.addContract(contractName, contract.address, contract);
            console.log(`Deployed ${contractName} to ${contract.address}`);
        } else {
            console.error(`Failed to deploy ${contractName}`);
        }
    } else {
        console.log(`Attach ${contractName}...`);
        const factory = await ethers.getContractFactory("MultiSigWallet");
        const contract = factory.attach(CHAIN_INFORMATION[deployment.chainId].multisigWalletAddress);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Attached ${contractName} to ${contract.address}`);
    }
}

async function deployOldBOAToken(accounts: IAccount, deployment: Deployments) {
    const contractName = "OldBOAToken";
    if (CHAIN_INFORMATION[deployment.chainId].oldBOATokenAddress === AddressZero) {
        console.log(`Deploy ${contractName}...`);
        if (deployment.getContract("MultiSigWallet") === undefined) {
            console.error("MultiSigWallet is not deployed!");
            return;
        }
        const factory = await ethers.getContractFactory("MockERC20");
        const contract = (await factory
            .connect(accounts.deployer)
            .deploy("BOSAGORA", "BOA", BOAToken.make(450_000_000).value)) as MockERC20;
        await contract.deployed();
        await contract.deployTransaction.wait();
        const balance = await contract.balanceOf(accounts.deployer.address);
        console.log(`OldBOA token's owner: ${accounts.deployer.address}`);
        console.log(`OldBOA token's balance of owner: ${new BOAToken(balance).toDisplayString(true, 2)}`);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Deployed ${contractName} to ${contract.address}`);
    } else {
        console.log(`Attach ${contractName}...`);
        const factory = await ethers.getContractFactory("MockERC20");
        const contract = factory.attach(CHAIN_INFORMATION[deployment.chainId].oldBOATokenAddress);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Attached ${contractName} to ${contract.address}`);
    }
}

async function deployNewBOAToken(accounts: IAccount, deployment: Deployments) {
    const contractName = "NewBOAToken";
    console.log(`Deploy ${contractName}...`);
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }
    const factory = await ethers.getContractFactory("BOSAGORA");
    const contract = (await factory
        .connect(accounts.deployer)
        .deploy(deployment.getContractAddress("MultiSigWallet"))) as BOSAGORA;
    await contract.deployed();
    await contract.deployTransaction.wait();
    const owner = await contract.owner();
    const balance = await contract.balanceOf(owner);
    console.log(`NewBOA token's owner: ${owner}`);
    console.log(`NewBOA token's balance of owner: ${new BOAToken(balance).toDisplayString(true, 2)}`);
    deployment.addContract(contractName, contract.address, contract);
    console.log(`Deployed ${contractName} to ${contract.address}`);
}

async function deployTokenSwap(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("OldBOAToken") === undefined) {
        console.error("OldBOAToken is not deployed!");
        return;
    }
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }

    const contractName = "TokenSwap";
    console.log(`Deploy ${contractName}...`);
    if (
        deployment.getContract("OldBOAToken") === undefined ||
        deployment.getContract("NewBOAToken") === undefined ||
        deployment.getContract("MultiSigWallet") === undefined
    ) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }

    const factory = await ethers.getContractFactory("TokenSwap");
    const contract = (await factory
        .connect(accounts.deployer)
        .deploy(
            deployment.getContractAddress("OldBOAToken"),
            deployment.getContractAddress("NewBOAToken"),
            deployment.getContractAddress("MultiSigWallet")
        )) as BOSAGORA;
    await contract.deployed();
    await contract.deployTransaction.wait();
    const owner = await contract.owner();
    console.log(`TokenSwap owner: ${owner}`);
    deployment.addContract(contractName, contract.address, contract);
    console.log(`Deployed ${contractName} to ${contract.address}`);
}

async function mintInitialSupplyToken(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }

    const totalSupply = CHAIN_INFORMATION[deployment.chainId].swapSupply.add(
        CHAIN_INFORMATION[deployment.chainId].additionalSupply
    );

    console.log(`Start Mint`);
    const contractName = "NewBOAToken";
    const contract = deployment.getContract("NewBOAToken") as BOSAGORA;
    const amount = new BOAToken(totalSupply);
    const wallet = deployment.getContract("MultiSigWallet") as MultiSigWallet;
    const encodedData = contract.interface.encodeFunctionData("mint", [wallet.address, amount.value]);
    const transactionId = await ContractUtils.getEventValueBigNumber(
        await wallet
            .connect(accounts.tokenOwners[0])
            .submitTransaction("Mint", `Mint ${amount.toDisplayString()}`, contract.address, 0, encodedData),
        wallet.interface,
        "Submission",
        "transactionId"
    );

    if (transactionId === undefined) {
        console.error(`Failed to submit transaction for token mint`);
    } else {
        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await wallet.connect(accounts.tokenOwners[1]).confirmTransaction(transactionId),
            wallet.interface,
            "Execution",
            "transactionId"
        );

        if (executedTransactionId === undefined || !transactionId.eq(executedTransactionId)) {
            console.error(`Failed to confirm transaction for token mint`);
        }
    }

    console.log(`Mint ${contractName} to ${wallet.address}`);
}

async function depositToTokenSwapContract(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }
    if (deployment.getContract("TokenSwap") === undefined) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }

    console.log(`Start Distribute`);
    const contractName = "NewBOAToken";
    const contract = deployment.getContract("NewBOAToken") as BOSAGORA;
    {
        const amount = new BOAToken(CHAIN_INFORMATION[deployment.chainId].swapSupply);
        const address: string = deployment.getContractAddress("TokenSwap") || AddressZero;
        const encodedData = contract.interface.encodeFunctionData("transfer", [address, amount.value]);
        const wallet = deployment.getContract("MultiSigWallet") as MultiSigWallet;
        const transactionId = await ContractUtils.getEventValueBigNumber(
            await wallet
                .connect(accounts.tokenOwners[0])
                .submitTransaction(
                    "Transfer",
                    `Transfer ${amount.toDisplayString()} to ${address}`,
                    contract.address,
                    0,
                    encodedData
                ),
            wallet.interface,
            "Submission",
            "transactionId"
        );

        if (transactionId === undefined) {
            console.error(`Failed to submit transaction for token transfer`);
        } else {
            const executedTransactionId = await ContractUtils.getEventValueBigNumber(
                await wallet.connect(accounts.tokenOwners[1]).confirmTransaction(transactionId),
                wallet.interface,
                "Execution",
                "transactionId"
            );

            if (executedTransactionId === undefined || !transactionId.eq(executedTransactionId)) {
                console.error(`Failed to confirm transaction for token transfer`);
            }
        }
    }

    console.log(`Distribute ${contractName}`);
}

async function depositToBridgeContract(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }

    const contract = deployment.getContract("NewBOAToken") as BOSAGORA;
    {
        const amount = new BOAToken(CHAIN_INFORMATION[deployment.chainId].additionalSupply);
        const address: string = CHAIN_INFORMATION[deployment.chainId].bridgeAddress;
        if (address !== AddressZero) {
            console.log(`Start Deposit to Bridge`);
            const encodedData = contract.interface.encodeFunctionData("transfer", [address, amount.value]);
            const wallet = deployment.getContract("MultiSigWallet") as MultiSigWallet;
            const transactionId = await ContractUtils.getEventValueBigNumber(
                await wallet
                    .connect(accounts.tokenOwners[0])
                    .submitTransaction(
                        "Transfer",
                        `Transfer ${amount.toDisplayString()} to ${address}`,
                        contract.address,
                        0,
                        encodedData
                    ),
                wallet.interface,
                "Submission",
                "transactionId"
            );

            if (transactionId === undefined) {
                console.error(`Failed to submit transaction for token transfer`);
            } else {
                const executedTransactionId = await ContractUtils.getEventValueBigNumber(
                    await wallet.connect(accounts.tokenOwners[1]).confirmTransaction(transactionId),
                    wallet.interface,
                    "Execution",
                    "transactionId"
                );

                if (executedTransactionId === undefined || !transactionId.eq(executedTransactionId)) {
                    console.error(`Failed to confirm transaction for token transfer`);
                }
            }
            console.log(`Stop Deposit to Bridge`);
        }
    }
}

async function report(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("OldBOAToken") === undefined) {
        console.error("OldBOAToken is not deployed!");
        return;
    }
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }
    if (deployment.getContract("TokenSwap") === undefined) {
        console.error("TokenSwap is not deployed!");
        return;
    }
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }

    const oldBOATokenContract = deployment.getContract("OldBOAToken") as MockERC20;
    const newBOATokenContract = deployment.getContract("NewBOAToken") as BOSAGORA;
    const TokenSwapContract = deployment.getContract("TokenSwap") as TokenSwap;
    const MultiSigWalletContract = deployment.getContract("MultiSigWallet") as MultiSigWallet;

    console.log(`Address`);
    console.log(`Old BOA: ${oldBOATokenContract.address}`);
    console.log(`New BOA: ${newBOATokenContract.address}`);
    console.log(`Token Swap: ${TokenSwapContract.address}`);

    const balance1 = await oldBOATokenContract.balanceOf(accounts.deployer.address);
    console.log(
        `Balance(Old BOA), deployer: ${new BOAToken(
            await oldBOATokenContract.balanceOf(accounts.deployer.address)
        ).toDisplayString(true, 2)}`
    );
    console.log(
        `Balance(Old BOA), wallet  : ${new BOAToken(
            await oldBOATokenContract.balanceOf(MultiSigWalletContract.address)
        ).toDisplayString(true, 2)}`
    );
    console.log(
        `Balance(Old BOA), swap    : ${new BOAToken(
            await oldBOATokenContract.balanceOf(TokenSwapContract.address)
        ).toDisplayString(true, 2)}`
    );
    console.log(
        `Balance(New BOA), deployer: ${new BOAToken(
            await newBOATokenContract.balanceOf(accounts.deployer.address)
        ).toDisplayString(true, 2)}`
    );
    console.log(
        `Balance(New BOA), wallet  : ${new BOAToken(
            await newBOATokenContract.balanceOf(MultiSigWalletContract.address)
        ).toDisplayString(true, 2)}`
    );
    console.log(
        `Balance(New BOA), swap    : ${new BOAToken(
            await newBOATokenContract.balanceOf(TokenSwapContract.address)
        ).toDisplayString(true, 2)}`
    );
    if (CHAIN_INFORMATION[deployment.chainId].bridgeAddress !== AddressZero)
        console.log(
            `Balance(New BOA), bridge  : ${new BOAToken(
                await newBOATokenContract.balanceOf(CHAIN_INFORMATION[deployment.chainId].bridgeAddress)
            ).toDisplayString(true, 2)}`
        );
}

async function main() {
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    const deployments = new Deployments(chainId);

    deployments.addDeployer(deployMultiSigWalletFactory);
    deployments.addDeployer(deployMultiSigWallet);
    deployments.addDeployer(deployOldBOAToken);
    deployments.addDeployer(deployNewBOAToken);
    deployments.addDeployer(deployTokenSwap);
    deployments.addDeployer(mintInitialSupplyToken);
    deployments.addDeployer(depositToTokenSwapContract);
    deployments.addDeployer(depositToBridgeContract);
    deployments.addDeployer(report);

    await deployments.doDeploy();

    deployments.saveContractInfo();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
