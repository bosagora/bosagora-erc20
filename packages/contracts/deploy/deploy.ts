import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";

import { HardhatAccount } from "../src/HardhatAccount";
import { BOAToken } from "../src/utils/Amount";
import { BOSAGORA, MockERC20, TokenSwap } from "../typechain-types";

import fs from "fs";
import { BaseContract, BigNumber, Wallet } from "ethers";
import { AddressZero } from "@ethersproject/constants";

interface IChainInfo {
    swapSupply: BigNumber;
    additionalSupply: BigNumber;
    oldBOATokenAddress: string;
    newBOATokenAddress: string;
    tokenSwapAddress: string;
    timelockControllerAddress: string;
}

export const CHAIN_INFORMATION: { [key: string]: IChainInfo } = {
    24680: {
        swapSupply: BOAToken.make("450_000_000").value,
        additionalSupply: BOAToken.make("1_076_755_093").value,
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

async function deployOldBOAToken(accounts: IAccount, deployment: Deployments) {
    const contractName = "OldBOAToken";
    if (CHAIN_INFORMATION[deployment.chainId].oldBOATokenAddress === AddressZero) {
        console.log(`Deploy ${contractName}...`);
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
        const factory = await ethers.getContractFactory("BOSAGORA");
        const contract = (await factory.connect(accounts.deployer).deploy(accounts.deployer.address)) as BOSAGORA;
        await contract.deployed();
        await contract.deployTransaction.wait();
        const owner = await contract.assetAccount();
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
                deployment.getContractAddress("NewBOAToken")
            )) as BOSAGORA;
        await contract.deployed();
        await contract.deployTransaction.wait();
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

    console.log(`Start Mint`);
    const contractName = "NewBOAToken";
    const tokenContract = deployment.getContract("NewBOAToken") as BOSAGORA;

    const tx1 = await tokenContract.mint();
    console.log(`Mint new BOA year 2022 (tx: ${tx1.hash})...`);
    await tx1.wait();

    const tx2 = await tokenContract.mint();
    console.log(`Mint new BOA year 2023 (tx: ${tx2.hash})...`);
    await tx2.wait();

    const tx3 = await tokenContract.mint();
    console.log(`Mint new BOA year 2024 (tx: ${tx3.hash})...`);
    await tx3.wait();

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

    const oldBOATokenContract = deployment.getContract("OldBOAToken") as MockERC20;
    const newBOATokenContract = deployment.getContract("NewBOAToken") as BOSAGORA;
    const TokenSwapContract = deployment.getContract("TokenSwap") as TokenSwap;

    console.log(`Report`);
    console.log(`1. Addresses`);
    console.log(`Old BOA: ${oldBOATokenContract.address}`);
    console.log(`New BOA: ${newBOATokenContract.address}`);
    console.log(`Token Swap: ${TokenSwapContract.address}`);
    console.log(`Deployer: ${accounts.deployer.address}`);

    console.log(`3. Balances`);
    console.log(
        `Balance(Old BOA), deployer: ${new BOAToken(
            await oldBOATokenContract.balanceOf(accounts.deployer.address)
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
        `Balance(New BOA), swap    : ${new BOAToken(
            await newBOATokenContract.balanceOf(TokenSwapContract.address)
        ).toDisplayString(true, 2)}`
    );
}

async function main() {
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    const deployments = new Deployments(chainId);

    deployments.addDeployer(deployOldBOAToken);
    deployments.addDeployer(deployNewBOAToken);
    deployments.addDeployer(deployTokenSwap);
    deployments.addDeployer(mintInitialSupplyToken);
    deployments.addDeployer(transferToTokenSwapContract);

    deployments.addDeployer(report);

    await deployments.doDeploy();
    deployments.saveContractInfo();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
