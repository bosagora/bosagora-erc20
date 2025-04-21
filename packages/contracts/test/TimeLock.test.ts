import { expect } from "chai";
import { ethers } from "hardhat";
import { BOSAGORA, TimelockController } from "../typechain-types";
import { BOAToken } from "../src/utils/Amount";

describe("TimelockController with MyToken (TypeScript)", () => {
    let token: BOSAGORA;
    let timelock: TimelockController;

    let deployer: any;
    let proposer: any;
    let executor: any;
    let recipient: any;

    const minDelay = 2 * 24 * 60 * 60;
    const mintAmount = BOAToken.make(1000).value;

    beforeEach(async () => {
        [deployer, proposer, executor, recipient] = await ethers.getSigners();

        const initialOwner = await deployer.getAddress();
        const factory = await ethers.getContractFactory("BOSAGORA");
        token = (await factory.deploy(initialOwner)) as BOSAGORA;
        await token.deployed();

        const Timelock = await ethers.getContractFactory("TimelockController");
        timelock = (await Timelock.deploy(
            minDelay,
            [proposer.address],
            [executor.address],
            deployer.address
        )) as TimelockController;
        await timelock.deployed();

        await token.connect(deployer).transferOwnership(timelock.address);
        expect(await token.owner()).to.equal(timelock.address); // 이전 확인
    });

    it("should mint tokens via Timelock after delay", async () => {
        const callData = token.interface.encodeFunctionData("mint", [recipient.address, mintAmount]);

        const tx = await timelock
            .connect(proposer)
            .schedule(token.address, 0, callData, ethers.constants.HashZero, ethers.constants.HashZero, minDelay);
        await tx.wait();

        await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
        await ethers.provider.send("evm_mine", []);

        const executeTx = await timelock
            .connect(executor)
            .execute(token.address, 0, callData, ethers.constants.HashZero, ethers.constants.HashZero);
        await executeTx.wait();

        const balance = await token.balanceOf(recipient.address);
        expect(balance).to.equal(mintAmount);
    });
});
