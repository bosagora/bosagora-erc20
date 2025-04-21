import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import { ethers } from "hardhat";

import { HardhatAccount } from "../src/HardhatAccount";
import { BOSAGORA, MultiSigWallet, MultiSigWalletFactory, TimelockController } from "../typechain-types";
import { ContractUtils } from "../src/utils/ContractUtils";

import assert from "assert";
import { BigNumber, Wallet } from "ethers";

import { expect } from "chai";
import { BOAToken } from "../src/utils/Amount";

async function deployMultiSigWalletFactory(deployer: Wallet): Promise<MultiSigWalletFactory> {
    const factory = await ethers.getContractFactory("MultiSigWalletFactory");
    const contract = (await factory.connect(deployer).deploy()) as MultiSigWalletFactory;
    await contract.deployed();
    await contract.deployTransaction.wait();
    return contract;
}

async function deployMultiSigWallet(
    factoryAddress: string,
    deployer: Wallet,
    owners: string[],
    required: number,
    seed: BigNumber
): Promise<MultiSigWallet | undefined> {
    const contractFactory = await ethers.getContractFactory("MultiSigWalletFactory");
    const factoryContract = contractFactory.attach(factoryAddress) as MultiSigWalletFactory;

    const address = await ContractUtils.getEventValueString(
        await factoryContract.connect(deployer).create("", "", owners, required, seed),
        factoryContract.interface,
        "ContractInstantiation",
        "wallet"
    );

    return address !== undefined
        ? ((await ethers.getContractFactory("MultiSigWallet")).attach(address) as MultiSigWallet)
        : undefined;
}

async function deployTimeLockController(
    deployer: Wallet,
    minDelay: number,
    proposers: string[],
    executors: string[],
    admin: string
): Promise<TimelockController> {
    const factory = await ethers.getContractFactory("TimelockController");
    const contract = (await factory
        .connect(deployer)
        .deploy(minDelay, proposers, executors, admin)) as TimelockController;
    await contract.deployed();
    await contract.deployTransaction.wait();
    return contract;
}

async function deployToken(deployer: Wallet, owner: string): Promise<BOSAGORA> {
    const factory = await ethers.getContractFactory("BOSAGORA");
    const contract = (await factory.connect(deployer).deploy(owner)) as BOSAGORA;
    await contract.deployed();
    await contract.deployTransaction.wait();
    return contract;
}

describe("Test for BOSAGORA token", () => {
    const raws = HardhatAccount.keys.map((m) => new Wallet(m, ethers.provider));
    const [deployer, account0, account1, account2, account3, account4, account5, account6] = raws;
    const owners1 = [account0, account1, account2];
    const owners2 = [account3, account4, account5];

    let multiSigFactory: MultiSigWalletFactory;
    let multiSigWallet1: MultiSigWallet | undefined;
    let multiSigWallet2: MultiSigWallet | undefined;
    let token: BOSAGORA;
    const requiredConfirmations = 2;

    before(async () => {
        multiSigFactory = await deployMultiSigWalletFactory(deployer);
        assert.ok(multiSigFactory);
    });

    it("Create Wallet by Factory", async () => {
        multiSigWallet1 = await deployMultiSigWallet(
            multiSigFactory.address,
            deployer,
            owners1.map((m) => m.address),
            requiredConfirmations,
            BigNumber.from(1)
        );
        assert.ok(multiSigWallet1);

        assert.deepStrictEqual(
            await multiSigWallet1.getMembers(),
            owners1.map((m) => m.address)
        );

        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account0.address), BigNumber.from(1));
        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account1.address), BigNumber.from(1));
        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account2.address), BigNumber.from(1));
    });

    it("Create Wallet by Factory", async () => {
        multiSigWallet2 = await deployMultiSigWallet(
            multiSigFactory.address,
            deployer,
            owners2.map((m) => m.address),
            requiredConfirmations,
            BigNumber.from(2)
        );
        assert.ok(multiSigWallet2);

        assert.deepStrictEqual(
            await multiSigWallet2.getMembers(),
            owners2.map((m) => m.address)
        );

        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account3.address), BigNumber.from(1));
        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account4.address), BigNumber.from(1));
        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account5.address), BigNumber.from(1));
    });

    it("Create Token, Owner is MultiSigWallet", async () => {
        assert.ok(multiSigWallet1);

        token = await deployToken(deployer, multiSigWallet1.address);

        assert.deepStrictEqual(await token.owner(), multiSigWallet1.address);
        assert.deepStrictEqual(await token.balanceOf(multiSigWallet1.address), BigNumber.from(0));
        assert.deepStrictEqual(await token.name(), "BOSAGORA");
        assert.deepStrictEqual(await token.symbol(), "BOA");
        assert.deepStrictEqual(await token.decimals(), 7);
    });

    it("Fail mint initial supply", async () => {
        assert.ok(multiSigWallet1);
        const amount = BOAToken.make(1).value;
        await expect(token.connect(account0).mint(multiSigWallet1.address, amount)).to.be.revertedWith(
            "BOSAGORA: Only the owner can execute"
        );
    });

    it("mint initial supply", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(token);

        const initialSupply = BOAToken.make(100_000_000).value;

        const mintEncoded = token.interface.encodeFunctionData("mint", [multiSigWallet1.address, initialSupply]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1
                .connect(account0)
                .submitTransaction("Mint", "Mint 1 token", token.address, 0, mintEncoded),
            multiSigWallet1.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1.connect(account1).confirmTransaction(transactionId),
            multiSigWallet1.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(transactionId, executedTransactionId);

        // Check balance of target
        assert.deepStrictEqual(await token.balanceOf(multiSigWallet1.address), initialSupply);
    });

    it("Fail transfer", async () => {
        const amount = BOAToken.make(100_000_000).value;
        await expect(token.connect(account0).transfer(account4.address, amount)).to.be.revertedWith(
            "ERC20: transfer amount exceeds balance"
        );
    });

    it("Success transfer", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(token);

        const initialSupply = BOAToken.make(100_000_000).value;
        const amount = BOAToken.make(1).value;

        assert.deepStrictEqual(await token.balanceOf(multiSigWallet1.address), initialSupply);

        const mintEncoded = token.interface.encodeFunctionData("transfer", [account4.address, amount]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1
                .connect(account0)
                .submitTransaction("Transfer", "Transfer 1 token", token.address, 0, mintEncoded),
            multiSigWallet1.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1.connect(account1).confirmTransaction(transactionId),
            multiSigWallet1.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(transactionId, executedTransactionId);

        // Check balance of target
        assert.deepStrictEqual(await token.balanceOf(account4.address), amount);

        // Check balance of wallet
        assert.deepStrictEqual(await token.balanceOf(multiSigWallet1.address), initialSupply.sub(amount));
    });

    it("Fail mint exceeding max supply", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(token);

        // Try to mint more than MAX_SUPPLY
        const maxSupply = await token.MAX_SUPPLY();
        const currentSupply = await token.totalSupply();
        const newSupply = maxSupply.sub(currentSupply).add(1);
        const mintEncoded = token.interface.encodeFunctionData("mint", [multiSigWallet1.address, newSupply]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1
                .connect(account0)
                .submitTransaction("Mint", "Mint exceeding max supply", token.address, 0, mintEncoded),
            multiSigWallet1.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1.connect(account1).confirmTransaction(transactionId),
            multiSigWallet1.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(executedTransactionId, undefined);
        assert.deepStrictEqual(await token.totalSupply(), currentSupply);
    });

    it("Transfer ownership", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(multiSigWallet2);
        assert.ok(token);

        // Transfer ownership
        const transferEncoded = token.interface.encodeFunctionData("transferOwnership", [multiSigWallet2.address]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1
                .connect(account0)
                .submitTransaction(
                    "Transfer Ownership",
                    "Transfer ownership to new wallet",
                    token.address,
                    0,
                    transferEncoded
                ),
            multiSigWallet1.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1.connect(account1).confirmTransaction(transactionId),
            multiSigWallet1.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(transactionId, executedTransactionId);

        // Check new owner
        assert.deepStrictEqual(await token.owner(), multiSigWallet2.address);

        // Verify old owner cannot mint
        const currentSupply = await token.totalSupply();
        const mintEncoded = token.interface.encodeFunctionData("mint", [
            multiSigWallet1.address,
            BOAToken.make(1).value,
        ]);
        const newMintTransaction1Id = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1
                .connect(account0)
                .submitTransaction("Mint", "Mint after ownership transfer", token.address, 0, mintEncoded),
            multiSigWallet1.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(newMintTransaction1Id !== undefined);

        const executedNewMintTransaction1Id = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1.connect(account1).confirmTransaction(newMintTransaction1Id),
            multiSigWallet1.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(executedNewMintTransaction1Id, undefined);
        assert.deepStrictEqual(await token.totalSupply(), currentSupply);

        // Verify new owner can mint
        const newMintTransaction2Id = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet2
                .connect(account3)
                .submitTransaction("Mint", "Mint by new owner", token.address, 0, mintEncoded),
            multiSigWallet2.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(newMintTransaction2Id !== undefined);

        const executedNewMintTransaction2Id = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet2.connect(account4).confirmTransaction(newMintTransaction2Id),
            multiSigWallet2.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(executedNewMintTransaction2Id, newMintTransaction2Id);
        assert.deepStrictEqual(await token.totalSupply(), currentSupply.add(BOAToken.make(1).value));
    });

    it("Emit events correctly", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(multiSigWallet2);
        assert.ok(token);

        // Test TokensMinted event
        const mintAmount = BOAToken.make(100).value;
        const mintEncoded = token.interface.encodeFunctionData("mint", [multiSigWallet2.address, mintAmount]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet2
                .connect(account3)
                .submitTransaction("Mint", "Mint for event test", token.address, 0, mintEncoded),
            multiSigWallet2.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        await multiSigWallet2.connect(account4).confirmTransaction(transactionId);

        // Get the latest block
        const latestBlock = await ethers.provider.getBlock("latest");
        const filter = token.filters.TokensMinted();
        const events = await token.queryFilter(filter, latestBlock.number - 1, latestBlock.number);

        assert.deepStrictEqual(events.length, 1);
        assert.deepStrictEqual(events[0].args?.account, multiSigWallet2.address);
        assert.deepStrictEqual(events[0].args?.amount, mintAmount);

        const transferEncoded = token.interface.encodeFunctionData("transferOwnership", [multiSigWallet1.address]);

        const transferTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet2
                .connect(account3)
                .submitTransaction(
                    "Transfer Ownership",
                    "Transfer ownership for event test",
                    token.address,
                    0,
                    transferEncoded
                ),
            multiSigWallet2.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transferTransactionId !== undefined);

        await multiSigWallet2.connect(account4).confirmTransaction(transferTransactionId);

        // Get the latest block
        const latestBlockAfterTransfer = await ethers.provider.getBlock("latest");
        const ownershipFilter = token.filters.OwnershipTransferred();
        const ownershipEvents = await token.queryFilter(
            ownershipFilter,
            latestBlockAfterTransfer.number - 1,
            latestBlockAfterTransfer.number
        );

        assert.deepStrictEqual(ownershipEvents.length, 1);
        assert.deepStrictEqual(ownershipEvents[0].args?.previousOwner, multiSigWallet2.address);
        assert.deepStrictEqual(ownershipEvents[0].args?.newOwner, multiSigWallet1.address);
    });

    it("Success mint up to max supply", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(token);

        // Try to mint more than MAX_SUPPLY
        const maxSupply = await token.MAX_SUPPLY();
        const currentSupply = await token.totalSupply();
        const newSupply = maxSupply.sub(currentSupply);
        const mintEncoded = token.interface.encodeFunctionData("mint", [multiSigWallet1.address, newSupply]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1
                .connect(account0)
                .submitTransaction("Mint", "Mint exceeding max supply", token.address, 0, mintEncoded),
            multiSigWallet1.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1.connect(account1).confirmTransaction(transactionId),
            multiSigWallet1.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(executedTransactionId, transactionId);
        assert.deepStrictEqual(await token.totalSupply(), maxSupply);
    });
});

describe("Test for BOSAGORA token, Using TimeLockController", () => {
    const raws = HardhatAccount.keys.map((m) => new Wallet(m, ethers.provider));
    const [deployer, account0, account1, account2, account3, account4, account5, account6] = raws;
    const owners1 = [account0, account1, account2];

    let multiSigFactory: MultiSigWalletFactory;
    let multiSigWallet1: MultiSigWallet | undefined;
    let timeLock: TimelockController;
    let token: BOSAGORA;
    const requiredConfirmations = 2;
    const minDelay = 48 * 60 * 60;

    before(async () => {
        multiSigFactory = await deployMultiSigWalletFactory(deployer);
        assert.ok(multiSigFactory);
    });

    it("Create Wallet by Factory", async () => {
        multiSigWallet1 = await deployMultiSigWallet(
            multiSigFactory.address,
            deployer,
            owners1.map((m) => m.address),
            requiredConfirmations,
            BigNumber.from(1)
        );
        assert.ok(multiSigWallet1);

        assert.deepStrictEqual(
            await multiSigWallet1.getMembers(),
            owners1.map((m) => m.address)
        );

        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account0.address), BigNumber.from(1));
        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account1.address), BigNumber.from(1));
        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account2.address), BigNumber.from(1));
    });

    it("Create TimeLockController", async () => {
        assert.ok(multiSigWallet1);
        const proposers = [multiSigWallet1.address];
        const executors = [multiSigWallet1.address];
        const admin = multiSigWallet1.address;
        timeLock = await deployTimeLockController(deployer, minDelay, proposers, executors, admin);
    });

    it("Create Token, Owner is MultiSigWallet", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(timeLock);

        token = await deployToken(deployer, timeLock.address);

        assert.deepStrictEqual(await token.owner(), timeLock.address);
        assert.deepStrictEqual(await token.balanceOf(multiSigWallet1.address), BigNumber.from(0));
        assert.deepStrictEqual(await token.balanceOf(timeLock.address), BigNumber.from(0));
        assert.deepStrictEqual(await token.name(), "BOSAGORA");
        assert.deepStrictEqual(await token.symbol(), "BOA");
        assert.deepStrictEqual(await token.decimals(), 7);
    });

    it("Fail mint initial supply", async () => {
        assert.ok(multiSigWallet1);

        const amount = BOAToken.make(1).value;
        await expect(token.connect(account0).mint(multiSigWallet1.address, amount)).to.be.revertedWith(
            "BOSAGORA: Only the owner can execute"
        );
    });

    it("mint initial supply - proposal", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(token);

        const initialSupply = BOAToken.make(100_000_000).value;
        const callData = token.interface.encodeFunctionData("mint", [multiSigWallet1.address, initialSupply]);
        const mintEncoded = timeLock.interface.encodeFunctionData("schedule", [
            token.address,
            0,
            callData,
            ethers.constants.HashZero,
            ethers.constants.HashZero,
            minDelay,
        ]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1
                .connect(account0)
                .submitTransaction("Mint", "Mint 1 token", timeLock.address, 0, mintEncoded),
            multiSigWallet1.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1.connect(account1).confirmTransaction(transactionId),
            multiSigWallet1.interface,
            "Execution",
            "transactionId"
        );
        assert.ok(executedTransactionId !== undefined);

        // Check that transaction has been executed
        assert.deepStrictEqual(transactionId, executedTransactionId);

        // Check balance of target
        assert.deepStrictEqual(await token.balanceOf(multiSigWallet1.address), BigNumber.from(0));
    });

    it("increase time", async () => {
        // 2. 시간 경과 시뮬레이션 (2일)
        await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
        await ethers.provider.send("evm_mine", []);
    });

    it("mint initial supply - execution", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(token);

        const initialSupply = BOAToken.make(100_000_000).value;
        const callData = token.interface.encodeFunctionData("mint", [multiSigWallet1.address, initialSupply]);
        const mintEncoded = timeLock.interface.encodeFunctionData("execute", [
            token.address,
            0,
            callData,
            ethers.constants.HashZero,
            ethers.constants.HashZero,
        ]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1
                .connect(account0)
                .submitTransaction("Mint", "Mint 1 token", timeLock.address, 0, mintEncoded),
            multiSigWallet1.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet1.connect(account1).confirmTransaction(transactionId),
            multiSigWallet1.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(transactionId, executedTransactionId);

        // Check balance of target
        assert.deepStrictEqual(await token.balanceOf(multiSigWallet1.address), initialSupply);
    });
});
