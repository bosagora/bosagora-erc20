// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title BOSAGORA Token
 * @dev Implementation of the BOSAGORA token with scheduled minting based on yearly timestamps.
 *
 * This contract implements the BOSAGORA token with the following features:
 * - Fixed maximum supply of 4.95 billion BOA tokens
 * - 7 decimal places
 * - Scheduled minting over 128 years based on predefined deadlines and cumulative limits.
 * - Minting up to the yearly limit targets a specific asset account.
 * - Permissionless minting trigger (anyone can call mint after conditions are met).
 * - No ownership or administrative functions after deployment.
 */
contract BOSAGORA is ERC20 {
    /*
     *  Constants
     */
    string private constant NAME = "BOSAGORA";
    string private constant SYMBOL = "BOA";
    uint8 private constant DECIMALS = 7;
    uint256 public constant MAX_SUPPLY = 4_950_000_000 * 10 ** DECIMALS;

    // --- Minting Schedule Constants (128 Years) ---
    // Starts from 2022-12-31 UTC
    uint256[128] private YEARLY_DEADLINE_TIMESTAMPS = [
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
        5680195200 // 2149-12-31
    ];

    uint256[128] private YEARLY_CUMULATIVE_SUPPLY_LIMITS = [
        809_510_400 * 10 ** DECIMALS, // 2022-12-31
        1_168_426_094 * 10 ** DECIMALS, // 2023-12-31
        1_526_755_093 * 10 ** DECIMALS, // 2024-12-31
        1_884_505_300 * 10 ** DECIMALS, // 2025-12-31
        2_241_684_510 * 10 ** DECIMALS, // 2026-12-31
        2_506_140_416 * 10 ** DECIMALS, // 2027-12-31
        2_546_840_604 * 10 ** DECIMALS, // 2028-12-31
        2_586_992_561 * 10 ** DECIMALS, // 2029-12-31
        2_626_603_671 * 10 ** DECIMALS, // 2030-12-31
        2_665_681_220 * 10 ** DECIMALS, // 2031-12-31
        2_704_232_394 * 10 ** DECIMALS, // 2032-12-31
        2_742_264_284 * 10 ** DECIMALS, // 2033-12-31
        2_779_783_884 * 10 ** DECIMALS, // 2034-12-31
        2_816_798_095 * 10 ** DECIMALS, // 2035-12-31
        2_853_313_724 * 10 ** DECIMALS, // 2036-12-31
        2_889_337_489 * 10 ** DECIMALS, // 2037-12-31
        2_924_876_013 * 10 ** DECIMALS, // 2038-12-31
        2_959_935_833 * 10 ** DECIMALS, // 2039-12-31
        2_994_523_397 * 10 ** DECIMALS, // 2040-12-31
        3_028_645_067 * 10 ** DECIMALS, // 2041-12-31
        3_062_307_118 * 10 ** DECIMALS, // 2042-12-31
        3_095_515_741 * 10 ** DECIMALS, // 2043-12-31
        3_128_277_044 * 10 ** DECIMALS, // 2044-12-31
        3_160_597_052 * 10 ** DECIMALS, // 2045-12-31
        3_192_481_710 * 10 ** DECIMALS, // 2046-12-31
        3_223_936_881 * 10 ** DECIMALS, // 2047-12-31
        3_254_968_351 * 10 ** DECIMALS, // 2048-12-31
        3_285_581_828 * 10 ** DECIMALS, // 2049-12-31
        3_315_782_941 * 10 ** DECIMALS, // 2050-12-31
        3_345_577_244 * 10 ** DECIMALS, // 2051-12-31
        3_374_970_219 * 10 ** DECIMALS, // 2052-12-31
        3_403_967_270 * 10 ** DECIMALS, // 2053-12-31
        3_432_573_731 * 10 ** DECIMALS, // 2054-12-31
        3_460_794_863 * 10 ** DECIMALS, // 2055-12-31
        3_488_635_856 * 10 ** DECIMALS, // 2056-12-31
        3_516_101_831 * 10 ** DECIMALS, // 2057-12-31
        3_543_197_839 * 10 ** DECIMALS, // 2058-12-31
        3_569_928_864 * 10 ** DECIMALS, // 2059-12-31
        3_596_299_823 * 10 ** DECIMALS, // 2060-12-31
        3_622_315_564 * 10 ** DECIMALS, // 2061-12-31
        3_647_980_873 * 10 ** DECIMALS, // 2062-12-31
        3_673_300_471 * 10 ** DECIMALS, // 2063-12-31
        3_698_279_014 * 10 ** DECIMALS, // 2064-12-31
        3_722_921_095 * 10 ** DECIMALS, // 2065-12-31
        3_747_231_248 * 10 ** DECIMALS, // 2066-12-31
        3_771_213_943 * 10 ** DECIMALS, // 2067-12-31
        3_794_873_591 * 10 ** DECIMALS, // 2068-12-31
        3_818_214_544 * 10 ** DECIMALS, // 2069-12-31
        3_841_241_094 * 10 ** DECIMALS, // 2070-12-31
        3_863_957_477 * 10 ** DECIMALS, // 2071-12-31
        3_886_367_869 * 10 ** DECIMALS, // 2072-12-31
        3_908_476_394 * 10 ** DECIMALS, // 2073-12-31
        3_930_287_117 * 10 ** DECIMALS, // 2074-12-31
        3_951_804_050 * 10 ** DECIMALS, // 2075-12-31
        3_973_031_149 * 10 ** DECIMALS, // 2076-12-31
        3_993_972_320 * 10 ** DECIMALS, // 2077-12-31
        4_014_631_413 * 10 ** DECIMALS, // 2078-12-31
        4_035_012_227 * 10 ** DECIMALS, // 2079-12-31
        4_055_118_513 * 10 ** DECIMALS, // 2080-12-31
        4_074_953_966 * 10 ** DECIMALS, // 2081-12-31
        4_094_522_236 * 10 ** DECIMALS, // 2082-12-31
        4_113_826_922 * 10 ** DECIMALS, // 2083-12-31
        4_132_871_573 * 10 ** DECIMALS, // 2084-12-31
        4_151_659_693 * 10 ** DECIMALS, // 2085-12-31
        4_170_194_737 * 10 ** DECIMALS, // 2086-12-31
        4_188_480_114 * 10 ** DECIMALS, // 2087-12-31
        4_206_519_187 * 10 ** DECIMALS, // 2088-12-31
        4_224_315_273 * 10 ** DECIMALS, // 2089-12-31
        4_241_871_647 * 10 ** DECIMALS, // 2090-12-31
        4_259_191_536 * 10 ** DECIMALS, // 2091-12-31
        4_276_278_126 * 10 ** DECIMALS, // 2092-12-31
        4_293_134_559 * 10 ** DECIMALS, // 2093-12-31
        4_309_763_937 * 10 ** DECIMALS, // 2094-12-31
        4_326_169_316 * 10 ** DECIMALS, // 2095-12-31
        4_342_353_716 * 10 ** DECIMALS, // 2096-12-31
        4_358_320_111 * 10 ** DECIMALS, // 2097-12-31
        4_374_071_439 * 10 ** DECIMALS, // 2098-12-31
        4_389_610_597 * 10 ** DECIMALS, // 2099-12-31
        4_404_940_442 * 10 ** DECIMALS, // 2100-12-31
        4_420_063_795 * 10 ** DECIMALS, // 2101-12-31
        4_434_983_435 * 10 ** DECIMALS, // 2102-12-31
        4_449_702_108 * 10 ** DECIMALS, // 2103-12-31
        4_464_222_521 * 10 ** DECIMALS, // 2104-12-31
        4_478_547_344 * 10 ** DECIMALS, // 2105-12-31
        4_492_679_211 * 10 ** DECIMALS, // 2106-12-31
        4_506_620_722 * 10 ** DECIMALS, // 2107-12-31
        4_520_374_441 * 10 ** DECIMALS, // 2108-12-31
        4_533_942_897 * 10 ** DECIMALS, // 2109-12-31
        4_547_328_586 * 10 ** DECIMALS, // 2110-12-31
        4_560_533_970 * 10 ** DECIMALS, // 2111-12-31
        4_573_561_478 * 10 ** DECIMALS, // 2112-12-31
        4_586_413_505 * 10 ** DECIMALS, // 2113-12-31
        4_599_092_415 * 10 ** DECIMALS, // 2114-12-31
        4_611_600_540 * 10 ** DECIMALS, // 2115-12-31
        4_623_940_181 * 10 ** DECIMALS, // 2116-12-31
        4_636_113_606 * 10 ** DECIMALS, // 2117-12-31
        4_648_123_056 * 10 ** DECIMALS, // 2118-12-31
        4_659_970_738 * 10 ** DECIMALS, // 2119-12-31
        4_671_658_833 * 10 ** DECIMALS, // 2120-12-31
        4_683_189_488 * 10 ** DECIMALS, // 2121-12-31
        4_694_564_826 * 10 ** DECIMALS, // 2122-12-31
        4_705_786_938 * 10 ** DECIMALS, // 2123-12-31
        4_716_857_887 * 10 ** DECIMALS, // 2124-12-31
        4_727_779_712 * 10 ** DECIMALS, // 2125-12-31
        4_738_554_419 * 10 ** DECIMALS, // 2126-12-31
        4_749_183_991 * 10 ** DECIMALS, // 2127-12-31
        4_759_670_383 * 10 ** DECIMALS, // 2128-12-31
        4_770_015_523 * 10 ** DECIMALS, // 2129-12-31
        4_780_221_313 * 10 ** DECIMALS, // 2130-12-31
        4_790_289_632 * 10 ** DECIMALS, // 2131-12-31
        4_800_222_331 * 10 ** DECIMALS, // 2132-12-31
        4_810_021_236 * 10 ** DECIMALS, // 2133-12-31
        4_819_688_150 * 10 ** DECIMALS, // 2134-12-31
        4_829_224_851 * 10 ** DECIMALS, // 2135-12-31
        4_838_633_092 * 10 ** DECIMALS, // 2136-12-31
        4_847_914_604 * 10 ** DECIMALS, // 2137-12-31
        4_857_071_095 * 10 ** DECIMALS, // 2138-12-31
        4_866_104_247 * 10 ** DECIMALS, // 2139-12-31
        4_875_015_723 * 10 ** DECIMALS, // 2140-12-31
        4_883_807_161 * 10 ** DECIMALS, // 2141-12-31
        4_892_480_178 * 10 ** DECIMALS, // 2142-12-31
        4_901_036_370 * 10 ** DECIMALS, // 2143-12-31
        4_909_477_311 * 10 ** DECIMALS, // 2144-12-31
        4_917_804_551 * 10 ** DECIMALS, // 2145-12-31
        4_926_019_624 * 10 ** DECIMALS, // 2146-12-31
        4_934_124_040 * 10 ** DECIMALS, // 2147-12-31
        4_942_119_289 * 10 ** DECIMALS, // 2148-12-31
        MAX_SUPPLY // 2149-12-31
    ];
    // --- End Minting Schedule Constants ---

    /*
     *  Storage
     */
    address public immutable assetAccount; // Address that receives all minted tokens.
    // Index of the next minting period deadline in the timestamp array.
    uint256 public nextMintingPeriodIndex;

    /*
     *  Events
     */
    /**
     * @notice Emitted when tokens are created according to the schedule.
     * @param account The account that received the minted tokens (always assetAccount).
     * @param amount The amount of tokens minted.
     * @param periodIndex The index of the minting period that was just completed.
     */
    event ScheduledTokensMinted(address indexed account, uint256 amount, uint256 periodIndex);

    /*
     * Public functions
     */
    /**
     * @dev Initializes the contract, setting the asset account address.
     * @param account The address that will receive all minted tokens.
     *
     * Requirements:
     * - The account cannot be the zero address.
     */
    constructor(address account) ERC20(NAME, SYMBOL) {
        require(account != address(0), "BOSAGORA: Asset account is zero address");
        assetAccount = account;
    }

    /**
     * @dev Mints new tokens according to the schedule if the current timestamp has passed the next deadline.
     * Can be called by anyone.
     * Mints tokens up to the cumulative limit defined for the passed deadline.
     *
     * Requirements:
     * - The current timestamp must be greater than or equal to the timestamp at `nextMintingPeriodIndex`.
     * - `nextMintingPeriodIndex` must be within the bounds of the schedule arrays.
     * - Current total supply must be less than the limit for the completed period.
     *
     * Emits a {ScheduledTokensMinted} event if tokens are minted.
     */
    function mint() external {
        uint256 currentIndex = nextMintingPeriodIndex;
        require(currentIndex < 128, "BOSAGORA: Minting schedule finished");

        // Access storage array directly
        uint256 currentDeadline = YEARLY_DEADLINE_TIMESTAMPS[currentIndex];
        require(block.timestamp >= currentDeadline, "BOSAGORA: Minting period not yet finished");

        // Access storage array directly
        uint256 targetSupply = YEARLY_CUMULATIVE_SUPPLY_LIMITS[currentIndex];

        uint256 currentSupply = totalSupply();
        if (currentSupply >= targetSupply) {
            nextMintingPeriodIndex = currentIndex + 1;
            return;
        }

        uint256 amount = targetSupply - currentSupply;
        if (amount > 0) {
            nextMintingPeriodIndex = currentIndex + 1;
            _mint(assetAccount, amount);
            emit ScheduledTokensMinted(assetAccount, amount, currentIndex);
        } else {
            nextMintingPeriodIndex = currentIndex + 1;
        }
    }

    /**
     * @dev Returns the number of decimals.
     */
    function decimals() public view virtual override returns (uint8) {
        return DECIMALS;
    }
}
