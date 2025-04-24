import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";

import { HardhatAccount } from "../src/HardhatAccount";
import { BOAToken } from "../src/utils/Amount";
import { ContractUtils } from "../src/utils/ContractUtils";
import {
    BOSAGORA,
    MockERC20,
    MultiSigWallet,
    MultiSigWalletFactory,
    TimelockController,
    TokenSwap,
} from "../typechain-types";

import fs from "fs";
import { BaseContract, BigNumber, Wallet } from "ethers";
import { AddressZero } from "@ethersproject/constants";

interface IChainInfo {
    multisigWalletFactoryAddress: string;
    multisigWalletAddress: string;
    cancellerMultisigWalletAddress: string;
    swapSupply: BigNumber;
    additionalSupply: BigNumber;
    bridgeAddress: string;
    oldBOATokenAddress: string;
    newBOATokenAddress: string;
    tokenSwapAddress: string;
    timelockControllerAddress: string;
}

export const CHAIN_INFORMATION: { [key: string]: IChainInfo } = {
    24680: {
        multisigWalletFactoryAddress: AddressZero,
        multisigWalletAddress: AddressZero,
        cancellerMultisigWalletAddress: AddressZero,
        swapSupply: BOAToken.make("450_000_000").value,
        additionalSupply: BOAToken.make("1_076_755_093").value,
        bridgeAddress: AddressZero, //"0xEC2F78F41fD1BfF65f9f6f6C60Be738719B18488",
        oldBOATokenAddress: AddressZero,
        newBOATokenAddress: AddressZero,
        tokenSwapAddress: AddressZero,
        timelockControllerAddress: AddressZero,
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
    tokenMembers: Wallet[];
}

type FnDeployer = (accounts: IAccount, deployment: Deployments) => Promise<any>;

class Deployments {
    public deployments: Map<string, IDeployedContract>;
    public deployers: FnDeployer[];
    public accounts: IAccount;
    public chainId: number;
    public minDelay = 10;
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
            tokenMembers: [tokenOwner1, tokenOwner2, tokenOwner3],
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
                deployment.accounts.tokenMembers.map((m) => m.address),
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
                console.log(`MultiSigWallet's members[${idx}]: ${owners[idx]}`);
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

async function deployCancellerMultiSigWallet(
    accounts: IAccount,
    deployment: Deployments
): Promise<MultiSigWallet | undefined> {
    const contractName = "CancellerMultiSigWallet";
    if (CHAIN_INFORMATION[deployment.chainId].cancellerMultisigWalletAddress === AddressZero) {
        console.log(`Deploy ${contractName}...`);
        if (deployment.getContract("MultiSigWalletFactory") === undefined) {
            console.error("Contract is not deployed!");
            return;
        }

        const factoryContract = deployment.getContract("MultiSigWalletFactory") as MultiSigWalletFactory;
        const address = await ContractUtils.getEventValueString(
            await factoryContract.connect(accounts.deployerMultisig).create(
                "Canceller",
                "",
                deployment.accounts.tokenMembers.map((m) => m.address),
                deployment.requiredMultiSigWallet,
                2
            ),
            factoryContract.interface,
            "ContractInstantiation",
            "wallet"
        );
        if (address !== undefined) {
            const contract = (await ethers.getContractFactory("MultiSigWallet")).attach(address) as MultiSigWallet;

            const owners = await contract.getMembers();
            for (let idx = 0; idx < owners.length; idx++) {
                console.log(`CancellerMultiSigWallet's members[${idx}]: ${owners[idx]}`);
            }

            deployment.addContract(contractName, contract.address, contract);
            console.log(`Deployed ${contractName} to ${contract.address}`);
        } else {
            console.error(`Failed to deploy ${contractName}`);
        }
    } else {
        console.log(`Attach ${contractName}...`);
        const factory = await ethers.getContractFactory("MultiSigWallet");
        const contract = factory.attach(CHAIN_INFORMATION[deployment.chainId].cancellerMultisigWalletAddress);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Attached ${contractName} to ${contract.address}`);
    }
}

async function reportMultisigWallet(accounts: IAccount, deployment: Deployments) {
    const factoryContract = deployment.getContract("MultiSigWalletFactory") as MultiSigWalletFactory;
    const multisigWalletContract = deployment.getContract("MultiSigWallet") as MultiSigWallet;
    console.log(`Contract Address`);
    console.log(`MultiSigWalletFactory BOA: ${factoryContract.address}`);
    console.log(`\nMultiSigWallet BOA: ${multisigWalletContract.address}`);

    let name = await multisigWalletContract.name();
    console.log("Contract name:", name);

    let creator = await multisigWalletContract.creator();
    console.log("Contract creator:", creator);

    let required = await multisigWalletContract.getRequired();
    console.log("Required confirmations:", required.toString());
    // Get the list of members
    console.log("Checking member list...");
    let members = await multisigWalletContract.getMembers();
    console.log("Total members:", members.length);
    console.log("Member addresses:");
    for (let i = 0; i < members.length; i++) {
        const isOwner = await multisigWalletContract.isOwner(members[i]);
        console.log(`${i + 1}. ${members[i]} (Active: ${isOwner})`);
    }

    const cancellerMultisigWalletContract = deployment.getContract("CancellerMultiSigWallet") as MultiSigWallet;
    console.log(`\nCanceller      BOA: ${cancellerMultisigWalletContract.address}`);
    name = await cancellerMultisigWalletContract.name();
    console.log("Contract name:", name);
    creator = await cancellerMultisigWalletContract.creator();
    console.log("Contract creator:", creator);
    required = await cancellerMultisigWalletContract.getRequired();
    console.log("Required confirmations:", required.toString());
    // Get the list of members
    console.log("Checking member list...");
    members = await cancellerMultisigWalletContract.getMembers();
    console.log("Total members:", members.length);
    console.log("Member addresses:");
    for (let i = 0; i < members.length; i++) {
        const isOwner = await cancellerMultisigWalletContract.isOwner(members[i]);
        console.log(`${i + 1}. ${members[i]} (Active: ${isOwner})`);
    }
}

async function deployTimelockController(accounts: IAccount, deployment: Deployments) {
    const contractName = "TimelockController";
    if (CHAIN_INFORMATION[deployment.chainId].timelockControllerAddress === AddressZero) {
        if (deployment.getContract("MultiSigWallet") === undefined) {
            console.error("MultiSigWallet is not deployed!");
            return;
        }
        console.log(`Deploy ${contractName}...`);

        const multiSigWalletContract = deployment.getContract("MultiSigWallet") as MultiSigWallet;
        const cancellerContract = deployment.getContract("CancellerMultiSigWallet") as MultiSigWallet;

        const factory = await ethers.getContractFactory("TimelockController");
        const timelockController = (await factory
            .connect(accounts.deployer)
            .deploy(deployment.minDelay, [], [], accounts.deployer.address)) as TimelockController;
        await timelockController.deployed();
        await timelockController.deployTransaction.wait();
        deployment.addContract(contractName, timelockController.address, timelockController);
        console.log(`Deployed ${contractName} to ${timelockController.address}`);

        // Get role hashes
        const PROPOSER_ROLE = await timelockController.PROPOSER_ROLE();
        const EXECUTOR_ROLE = await timelockController.EXECUTOR_ROLE();
        const CANCELLER_ROLE = await timelockController.CANCELLER_ROLE(); // Added Canceller Role
        const ADMIN_ROLE = await timelockController.TIMELOCK_ADMIN_ROLE(); // Correct role for admin

        // Grant PROPOSER_ROLE to MultiSig Wallet
        console.log(`Granting PROPOSER_ROLE to ${multiSigWalletContract.address}...`);
        let tx = await timelockController.grantRole(PROPOSER_ROLE, multiSigWalletContract.address);
        console.log(`  Transaction hash: ${tx.hash}`);
        await tx.wait();
        console.log(`PROPOSER_ROLE granted to ${multiSigWalletContract.address}.`);

        // Grant EXECUTOR_ROLE to MultiSig Wallet
        console.log(`Granting EXECUTOR_ROLE to ${multiSigWalletContract.address}...`);
        tx = await timelockController.grantRole(EXECUTOR_ROLE, multiSigWalletContract.address);
        console.log(`  Transaction hash: ${tx.hash}`);
        await tx.wait();
        console.log(`EXECUTOR_ROLE granted to ${multiSigWalletContract.address}.`);

        // Grant CANCELLER_ROLE to MultiSig Wallet
        console.log(`Granting CANCELLER_ROLE to ${cancellerContract.address}...`);
        tx = await timelockController.grantRole(CANCELLER_ROLE, cancellerContract.address);
        console.log(`  Transaction hash: ${tx.hash}`);
        await tx.wait();
        console.log(`CANCELLER_ROLE granted to ${cancellerContract.address}.`);

        // Revoke ADMIN_ROLE to deployer
        console.log(`Revoking ADMIN_ROLE to ${accounts.deployer.address}...`);
        tx = await timelockController.revokeRole(ADMIN_ROLE, accounts.deployer.address);
        console.log(`  Transaction hash: ${tx.hash}`);
        await tx.wait();
        console.log(`ADMIN_ROLE revoked to ${accounts.deployer.address}.`);
    } else {
        console.log(`Attach ${contractName}...`);
        const factory = await ethers.getContractFactory("TimelockController");
        const contract = factory.attach(CHAIN_INFORMATION[deployment.chainId].timelockControllerAddress);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Attached ${contractName} to ${contract.address}`);
    }
}

async function reportRollOfTimelockController(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }
    if (deployment.getContract("TimelockController") === undefined) {
        console.error("TimelockController is not deployed!");
        return;
    }

    const timelockController = deployment.getContract("TimelockController") as TimelockController;
    const multiSigWallet = deployment.getContract("MultiSigWallet") as MultiSigWallet;

    const PROPOSER_ROLE = await timelockController.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelockController.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelockController.CANCELLER_ROLE(); // Added Canceller Role
    const ADMIN_ROLE = await timelockController.TIMELOCK_ADMIN_ROLE(); // Correct role for admin

    console.log(`Report Roll of TimelockController`);
    console.log(`For MultiSigWallet ${multiSigWallet.address}`);
    console.log(`MultiSigWallet-ADMIN_ROLE: ${await timelockController.hasRole(ADMIN_ROLE, multiSigWallet.address)}`);
    console.log(
        `MultiSigWallet-PROPOSER_ROLE: ${await timelockController.hasRole(PROPOSER_ROLE, multiSigWallet.address)}`
    );
    console.log(
        `MultiSigWallet-EXECUTOR_ROLE: ${await timelockController.hasRole(EXECUTOR_ROLE, multiSigWallet.address)}`
    );
    console.log(
        `MultiSigWallet-CANCELLER_ROLE: ${await timelockController.hasRole(CANCELLER_ROLE, multiSigWallet.address)}`
    );

    const canceller = deployment.getContract("CancellerMultiSigWallet") as MultiSigWallet;
    console.log(`For CancellerMultiSigWallet ${canceller.address}`);
    console.log(`Canceller-ADMIN_ROLE: ${await timelockController.hasRole(ADMIN_ROLE, canceller.address)}`);
    console.log(`Canceller-PROPOSER_ROLE: ${await timelockController.hasRole(PROPOSER_ROLE, canceller.address)}`);
    console.log(`Canceller-EXECUTOR_ROLE: ${await timelockController.hasRole(EXECUTOR_ROLE, canceller.address)}`);
    console.log(`Canceller-CANCELLER_ROLE: ${await timelockController.hasRole(CANCELLER_ROLE, canceller.address)}`);

    const deployerAddress = accounts.deployer.address;
    console.log(`For Deployer ${deployerAddress}`);
    console.log(`Deployer-ADMIN_ROLE: ${await timelockController.hasRole(ADMIN_ROLE, deployerAddress)}`);
    console.log(`Deployer-PROPOSER_ROLE: ${await timelockController.hasRole(PROPOSER_ROLE, deployerAddress)}`);
    console.log(`Deployer-EXECUTOR_ROLE: ${await timelockController.hasRole(EXECUTOR_ROLE, deployerAddress)}`);
    console.log(`Deployer-CANCELLER_ROLE: ${await timelockController.hasRole(CANCELLER_ROLE, deployerAddress)}`);
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
    if (CHAIN_INFORMATION[deployment.chainId].newBOATokenAddress === AddressZero) {
        console.log(`Deploy ${contractName}...`);
        if (deployment.getContract("MultiSigWallet") === undefined) {
            console.error("MultiSigWallet is not deployed!");
            return;
        }
        const factory = await ethers.getContractFactory("BOSAGORA");
        const contract = (await factory.connect(accounts.deployer).deploy(accounts.deployer.address)) as BOSAGORA;
        await contract.deployed();
        await contract.deployTransaction.wait();
        const owner = await contract.owner();
        const balance = await contract.balanceOf(owner);
        console.log(`NewBOA token's owner: ${owner}`);
        console.log(`NewBOA token's balance of owner: ${new BOAToken(balance).toDisplayString(true, 2)}`);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Deployed ${contractName} to ${contract.address}`);
    } else {
        console.log(`Attach ${contractName}...`);
        const factory = await ethers.getContractFactory("BOSAGORA");
        const contract = factory.attach(CHAIN_INFORMATION[deployment.chainId].newBOATokenAddress);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Attached ${contractName} to ${contract.address}`);
    }
}

async function deployTokenSwap(accounts: IAccount, deployment: Deployments) {
    const contractName = "TokenSwap";
    if (CHAIN_INFORMATION[deployment.chainId].tokenSwapAddress === AddressZero) {
        if (deployment.getContract("OldBOAToken") === undefined) {
            console.error("OldBOAToken is not deployed!");
            return;
        }
        if (deployment.getContract("NewBOAToken") === undefined) {
            console.error("NewBOAToken is not deployed!");
            return;
        }

        console.log(`Deploy ${contractName}...`);

        const factory = await ethers.getContractFactory("TokenSwap");
        const contract = (await factory
            .connect(accounts.deployer)
            .deploy(
                deployment.getContractAddress("OldBOAToken"),
                deployment.getContractAddress("NewBOAToken"),
                accounts.deployer.address
            )) as BOSAGORA;
        await contract.deployed();
        await contract.deployTransaction.wait();
        const owner = await contract.owner();
        console.log(`TokenSwap owner: ${owner}`);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Deployed ${contractName} to ${contract.address}`);
    } else {
        console.log(`Attach ${contractName}...`);
        const factory = await ethers.getContractFactory("TokenSwap");
        const contract = factory.attach(CHAIN_INFORMATION[deployment.chainId].tokenSwapAddress);
        deployment.addContract(contractName, contract.address, contract);
        console.log(`Attached ${contractName} to ${contract.address}`);
    }
}

async function mintInitialSupplyToken(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }
    const totalSupply = CHAIN_INFORMATION[deployment.chainId].swapSupply.add(
        CHAIN_INFORMATION[deployment.chainId].additionalSupply
    );

    console.log(`Start Mint`);
    const contractName = "NewBOAToken";
    const tokenContract = deployment.getContract("NewBOAToken") as BOSAGORA;
    const amount = new BOAToken(totalSupply);
    const tx = await tokenContract.mint(accounts.deployer.address, amount.value);
    console.log(`Mint new BOA (tx: ${tx.hash})...`);
    await tx.wait();
    console.log(
        `Balance(New BOA), deployer: ${new BOAToken(
            await tokenContract.balanceOf(accounts.deployer.address)
        ).toDisplayString(true, 2)}`
    );
    console.log(`Mint ${contractName} to ${accounts.deployer.address}`);
}

async function transferToTokenSwapContract(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }
    if (deployment.getContract("TokenSwap") === undefined) {
        console.error("TokenSwap is not deployed!");
        return;
    }

    console.log(`Start Distribute`);
    const contractName = "NewBOAToken";
    const tokenContract = deployment.getContract("NewBOAToken") as BOSAGORA;
    const tokenSwapContract = deployment.getContract("TokenSwap") as TokenSwap;
    {
        const amount = new BOAToken(CHAIN_INFORMATION[deployment.chainId].swapSupply);
        const tx = await tokenContract.connect(accounts.deployer).transfer(tokenSwapContract.address, amount.value);
        console.log(`Transfer new BOA to TokenSwap (tx: ${tx.hash})...`);
        await tx.wait();
    }
    console.log(
        `Balance(New BOA), deployer: ${new BOAToken(
            await tokenContract.balanceOf(accounts.deployer.address)
        ).toDisplayString(true, 2)}`
    );
    console.log(`Distribute ${contractName}`);
}

async function transferToMultisigWalletContract(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("MultiSigWallet is not deployed!");
        return;
    }

    console.log(`Start Distribute`);
    const contractName = "NewBOAToken";
    const tokenContract = deployment.getContract("NewBOAToken") as BOSAGORA;
    const multiSigWalletContract = deployment.getContract("MultiSigWallet") as MultiSigWallet;
    {
        const balance = await tokenContract.balanceOf(accounts.deployer.address);
        const tx = await tokenContract.connect(accounts.deployer).transfer(multiSigWalletContract.address, balance);
        console.log(`Transfer new BOA to MultiSigWallet (tx: ${tx.hash})...`);
        await tx.wait();
    }
    console.log(
        `Balance(New BOA), deployer: ${new BOAToken(
            await tokenContract.balanceOf(accounts.deployer.address)
        ).toDisplayString(true, 2)}`
    );
    console.log(`Distribute ${contractName}`);
}

async function transferToBridgeContract(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }

    const contract = deployment.getContract("NewBOAToken") as BOSAGORA;
    {
        const address: string = CHAIN_INFORMATION[deployment.chainId].bridgeAddress;
        if (address !== AddressZero) {
            console.log(`Start Deposit to Bridge`);

            const amount = new BOAToken(CHAIN_INFORMATION[deployment.chainId].additionalSupply);
            const tx = await contract.connect(accounts.deployer).transfer(address, amount.value);
            console.log(`Transfer new BOA to Bridge (tx: ${tx.hash})...`);
            await tx.wait();

            console.log(`Stop Deposit to Bridge`);
        }
    }
}

async function transferOwnershipOfToken(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("NewBOAToken") === undefined) {
        console.error("NewBOAToken is not deployed!");
        return;
    }

    if (deployment.getContract("TimelockController") === undefined) {
        console.error("TimelockController is not deployed!");
        return;
    }
    const tokenContract = deployment.getContract("NewBOAToken") as BOSAGORA;
    const timelockControllerContract = deployment.getContract("TimelockController") as TimelockController;
    const owner = await tokenContract.owner();
    if (owner !== timelockControllerContract.address) {
        const tx = await tokenContract.connect(accounts.deployer).transferOwnership(timelockControllerContract.address);
        console.log(`Transfer ownership of Token contract to TimelockControllerContract (tx: ${tx.hash})...`);
        await tx.wait();
    }
}

async function transferOwnershipOfTokenSwap(accounts: IAccount, deployment: Deployments) {
    if (deployment.getContract("TokenSwap") === undefined) {
        console.error("TokenSwap is not deployed!");
        return;
    }

    if (deployment.getContract("TimelockController") === undefined) {
        console.error("TimelockController is not deployed!");
        return;
    }
    const tokenSwapContract = deployment.getContract("TokenSwap") as BOSAGORA;
    const timelockControllerContract = deployment.getContract("TimelockController") as TimelockController;
    const owner = await tokenSwapContract.owner();
    if (owner !== timelockControllerContract.address) {
        const tx = await tokenSwapContract
            .connect(accounts.deployer)
            .transferOwnership(timelockControllerContract.address);
        console.log(`Transfer ownership of TokenSwap contract to TimelockController  (tx: ${tx.hash})...`);
        await tx.wait();
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
    if (deployment.getContract("TimelockController") === undefined) {
        console.error("TimelockController is not deployed!");
        return;
    }

    const oldBOATokenContract = deployment.getContract("OldBOAToken") as MockERC20;
    const newBOATokenContract = deployment.getContract("NewBOAToken") as BOSAGORA;
    const TokenSwapContract = deployment.getContract("TokenSwap") as TokenSwap;
    const MultiSigWalletContract = deployment.getContract("MultiSigWallet") as MultiSigWallet;
    const CancellerContract = deployment.getContract("CancellerMultiSigWallet") as MultiSigWallet;
    const timelockController = deployment.getContract("TimelockController") as TimelockController;

    console.log(`Report`);
    console.log(`1. Addresses`);
    console.log(`Old BOA: ${oldBOATokenContract.address}`);
    console.log(`New BOA: ${newBOATokenContract.address}`);
    console.log(`Token Swap: ${TokenSwapContract.address}`);
    console.log(`TimelockController: ${timelockController.address}`);
    console.log(`MSWallet: ${MultiSigWalletContract.address}`);
    console.log(`Canceller: ${CancellerContract.address}`);
    console.log(`Deployer: ${accounts.deployer.address}`);

    console.log(`2. Owners`);
    console.log(`Owner - Token Swap: ${await TokenSwapContract.owner()}`);
    console.log(`Owner - New BOA: ${await newBOATokenContract.owner()}`);

    console.log(`3. Balances`);
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
    deployments.addDeployer(deployCancellerMultiSigWallet);

    deployments.addDeployer(reportMultisigWallet);
    deployments.addDeployer(deployOldBOAToken);
    deployments.addDeployer(deployNewBOAToken);
    deployments.addDeployer(deployTokenSwap);
    deployments.addDeployer(deployTimelockController);
    deployments.addDeployer(mintInitialSupplyToken);
    deployments.addDeployer(transferToTokenSwapContract);
    deployments.addDeployer(transferToBridgeContract);
    deployments.addDeployer(transferToMultisigWalletContract);
    deployments.addDeployer(transferOwnershipOfToken);
    deployments.addDeployer(transferOwnershipOfTokenSwap);

    deployments.addDeployer(report);
    deployments.addDeployer(reportRollOfTimelockController);

    await deployments.doDeploy();
    deployments.saveContractInfo();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
