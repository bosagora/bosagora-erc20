import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { BOSAGORA } from "../typechain";

describe("BOSAGORA", () => {
  it("Should return the initial balances", async () => {
    const provider = waffle.provider;
    const [admin] = provider.getWallets();

    const BOSAGORAToken = await ethers.getContractFactory("BOSAGORA");
    const token = (await BOSAGORAToken.deploy()) as BOSAGORA;
    await token.deployed();

    const total_supply = await token.totalSupply();
    expect(total_supply).to.equal("5421301301958463");

    const owner_balance = await token.balanceOf(admin.address);
    expect(owner_balance).to.equal("5421301301958463");
  });
});
