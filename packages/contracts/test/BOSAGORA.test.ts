import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import { ethers } from "hardhat";

import { HardhatAccount } from "../src/HardhatAccount";
import { BOSAGORA } from "../typechain-types";

import assert from "assert";
import { BigNumber, Wallet } from "ethers";

import { expect } from "chai";
import { BOAToken } from "../src/utils/Amount";

async function deployToken(deployer: Wallet, assetAccount: string): Promise<BOSAGORA> {
    const factory = await ethers.getContractFactory("BOSAGORA");
    const contract = (await factory.connect(deployer).deploy(assetAccount)) as BOSAGORA;
    await contract.deployed();
    await contract.deployTransaction.wait();
    return contract;
}

describe("Test for BOSAGORA token", () => {
    const raws = HardhatAccount.keys.map((m) => new Wallet(m, ethers.provider));
    const [deployer, assetAccount, anyone] = raws;

    let token: BOSAGORA;

    it("Create Token", async () => {
        token = await deployToken(deployer, assetAccount.address);

        assert.deepStrictEqual(await token.assetAccount(), assetAccount.address);
        assert.deepStrictEqual(await token.balanceOf(assetAccount.address), BigNumber.from(0));
        assert.deepStrictEqual(await token.name(), "BOSAGORA");
        assert.deepStrictEqual(await token.symbol(), "BOA");
        assert.deepStrictEqual(await token.decimals(), 7);
    });

    it("mint initial supply", async () => {
        assert.ok(token);

        const initialSupply = BOAToken.make(100_000_000).value;
        await token.connect(anyone).mint(initialSupply);

        // Check balance of target
        expect(await token.balanceOf(assetAccount.address)).to.equal(initialSupply);
    });
});
