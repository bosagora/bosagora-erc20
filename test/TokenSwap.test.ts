import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { MockERC20, TokenSwap } from "../typechain-types";
import { BOAToken } from "../src/utils/Amount";

describe("TokenSwap (TypeScript)", function () {
    let oldToken: MockERC20;
    let newToken: MockERC20;
    let tokenSwap: TokenSwap;
    let owner: Signer;
    let user: Signer;
    let userAddress: string;
    const burnAddress = "0x000000000000000000000000000000000000dEaD";

    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();
        userAddress = await user.getAddress();

        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        oldToken = (await MockERC20Factory.deploy("Old Token", "OLD", BOAToken.make("1000000").value)) as MockERC20;
        newToken = (await MockERC20Factory.deploy("New Token", "NEW", BOAToken.make("1000000").value)) as MockERC20;

        const TokenSwapFactory = await ethers.getContractFactory("TokenSwap");
        tokenSwap = (await TokenSwapFactory.deploy(oldToken.address, newToken.address)) as TokenSwap;

        // 보내기: 새 토큰 일부 → 컨트랙트로
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
            .to.emit(tokenSwap, "OldTokenBurned")
            .withArgs(userAddress, amount)
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
        const amount = BOAToken.make("100").value;
        await oldToken.connect(user).approve(tokenSwap.address, amount);
        await tokenSwap.connect(owner).pause();
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("Pausable: paused");
    });

    it("should rollback when old token transfer fails", async () => {
        const amount = BOAToken.make("100").value;
        await oldToken.connect(user).approve(tokenSwap.address, amount);

        // Store initial balances
        const initialOldTokenBalance = await oldToken.balanceOf(userAddress);
        const initialNewTokenBalance = await newToken.balanceOf(userAddress);

        // Set error causing to true before attempting swap
        await oldToken.connect(owner).setErrorCausing(true);

        // Attempt swap
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("Error for test");

        // Check balances after failed swap
        const finalOldTokenBalance = await oldToken.balanceOf(userAddress);
        const finalNewTokenBalance = await newToken.balanceOf(userAddress);

        // Verify rollback
        expect(finalOldTokenBalance).to.equal(initialOldTokenBalance);
        expect(finalNewTokenBalance).to.equal(initialNewTokenBalance);

        // Reset error causing
        await oldToken.connect(owner).setErrorCausing(false);
    });

    it("should rollback when new token transfer fails", async () => {
        const amount = BOAToken.make("100").value;
        await oldToken.connect(user).approve(tokenSwap.address, amount);

        // Store initial balances
        const initialOldTokenBalance = await oldToken.balanceOf(userAddress);
        const initialNewTokenBalance = await newToken.balanceOf(userAddress);

        // Make sure contract has enough new tokens
        await newToken.connect(owner).transfer(tokenSwap.address, amount);

        // Set error causing to true before attempting swap
        await newToken.connect(owner).setErrorCausing(true);

        // Attempt swap
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("Error for test");

        // Check balances after failed swap
        const finalOldTokenBalance = await oldToken.balanceOf(userAddress);
        const finalNewTokenBalance = await newToken.balanceOf(userAddress);

        // Verify rollback
        expect(finalOldTokenBalance).to.equal(initialOldTokenBalance);
        expect(finalNewTokenBalance).to.equal(initialNewTokenBalance);

        // Reset error causing
        await newToken.connect(owner).setErrorCausing(false);
    });

    it("should rollback when burning fails", async () => {
        const amount = BOAToken.make("100").value;
        await oldToken.connect(user).approve(tokenSwap.address, amount);

        // Store initial balances
        const initialOldTokenBalance = await oldToken.balanceOf(userAddress);
        const initialNewTokenBalance = await newToken.balanceOf(userAddress);

        // Make sure contract has enough new tokens
        await newToken.connect(owner).transfer(tokenSwap.address, amount);

        // Set error causing to true before attempting swap
        await oldToken.connect(owner).setErrorCausing(true);

        // Attempt swap
        await expect(tokenSwap.connect(user).swap(amount)).to.be.revertedWith("Error for test");

        // Check balances after failed swap
        const finalOldTokenBalance = await oldToken.balanceOf(userAddress);
        const finalNewTokenBalance = await newToken.balanceOf(userAddress);

        // Verify rollback
        expect(finalOldTokenBalance).to.equal(initialOldTokenBalance);
        expect(finalNewTokenBalance).to.equal(initialNewTokenBalance);

        // Reset error causing
        await oldToken.connect(owner).setErrorCausing(false);
    });

    it("should fail with invalid token addresses", async () => {
        const TokenSwapFactory = await ethers.getContractFactory("TokenSwap");
        await expect(TokenSwapFactory.deploy(ethers.constants.AddressZero, newToken.address)).to.be.revertedWith(
            "TokenSwap: Old token is zero address"
        );
        await expect(TokenSwapFactory.deploy(oldToken.address, ethers.constants.AddressZero)).to.be.revertedWith(
            "TokenSwap: New token is zero address"
        );
    });

    it("should allow owner to transfer ownership", async () => {
        const [newOwner] = await ethers.getSigners();
        await tokenSwap.connect(owner).transferOwnership(await newOwner.getAddress());
        expect(await tokenSwap.owner()).to.equal(await newOwner.getAddress());
    });

    it("should allow owner to rescue non-swap tokens", async () => {
        // Deploy a test token
        const TestTokenFactory = await ethers.getContractFactory("MockERC20");
        const testToken = await TestTokenFactory.deploy("Test Token", "TEST", BOAToken.make("1000000").value);

        // Transfer some test tokens to the swap contract
        const rescueAmount = BOAToken.make("100").value;
        await testToken.transfer(tokenSwap.address, rescueAmount);

        // Get initial balances
        const initialBalance = await testToken.balanceOf(owner.getAddress());

        // Rescue tokens
        await tokenSwap.connect(owner).rescueTokens(testToken.address, rescueAmount, await owner.getAddress());

        // Check final balances
        const finalBalance = await testToken.balanceOf(owner.getAddress());
        expect(finalBalance.sub(initialBalance)).to.equal(rescueAmount);
    });

    it("should not allow non-owner to rescue tokens", async () => {
        const TestTokenFactory = await ethers.getContractFactory("MockERC20");
        const testToken = await TestTokenFactory.deploy("Test Token", "TEST", BOAToken.make("1000000").value);

        const rescueAmount = BOAToken.make("100").value;
        await testToken.transfer(tokenSwap.address, rescueAmount);

        await expect(
            tokenSwap.connect(user).rescueTokens(testToken.address, rescueAmount, await user.getAddress())
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow rescue of swap tokens", async () => {
        const rescueAmount = BOAToken.make("100").value;

        await expect(
            tokenSwap.connect(owner).rescueTokens(oldToken.address, rescueAmount, await owner.getAddress())
        ).to.be.revertedWith("TokenSwap: Cannot rescue swap tokens");

        await expect(
            tokenSwap.connect(owner).rescueTokens(newToken.address, rescueAmount, await owner.getAddress())
        ).to.be.revertedWith("TokenSwap: Cannot rescue swap tokens");
    });

    it("should not allow rescue of zero amount", async () => {
        const TestTokenFactory = await ethers.getContractFactory("MockERC20");
        const testToken = await TestTokenFactory.deploy("Test Token", "TEST", BOAToken.make("1000000").value);

        await expect(
            tokenSwap.connect(owner).rescueTokens(testToken.address, 0, await owner.getAddress())
        ).to.be.revertedWith("TokenSwap: Amount must be greater than 0");
    });
});
