import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { MockERC20, TokenSwap, MultiSigWallet, MultiSigWalletFactory, TimelockController } from "../typechain-types";
import { BOAToken } from "../src/utils/Amount";
import { ContractUtils } from "../src/utils/ContractUtils";
import assert from "assert";

async function deployMultiSigWalletFactory(deployer: Signer): Promise<MultiSigWalletFactory> {
    const factory = await ethers.getContractFactory("MultiSigWalletFactory");
    const contract = (await factory.connect(deployer).deploy()) as MultiSigWalletFactory;
    await contract.deployed();
    await contract.deployTransaction.wait();
    return contract;
}

async function deployMultiSigWallet(
    factoryAddress: string,
    deployer: Signer,
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
    deployer: Signer,
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

describe("TokenSwap (TypeScript)", function () {
    let multiSigFactory: MultiSigWalletFactory;
    let multiSigWallet1: MultiSigWallet | undefined;
    let multiSigWallet2: MultiSigWallet | undefined;
    let oldToken: MockERC20;
    let newToken: MockERC20;
    let tokenSwap: TokenSwap;
    let deployer: Signer;
    let account0: Signer;
    let account1: Signer;
    let account2: Signer;
    let account3: Signer;
    let account4: Signer;
    let account5: Signer;
    let user: Signer;
    let userAddress: string;
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    const requiredConfirmations = 2;

    beforeEach(async () => {
        [deployer, user, account0, account1, account2, account3, account4, account5] = await ethers.getSigners();
        userAddress = await user.getAddress();

        multiSigFactory = await deployMultiSigWalletFactory(deployer);
        assert.ok(multiSigFactory);

        const memberAddresses1 = await Promise.all([account0, account1, account2].map((m) => m.getAddress()));

        multiSigWallet1 = await deployMultiSigWallet(
            multiSigFactory.address,
            deployer,
            memberAddresses1,
            requiredConfirmations,
            BigNumber.from(Math.floor(Math.random() * 100000))
        );
        assert.ok(multiSigWallet1);

        assert.deepStrictEqual(await multiSigWallet1.getMembers(), memberAddresses1);

        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account0.getAddress()),
            BigNumber.from(1)
        );
        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account1.getAddress()),
            BigNumber.from(1)
        );
        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account2.getAddress()),
            BigNumber.from(1)
        );

        const memberAddresses2 = await Promise.all([account3, account4, account5].map((m) => m.getAddress()));

        multiSigWallet2 = await deployMultiSigWallet(
            multiSigFactory.address,
            deployer,
            memberAddresses2,
            requiredConfirmations,
            BigNumber.from(Math.floor(Math.random() * 100000))
        );
        assert.ok(multiSigWallet2);

        assert.deepStrictEqual(await multiSigWallet2.getMembers(), memberAddresses2);

        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account3.getAddress()),
            BigNumber.from(1)
        );
        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account4.getAddress()),
            BigNumber.from(1)
        );
        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account5.getAddress()),
            BigNumber.from(1)
        );

        // Deploy tokens
        const OldTokenFactory = await ethers.getContractFactory("MockERC20");
        oldToken = (await OldTokenFactory.deploy("Old Token", "OLD", BOAToken.make("1000000").value)) as MockERC20;
        await oldToken.deployed();

        const NewTokenFactory = await ethers.getContractFactory("MockERC20");
        newToken = (await NewTokenFactory.deploy("New Token", "NEW", BOAToken.make("1000000").value)) as MockERC20;
        await newToken.deployed();

        // Deploy TokenSwap with MultiSig wallet as owner
        const TokenSwapFactory = await ethers.getContractFactory("TokenSwap");
        tokenSwap = (await TokenSwapFactory.deploy(
            oldToken.address,
            newToken.address,
            multiSigWallet1.address
        )) as TokenSwap;
        await tokenSwap.deployed();

        // Transfer new tokens to TokenSwap contract
        await newToken.transfer(tokenSwap.address, BOAToken.make("100000").value);

        // 보내기: 구 토큰 일부 → 사용자로
        await oldToken.transfer(userAddress, BOAToken.make("1000").value);
    });

    it("should swap and burn old token correctly", async () => {
        const amount = BOAToken.make("100").value;

        await oldToken.connect(user).approve(tokenSwap.address, amount);

        const newTokenBefore = await newToken.balanceOf(userAddress);

        await tokenSwap.connect(user).swap(amount);

        const burnBalance = await oldToken.balanceOf(burnAddress);
        const newTokenAfter = await newToken.balanceOf(userAddress);

        expect(burnBalance).to.equal(amount);
        expect(newTokenAfter.sub(newTokenBefore)).to.equal(amount);
    });

    it("should emit events correctly", async () => {
        const amount = BOAToken.make("50").value;

        await oldToken.connect(user).approve(tokenSwap.address, amount);

        await expect(tokenSwap.connect(user).swap(amount))
            .and.to.emit(tokenSwap, "TokenSwapped")
            .withArgs(userAddress, amount);
    });

    it("should fail when allowance is insufficient", async () => {
        const amount = BOAToken.make("100").value;
        // Don't approve any tokens
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("TokenSwap: Insufficient allowance");
    });

    it("should fail when new token balance is insufficient", async () => {
        const amount = BOAToken.make("200000").value; // More than contract balance
        await oldToken.connect(user).approve(tokenSwap.address, amount);
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith(
            "TokenSwap: Insufficient new token balance"
        );
    });

    it("should fail when amount is zero", async () => {
        await oldToken.connect(user).approve(tokenSwap.address, 0);
        await expect(tokenSwap.connect(user).swap(0)).to.be.revertedWith("TokenSwap: Amount must be greater than 0");
    });

    it("should fail when contract is paused", async () => {
        assert.ok(multiSigWallet1);

        const amount = BOAToken.make("100").value;
        await oldToken.connect(user).approve(tokenSwap.address, amount);

        // pause
        {
            const encodedData = tokenSwap.interface.encodeFunctionData("pause");
            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction(
                        "Transfer Ownership",
                        "Transfer ownership to new wallet",
                        tokenSwap.address,
                        0,
                        encodedData
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
        }

        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("Pausable: paused");
    });

    it("should rollback when old token transfer fails", async () => {
        const amount = BOAToken.make("100").value;
        await oldToken.connect(user).approve(tokenSwap.address, amount);

        // Store initial balances
        const initialOldTokenBalance = await oldToken.balanceOf(userAddress);
        const initialNewTokenBalance = await newToken.balanceOf(userAddress);

        // Set error causing to true before attempting swap
        await oldToken.connect(deployer).setErrorCausing(true);

        // Attempt swap
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("Error for test");

        // Check balances after failed swap
        const finalOldTokenBalance = await oldToken.balanceOf(userAddress);
        const finalNewTokenBalance = await newToken.balanceOf(userAddress);

        // Verify rollback
        expect(finalOldTokenBalance).to.equal(initialOldTokenBalance);
        expect(finalNewTokenBalance).to.equal(initialNewTokenBalance);

        // Reset error causing
        await oldToken.connect(deployer).setErrorCausing(false);
    });

    it("should rollback when new token transfer fails", async () => {
        const amount = BOAToken.make("100").value;
        await oldToken.connect(user).approve(tokenSwap.address, amount);

        // Store initial balances
        const initialOldTokenBalance = await oldToken.balanceOf(userAddress);
        const initialNewTokenBalance = await newToken.balanceOf(userAddress);

        // Make sure contract has enough new tokens
        await newToken.connect(deployer).transfer(tokenSwap.address, amount);

        // Set error causing to true before attempting swap
        await newToken.connect(deployer).setErrorCausing(true);

        // Attempt swap
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("Error for test");

        // Check balances after failed swap
        const finalOldTokenBalance = await oldToken.balanceOf(userAddress);
        const finalNewTokenBalance = await newToken.balanceOf(userAddress);

        // Verify rollback
        expect(finalOldTokenBalance).to.equal(initialOldTokenBalance);
        expect(finalNewTokenBalance).to.equal(initialNewTokenBalance);

        // Reset error causing
        await newToken.connect(deployer).setErrorCausing(false);
    });

    it("should rollback when burning fails", async () => {
        const amount = BOAToken.make("100").value;
        await oldToken.connect(user).approve(tokenSwap.address, amount);

        // Store initial balances
        const initialOldTokenBalance = await oldToken.balanceOf(userAddress);
        const initialNewTokenBalance = await newToken.balanceOf(userAddress);

        // Make sure contract has enough new tokens
        await newToken.connect(deployer).transfer(tokenSwap.address, amount);

        // Set error causing to true before attempting swap
        await oldToken.connect(deployer).setErrorCausing(true);

        // Attempt swap
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("Error for test");

        // Check balances after failed swap
        const finalOldTokenBalance = await oldToken.balanceOf(userAddress);
        const finalNewTokenBalance = await newToken.balanceOf(userAddress);

        // Verify rollback
        expect(finalOldTokenBalance).to.equal(initialOldTokenBalance);
        expect(finalNewTokenBalance).to.equal(initialNewTokenBalance);

        // Reset error causing
        await oldToken.connect(deployer).setErrorCausing(false);
    });

    it("should fail with invalid token addresses", async () => {
        assert.ok(multiSigWallet1);
        const TokenSwapFactory = await ethers.getContractFactory("TokenSwap");
        await expect(
            TokenSwapFactory.deploy(ethers.constants.AddressZero, newToken.address, multiSigWallet1.address)
        ).to.be.revertedWith("TokenSwap: Old token is zero address");
        await expect(
            TokenSwapFactory.deploy(oldToken.address, ethers.constants.AddressZero, multiSigWallet1.address)
        ).to.be.revertedWith("TokenSwap: New token is zero address");
    });

    it("should allow owner to transfer ownership", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(multiSigWallet2);

        // transferOwnership
        {
            const encodedData = tokenSwap.interface.encodeFunctionData("transferOwnership", [multiSigWallet2.address]);
            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction(
                        "Transfer Ownership",
                        "Transfer ownership to new wallet",
                        tokenSwap.address,
                        0,
                        encodedData
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
        }

        expect(await tokenSwap.owner()).to.equal(multiSigWallet2.address);
    });

    it("should allow owner to rescue non-swap tokens", async () => {
        assert.ok(multiSigWallet1);

        // Deploy a test token
        const TestTokenFactory = await ethers.getContractFactory("MockERC20");
        const testToken = await TestTokenFactory.deploy("Test Token", "TEST", BOAToken.make("1000000").value);

        // Transfer some test tokens to the swap contract
        const rescueAmount = BOAToken.make("100").value;
        await testToken.transfer(tokenSwap.address, rescueAmount);

        // Get initial balances
        const initialBalance = await testToken.balanceOf(multiSigWallet1.address);

        // Rescue tokens
        {
            const encodedData = tokenSwap.interface.encodeFunctionData("rescueTokens", [
                testToken.address,
                rescueAmount,
                multiSigWallet1.address,
            ]);
            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction("rescueTokens", "rescueTokens", tokenSwap.address, 0, encodedData),
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
        }

        // Check final balances
        const finalBalance = await testToken.balanceOf(multiSigWallet1.address);
        expect(finalBalance.sub(initialBalance)).to.equal(rescueAmount);
    });

    it("should allow owner to rescue swap tokens", async () => {
        assert.ok(multiSigWallet1);

        const rescueAmount = BOAToken.make("100").value;

        // Transfer some old tokens to the contract
        await oldToken.transfer(tokenSwap.address, rescueAmount);

        // Get initial balance
        const initialBalance = await oldToken.balanceOf(multiSigWallet1.address);

        // Rescue old tokens
        {
            const encodedData = tokenSwap.interface.encodeFunctionData("rescueTokens", [
                oldToken.address,
                rescueAmount,
                multiSigWallet1.address,
            ]);
            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction("rescueTokens", "rescueTokens", tokenSwap.address, 0, encodedData),
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
        }

        // Check final balance
        const finalBalance = await oldToken.balanceOf(multiSigWallet1.address);
        expect(finalBalance.sub(initialBalance)).to.equal(rescueAmount);
    });

    it("should not allow non-owner to rescue tokens", async () => {
        const TestTokenFactory = await ethers.getContractFactory("MockERC20");
        const testToken = await TestTokenFactory.deploy("Test Token", "TEST", BOAToken.make("1000000").value);

        const rescueAmount = BOAToken.make("100").value;
        await testToken.transfer(tokenSwap.address, rescueAmount);

        await expect(
            tokenSwap.connect(user).rescueTokens(testToken.address, rescueAmount, await user.getAddress())
        ).to.be.revertedWith("TokenSwap: Only the owner can execute");
    });

    it("should not allow rescue of zero amount", async () => {
        assert.ok(multiSigWallet1);
        {
            const encodedData = tokenSwap.interface.encodeFunctionData("rescueTokens", [
                oldToken.address,
                0,
                multiSigWallet1.address,
            ]);
            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction("rescueTokens", "rescueTokens", tokenSwap.address, 0, encodedData),
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
        }
    });
});

describe("TokenSwap (TypeScript), Using TimeLockController", function () {
    let multiSigFactory: MultiSigWalletFactory;
    let multiSigWallet1: MultiSigWallet | undefined;
    let multiSigWallet2: MultiSigWallet | undefined;
    let timeLockController: TimelockController;
    let oldToken: MockERC20;
    let newToken: MockERC20;
    let tokenSwap: TokenSwap;
    let deployer: Signer;
    let account0: Signer;
    let account1: Signer;
    let account2: Signer;
    let account3: Signer;
    let account4: Signer;
    let account5: Signer;
    let user: Signer;
    let userAddress: string;
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    const requiredConfirmations = 2;
    const minDelay = 48 * 60 * 60;

    beforeEach(async () => {
        [deployer, user, account0, account1, account2, account3, account4, account5] = await ethers.getSigners();
        userAddress = await user.getAddress();

        multiSigFactory = await deployMultiSigWalletFactory(deployer);
        assert.ok(multiSigFactory);

        const memberAddresses1 = await Promise.all([account0, account1, account2].map((m) => m.getAddress()));

        multiSigWallet1 = await deployMultiSigWallet(
            multiSigFactory.address,
            deployer,
            memberAddresses1,
            requiredConfirmations,
            BigNumber.from(Math.floor(Math.random() * 100000))
        );
        assert.ok(multiSigWallet1);

        assert.deepStrictEqual(await multiSigWallet1.getMembers(), memberAddresses1);

        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account0.getAddress()),
            BigNumber.from(1)
        );
        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account1.getAddress()),
            BigNumber.from(1)
        );
        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account2.getAddress()),
            BigNumber.from(1)
        );

        const memberAddresses2 = await Promise.all([account3, account4, account5].map((m) => m.getAddress()));

        multiSigWallet2 = await deployMultiSigWallet(
            multiSigFactory.address,
            deployer,
            memberAddresses2,
            requiredConfirmations,
            BigNumber.from(Math.floor(Math.random() * 100000))
        );
        assert.ok(multiSigWallet2);

        assert.deepStrictEqual(await multiSigWallet2.getMembers(), memberAddresses2);

        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account3.getAddress()),
            BigNumber.from(1)
        );
        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account4.getAddress()),
            BigNumber.from(1)
        );
        assert.deepStrictEqual(
            await multiSigFactory.getNumberOfWalletsForMember(await account5.getAddress()),
            BigNumber.from(1)
        );

        // Deploy tokens
        const OldTokenFactory = await ethers.getContractFactory("MockERC20");
        oldToken = (await OldTokenFactory.deploy("Old Token", "OLD", BOAToken.make("1000000").value)) as MockERC20;
        await oldToken.deployed();

        const NewTokenFactory = await ethers.getContractFactory("MockERC20");
        newToken = (await NewTokenFactory.deploy("New Token", "NEW", BOAToken.make("1000000").value)) as MockERC20;
        await newToken.deployed();

        // Deploy TimeLockController
        const proposers = [multiSigWallet1.address];
        const executors = [multiSigWallet1.address];
        const admin = multiSigWallet1.address;
        timeLockController = await deployTimeLockController(deployer, minDelay, proposers, executors, admin);

        // Deploy TokenSwap
        const TokenSwapFactory = await ethers.getContractFactory("TokenSwap");
        tokenSwap = (await TokenSwapFactory.deploy(
            oldToken.address,
            newToken.address,
            timeLockController.address
        )) as TokenSwap;
        await tokenSwap.deployed();

        // Transfer new tokens to TokenSwap contract
        await newToken.transfer(tokenSwap.address, BOAToken.make("100000").value);

        // 보내기: 구 토큰 일부 → 사용자로
        await oldToken.transfer(userAddress, BOAToken.make("1000").value);
    });

    it("should fail when contract is paused", async () => {
        assert.ok(multiSigWallet1);

        const amount = BOAToken.make("100").value;
        await oldToken.connect(user).approve(tokenSwap.address, amount);

        // 1. pause schedule
        {
            const callData = tokenSwap.interface.encodeFunctionData("pause");
            const encodedData = timeLockController.interface.encodeFunctionData("schedule", [
                tokenSwap.address,
                0,
                callData,
                ethers.constants.HashZero,
                ethers.constants.HashZero,
                minDelay,
            ]);

            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction("pause", "Schedule a pause command", timeLockController.address, 0, encodedData),
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
        }

        expect(await tokenSwap.paused()).to.eqls(false);

        // 2. time-lapse simulation
        await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
        await ethers.provider.send("evm_mine", []);

        // 3. pause execute
        {
            const callData = tokenSwap.interface.encodeFunctionData("pause");
            const encodedData = timeLockController.interface.encodeFunctionData("execute", [
                tokenSwap.address,
                0,
                callData,
                ethers.constants.HashZero,
                ethers.constants.HashZero,
            ]);

            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction("pause", "Execute a pause command", timeLockController.address, 0, encodedData),
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
        }

        expect(await tokenSwap.paused()).to.eqls(true);
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("Pausable: paused");
    });

    it("should allow owner to transfer ownership", async () => {
        assert.ok(multiSigWallet1);
        assert.ok(multiSigWallet2);

        // 1. transferOwnership schedule
        {
            const callData = tokenSwap.interface.encodeFunctionData("transferOwnership", [multiSigWallet2.address]);
            const encodedData = timeLockController.interface.encodeFunctionData("schedule", [
                tokenSwap.address,
                0,
                callData,
                ethers.constants.HashZero,
                ethers.constants.HashZero,
                minDelay,
            ]);

            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction(
                        "transfer ownership",
                        "Schedule a transfer ownership command",
                        timeLockController.address,
                        0,
                        encodedData
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
        }

        // 2. time-lapse simulation
        await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
        await ethers.provider.send("evm_mine", []);

        // 3. transferOwnership execute
        {
            const callData = tokenSwap.interface.encodeFunctionData("transferOwnership", [multiSigWallet2.address]);
            const encodedData = timeLockController.interface.encodeFunctionData("execute", [
                tokenSwap.address,
                0,
                callData,
                ethers.constants.HashZero,
                ethers.constants.HashZero,
            ]);

            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction(
                        "transfer ownership",
                        "Execute a transfer ownership command",
                        timeLockController.address,
                        0,
                        encodedData
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
        }

        expect(await tokenSwap.owner()).to.equal(multiSigWallet2.address);
    });

    it("should allow owner to rescue non-swap tokens", async () => {
        assert.ok(multiSigWallet1);

        // Deploy a test token
        const TestTokenFactory = await ethers.getContractFactory("MockERC20");
        const testToken = await TestTokenFactory.deploy("Test Token", "TEST", BOAToken.make("1000000").value);

        // Transfer some test tokens to the swap contract
        const rescueAmount = BOAToken.make("100").value;
        await testToken.transfer(tokenSwap.address, rescueAmount);

        // Get initial balances
        const initialBalance = await testToken.balanceOf(multiSigWallet1.address);

        // 1. Rescue tokens schedule
        {
            const callData = tokenSwap.interface.encodeFunctionData("rescueTokens", [
                testToken.address,
                rescueAmount,
                multiSigWallet1.address,
            ]);
            const encodedData = timeLockController.interface.encodeFunctionData("schedule", [
                tokenSwap.address,
                0,
                callData,
                ethers.constants.HashZero,
                ethers.constants.HashZero,
                minDelay,
            ]);
            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction("rescue", "schedule", timeLockController.address, 0, encodedData),
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
        }

        // 2. time-lapse simulation
        await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
        await ethers.provider.send("evm_mine", []);

        // 3. Rescue tokens execute
        {
            const callData = tokenSwap.interface.encodeFunctionData("rescueTokens", [
                testToken.address,
                rescueAmount,
                multiSigWallet1.address,
            ]);
            const encodedData = timeLockController.interface.encodeFunctionData("execute", [
                tokenSwap.address,
                0,
                callData,
                ethers.constants.HashZero,
                ethers.constants.HashZero,
            ]);
            const transactionId = await ContractUtils.getEventValueBigNumber(
                await multiSigWallet1
                    .connect(account0)
                    .submitTransaction("rescue", "execute", timeLockController.address, 0, encodedData),
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
        }

        // Check final balances
        const finalBalance = await testToken.balanceOf(multiSigWallet1.address);
        expect(finalBalance.sub(initialBalance)).to.equal(rescueAmount);
    });
});
