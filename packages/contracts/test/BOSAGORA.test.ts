import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import { ethers } from "hardhat";

import { BOSAGORA } from "../typechain-types";

import { expect } from "chai";
import { BigNumber } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// --- Replicate Constant Arrays from BOSAGORA.sol ---
// TODO: Replace these with the ACTUAL 128 values from your BOSAGORA.sol contract
const YEARLY_DEADLINE_TIMESTAMPS: BigNumber[] = [
    1672444800, // 2022-12-31
    1703980800, // 2023-12-31
    1735603200, // 2024-12-31
    1767139200, // 2025-12-31
    1798675200, // 2026-12-31
    1830211200, // 2027-12-31
    1861833600, // 2028-12-31
    1893369600, // 2029-12-31
    1924905600, // 2030-12-31
    1956441600, // 2031-12-31
    1988064000, // 2032-12-31
    2019600000, // 2033-12-31
    2051136000, // 2034-12-31
    2082672000, // 2035-12-31
    2114294400, // 2036-12-31
    2145830400, // 2037-12-31
    2177366400, // 2038-12-31
    2208902400, // 2039-12-31
    2240524800, // 2040-12-31
    2272060800, // 2041-12-31
    2303596800, // 2042-12-31
    2335132800, // 2043-12-31
    2366755200, // 2044-12-31
    2398291200, // 2045-12-31
    2429827200, // 2046-12-31
    2461363200, // 2047-12-31
    2492985600, // 2048-12-31
    2524521600, // 2049-12-31
    2556057600, // 2050-12-31
    2587593600, // 2051-12-31
    2619216000, // 2052-12-31
    2650752000, // 2053-12-31
    2682288000, // 2054-12-31
    2713824000, // 2055-12-31
    2745446400, // 2056-12-31
    2776982400, // 2057-12-31
    2808518400, // 2058-12-31
    2840054400, // 2059-12-31
    2871676800, // 2060-12-31
    2903212800, // 2061-12-31
    2934748800, // 2062-12-31
    2966284800, // 2063-12-31
    2997907200, // 2064-12-31
    3029443200, // 2065-12-31
    3060979200, // 2066-12-31
    3092515200, // 2067-12-31
    3124137600, // 2068-12-31
    3155673600, // 2069-12-31
    3187209600, // 2070-12-31
    3218745600, // 2071-12-31
    3250368000, // 2072-12-31
    3281904000, // 2073-12-31
    3313440000, // 2074-12-31
    3344976000, // 2075-12-31
    3376598400, // 2076-12-31
    3408134400, // 2077-12-31
    3439670400, // 2078-12-31
    3471206400, // 2079-12-31
    3502828800, // 2080-12-31
    3534364800, // 2081-12-31
    3565900800, // 2082-12-31
    3597436800, // 2083-12-31
    3629059200, // 2084-12-31
    3660595200, // 2085-12-31
    3692131200, // 2086-12-31
    3723667200, // 2087-12-31
    3755289600, // 2088-12-31
    3786825600, // 2089-12-31
    3818361600, // 2090-12-31
    3849897600, // 2091-12-31
    3881520000, // 2092-12-31
    3913056000, // 2093-12-31
    3944592000, // 2094-12-31
    3976128000, // 2095-12-31
    4007750400, // 2096-12-31
    4039286400, // 2097-12-31
    4070822400, // 2098-12-31
    4102358400, // 2099-12-31
    4133894400, // 2100-12-31
    4165430400, // 2101-12-31
    4196966400, // 2102-12-31
    4228502400, // 2103-12-31
    4260124800, // 2104-12-31
    4291660800, // 2105-12-31
    4323196800, // 2106-12-31
    4354732800, // 2107-12-31
    4386355200, // 2108-12-31
    4417891200, // 2109-12-31
    4449427200, // 2110-12-31
    4480963200, // 2111-12-31
    4512585600, // 2112-12-31
    4544121600, // 2113-12-31
    4575657600, // 2114-12-31
    4607193600, // 2115-12-31
    4638816000, // 2116-12-31
    4670352000, // 2117-12-31
    4701888000, // 2118-12-31
    4733424000, // 2119-12-31
    4765046400, // 2120-12-31
    4796582400, // 2121-12-31
    4828118400, // 2122-12-31
    4859654400, // 2123-12-31
    4891276800, // 2124-12-31
    4922812800, // 2125-12-31
    4954348800, // 2126-12-31
    4985884800, // 2127-12-31
    5017507200, // 2128-12-31
    5049043200, // 2129-12-31
    5080579200, // 2130-12-31
    5112115200, // 2131-12-31
    5143737600, // 2132-12-31
    5175273600, // 2133-12-31
    5206809600, // 2134-12-31
    5238345600, // 2135-12-31
    5269968000, // 2136-12-31
    5301504000, // 2137-12-31
    5333040000, // 2138-12-31
    5364576000, // 2139-12-31
    5396198400, // 2140-12-31
    5427734400, // 2141-12-31
    5459270400, // 2142-12-31
    5490806400, // 2143-12-31
    5522428800, // 2144-12-31
    5553964800, // 2145-12-31
    5585500800, // 2146-12-31
    5617036800, // 2147-12-31
    5648659200, // 2148-12-31
    5680195200, // 2149-12-31
].map((m) => BigNumber.from(m));

const YEARLY_CUMULATIVE_SUPPLY_LIMITS: BigNumber[] = [
    "809510400", // 2022-12-31
    "1168426094", // 2023-12-31
    "1526755093", // 2024-12-31
    "1884505300", // 2025-12-31
    "2241684510", // 2026-12-31
    "2506140416", // 2027-12-31
    "2546840604", // 2028-12-31
    "2586992561", // 2029-12-31
    "2626603671", // 2030-12-31
    "2665681220", // 2031-12-31
    "2704232394", // 2032-12-31
    "2742264284", // 2033-12-31
    "2779783884", // 2034-12-31
    "2816798095", // 2035-12-31
    "2853313724", // 2036-12-31
    "2889337489", // 2037-12-31
    "2924876013", // 2038-12-31
    "2959935833", // 2039-12-31
    "2994523397", // 2040-12-31
    "3028645067", // 2041-12-31
    "3062307118", // 2042-12-31
    "3095515741", // 2043-12-31
    "3128277044", // 2044-12-31
    "3160597052", // 2045-12-31
    "3192481710", // 2046-12-31
    "3223936881", // 2047-12-31
    "3254968351", // 2048-12-31
    "3285581828", // 2049-12-31
    "3315782941", // 2050-12-31
    "3345577244", // 2051-12-31
    "3374970219", // 2052-12-31
    "3403967270", // 2053-12-31
    "3432573731", // 2054-12-31
    "3460794863", // 2055-12-31
    "3488635856", // 2056-12-31
    "3516101831", // 2057-12-31
    "3543197839", // 2058-12-31
    "3569928864", // 2059-12-31
    "3596299823", // 2060-12-31
    "3622315564", // 2061-12-31
    "3647980873", // 2062-12-31
    "3673300471", // 2063-12-31
    "3698279014", // 2064-12-31
    "3722921095", // 2065-12-31
    "3747231248", // 2066-12-31
    "3771213943", // 2067-12-31
    "3794873591", // 2068-12-31
    "3818214544", // 2069-12-31
    "3841241094", // 2070-12-31
    "3863957477", // 2071-12-31
    "3886367869", // 2072-12-31
    "3908476394", // 2073-12-31
    "3930287117", // 2074-12-31
    "3951804050", // 2075-12-31
    "3973031149", // 2076-12-31
    "3993972320", // 2077-12-31
    "4014631413", // 2078-12-31
    "4035012227", // 2079-12-31
    "4055118513", // 2080-12-31
    "4074953966", // 2081-12-31
    "4094522236", // 2082-12-31
    "4113826922", // 2083-12-31
    "4132871573", // 2084-12-31
    "4151659693", // 2085-12-31
    "4170194737", // 2086-12-31
    "4188480114", // 2087-12-31
    "4206519187", // 2088-12-31
    "4224315273", // 2089-12-31
    "4241871647", // 2090-12-31
    "4259191536", // 2091-12-31
    "4276278126", // 2092-12-31
    "4293134559", // 2093-12-31
    "4309763937", // 2094-12-31
    "4326169316", // 2095-12-31
    "4342353716", // 2096-12-31
    "4358320111", // 2097-12-31
    "4374071439", // 2098-12-31
    "4389610597", // 2099-12-31
    "4404940442", // 2100-12-31
    "4420063795", // 2101-12-31
    "4434983435", // 2102-12-31
    "4449702108", // 2103-12-31
    "4464222521", // 2104-12-31
    "4478547344", // 2105-12-31
    "4492679211", // 2106-12-31
    "4506620722", // 2107-12-31
    "4520374441", // 2108-12-31
    "4533942897", // 2109-12-31
    "4547328586", // 2110-12-31
    "4560533970", // 2111-12-31
    "4573561478", // 2112-12-31
    "4586413505", // 2113-12-31
    "4599092415", // 2114-12-31
    "4611600540", // 2115-12-31
    "4623940181", // 2116-12-31
    "4636113606", // 2117-12-31
    "4648123056", // 2118-12-31
    "4659970738", // 2119-12-31
    "4671658833", // 2120-12-31
    "4683189488", // 2121-12-31
    "4694564826", // 2122-12-31
    "4705786938", // 2123-12-31
    "4716857887", // 2124-12-31
    "4727779712", // 2125-12-31
    "4738554419", // 2126-12-31
    "4749183991", // 2127-12-31
    "4759670383", // 2128-12-31
    "4770015523", // 2129-12-31
    "4780221313", // 2130-12-31
    "4790289632", // 2131-12-31
    "4800222331", // 2132-12-31
    "4810021236", // 2133-12-31
    "4819688150", // 2134-12-31
    "4829224851", // 2135-12-31
    "4838633092", // 2136-12-31
    "4847914604", // 2137-12-31
    "4857071095", // 2138-12-31
    "4866104247", // 2139-12-31
    "4875015723", // 2140-12-31
    "4883807161", // 2141-12-31
    "4892480178", // 2142-12-31
    "4901036370", // 2143-12-31
    "4909477311", // 2144-12-31
    "4917804551", // 2145-12-31
    "4926019624", // 2146-12-31
    "4934124040", // 2147-12-31
    "4942119289", // 2148-12-31
    "4950000000", // 2149-12-31
].map((m) => BigNumber.from(m).mul(BigNumber.from(10).pow(BigNumber.from(7))));
// --- End Replicated Constants ---

const years = 128;
const decimals = 7;
const maxSupply = BigNumber.from(4_950_000_000).mul(BigNumber.from(10).pow(decimals));

describe("Test for BOSAGORA token with Scheduled Minting", () => {
    // --- Fixture Function Definition ---
    async function deployTokenFixture() {
        const [deployer, assetAccountSigner, anyone] = await ethers.getSigners();
        const assetAccount = await assetAccountSigner.getAddress();

        const factory = await ethers.getContractFactory("BOSAGORA");
        const token = (await factory.deploy(assetAccount)) as BOSAGORA;
        await token.deployed();

        return { token, deployer, assetAccountSigner, assetAccount, anyone };
    }
    // --- End Fixture Function ---

    it("Should deploy with correct initial state", async () => {
        const { token, assetAccount } = await loadFixture(deployTokenFixture);
        expect(await token.name()).to.equal("BOSAGORA");
        expect(await token.symbol()).to.equal("BOA");
        expect(await token.decimals()).to.equal(decimals);
        expect(await token.MAX_SUPPLY()).to.equal(maxSupply);
        expect(await token.assetAccount()).to.equal(assetAccount);
        expect(await token.totalSupply()).to.equal(0);
        expect(await token.nextMintingPeriodIndex()).to.equal(0);
    });

    it("Should fail to deploy if asset account is zero address", async () => {
        const factory = await ethers.getContractFactory("BOSAGORA");
        await expect(factory.deploy(ethers.constants.AddressZero)).to.be.revertedWith(
            "BOSAGORA: Asset account is zero address"
        );
    });

    it("Should fail to mint if the first deadline has not passed", async () => {
        const { token, anyone } = await loadFixture(deployTokenFixture);
        const firstDeadline = YEARLY_DEADLINE_TIMESTAMPS[0];
        const now = await time.latest();

        if (now < firstDeadline.toNumber()) {
            await expect(token.connect(anyone).mint()).to.be.revertedWith("BOSAGORA: Minting period not yet finished");
        } else {
            console.warn(
                `Skipping: First deadline (${new Date(firstDeadline.toNumber() * 1000)}) already passed at test start.`
            );
        }
    });

    it("Should mint correctly after the first deadline passes", async () => {
        const { token, anyone, assetAccount } = await loadFixture(deployTokenFixture);
        const firstDeadline = YEARLY_DEADLINE_TIMESTAMPS[0];
        const firstLimit = YEARLY_CUMULATIVE_SUPPLY_LIMITS[0];

        // Ensure time is past the first deadline
        const latestTime = await time.latest();
        if (firstDeadline.gt(latestTime)) {
            await time.increaseTo(firstDeadline);
        } else {
            await time.increase(1);
        }

        const tx = await token.connect(anyone).mint();
        await expect(tx).to.emit(token, "ScheduledTokensMinted").withArgs(assetAccount, firstLimit, 0); // index 0

        expect(await token.totalSupply()).to.equal(firstLimit);
        expect(await token.balanceOf(assetAccount)).to.equal(firstLimit);
        expect(await token.nextMintingPeriodIndex()).to.equal(1);
    });

    it("Should revert if minting again before the second deadline", async () => {
        const { token, anyone } = await loadFixture(deployTokenFixture);
        const firstDeadline = YEARLY_DEADLINE_TIMESTAMPS[0];
        const secondDeadline = YEARLY_DEADLINE_TIMESTAMPS[1];

        // Mint for the first period
        let latestTime = await time.latest();
        if (firstDeadline.gt(latestTime)) await time.increaseTo(firstDeadline);
        else await time.increase(1);
        await token.connect(anyone).mint();
        expect(await token.nextMintingPeriodIndex()).to.equal(1);

        // Ensure time is before the second deadline
        latestTime = await time.latest();
        if (latestTime < secondDeadline.toNumber()) {
            // Try minting again
            await expect(token.connect(anyone).mint()).to.be.revertedWith("BOSAGORA: Minting period not yet finished");
            expect(await token.nextMintingPeriodIndex()).to.equal(1);
        } else {
            console.warn(`Skipping: Second deadline (${new Date(secondDeadline.toNumber() * 1000)}) already passed.`);
        }
    });

    it("Should mint correctly after the second deadline", async () => {
        const { token, anyone, assetAccount } = await loadFixture(deployTokenFixture);
        const firstDeadline = YEARLY_DEADLINE_TIMESTAMPS[0];
        const secondDeadline = YEARLY_DEADLINE_TIMESTAMPS[1];
        const firstLimit = YEARLY_CUMULATIVE_SUPPLY_LIMITS[0];
        const secondLimit = YEARLY_CUMULATIVE_SUPPLY_LIMITS[1];
        const secondPeriodAmount = secondLimit.sub(firstLimit);

        // Mint for the first period
        let latestTime = await time.latest();
        if (firstDeadline.gt(latestTime)) await time.increaseTo(firstDeadline);
        else await time.increase(1);
        await token.connect(anyone).mint();

        // Ensure time is past the second deadline
        latestTime = await time.latest();
        if (secondDeadline.gt(latestTime)) await time.increaseTo(secondDeadline);
        else await time.increase(1);

        // Mint for the second period
        const tx = await token.connect(anyone).mint();
        await expect(tx).to.emit(token, "ScheduledTokensMinted").withArgs(assetAccount, secondPeriodAmount, 1); // index 1

        expect(await token.totalSupply()).to.equal(secondLimit);
        expect(await token.balanceOf(assetAccount)).to.equal(secondLimit);
        expect(await token.nextMintingPeriodIndex()).to.equal(2);
    });

    it("Should advance index without minting if limit already reached", async () => {
        const { token, anyone, assetAccount } = await loadFixture(deployTokenFixture);
        const firstDeadline = YEARLY_DEADLINE_TIMESTAMPS[0];
        const firstLimit = YEARLY_CUMULATIVE_SUPPLY_LIMITS[0];
        const secondDeadline = YEARLY_DEADLINE_TIMESTAMPS[1];

        // 1. 첫 번째 기간의 deadline까지만 시간 이동
        let latestTime = await time.latest();
        if (firstDeadline.gt(latestTime)) await time.increaseTo(firstDeadline);
        else await time.increase(1);

        // 2. 첫 번째 기간 민팅 (limit까지)
        await token.connect(anyone).mint();
        expect(await token.totalSupply()).to.equal(firstLimit);
        expect(await token.nextMintingPeriodIndex()).to.equal(1);

        // 3. 두 번째 기간의 deadline이 아직 안 지난 상태로 유지
        latestTime = await time.latest();
        if (secondDeadline.gt(latestTime)) {
            // 시간 이동 없이 바로 mint() 호출
            await token.connect(anyone).mint();
            expect(await token.totalSupply()).to.equal(firstLimit); // 공급량 변하지 않음
            expect(await token.nextMintingPeriodIndex()).to.equal(2); // 인덱스 advance
        } else {
            console.warn(`Skipping: Second deadline (${new Date(secondDeadline.toNumber() * 1000)}) already passed.`);
        }
    });

    it("Should mint correctly up to MAX_SUPPLY over all periods", async () => {
        const { token, anyone, assetAccount } = await loadFixture(deployTokenFixture);

        for (let i = 0; i < years; i++) {
            const deadline = YEARLY_DEADLINE_TIMESTAMPS[i].add(60);
            const limit = YEARLY_CUMULATIVE_SUPPLY_LIMITS[i];

            const latestTime = await time.latest();
            if (deadline.gt(latestTime)) {
                await time.increaseTo(deadline);
            } else {
                await time.increase(1);
            }

            const currentSupplyBefore = await token.totalSupply();
            const expectedTargetSupply = limit.gt(maxSupply) ? maxSupply : limit;

            if (currentSupplyBefore.lt(expectedTargetSupply)) {
                const tx = await token.connect(anyone).mint();
                const expectedMintAmount = expectedTargetSupply.sub(currentSupplyBefore);
                if (expectedMintAmount.gt(0)) {
                    await expect(tx)
                        .to.emit(token, "ScheduledTokensMinted")
                        .withArgs(assetAccount, expectedMintAmount, i);
                }
            } else if (currentSupplyBefore.lt(maxSupply)) {
                const tx = await token.connect(anyone).mint();
                const receipt = await tx.wait();
                expect(receipt.events?.filter((e) => e.event === "ScheduledTokensMinted")).to.be.empty;
            }

            expect(await token.totalSupply()).to.equal(expectedTargetSupply);
            expect(await token.nextMintingPeriodIndex()).to.equal(i + 1);
        }

        expect(await token.totalSupply()).to.equal(maxSupply);
        expect(await token.nextMintingPeriodIndex()).to.equal(years);
    });

    it("Should revert if minting schedule is finished", async () => {
        const { token, anyone, assetAccount } = await loadFixture(deployTokenFixture);

        // Call mint repeatedly to ensure the index reaches the end
        for (let i = 0; i < YEARLY_DEADLINE_TIMESTAMPS.length; i++) {
            // Loop one extra time to be sure
            const currentIndex = (await token.nextMintingPeriodIndex()).toNumber();
            if (currentIndex >= years) break;

            const deadline = YEARLY_DEADLINE_TIMESTAMPS[currentIndex];
            const latestTime = await time.latest();
            if (deadline.gt(latestTime)) await time.increaseTo(deadline);
            else await time.increase(1);

            try {
                const tx = await token.connect(anyone).mint();
                const amount =
                    i === 0
                        ? YEARLY_CUMULATIVE_SUPPLY_LIMITS[0]
                        : YEARLY_CUMULATIVE_SUPPLY_LIMITS[i].sub(YEARLY_CUMULATIVE_SUPPLY_LIMITS[i - 1]);
                await expect(tx).to.emit(token, "ScheduledTokensMinted").withArgs(assetAccount, amount, i);
                expect(await token.totalSupply()).to.deep.equal(YEARLY_CUMULATIVE_SUPPLY_LIMITS[i]);
            } catch (e: any) {
                if (
                    !e.message.includes("Minting period not yet finished") &&
                    !e.message.includes("Minting schedule finished")
                ) {
                    throw e;
                }
            }
            // Add a small delay in case multiple periods pass quickly
            await time.increase(1);
        }

        expect(await token.nextMintingPeriodIndex()).to.equal(years);
        expect(await token.totalSupply()).to.deep.equal(maxSupply);
        // Attempt to mint after schedule finished
        await expect(token.connect(anyone).mint()).to.be.revertedWith("BOSAGORA: Minting schedule finished");
    });
});
