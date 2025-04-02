import { BigNumber } from "ethers";

/**
 * The class that defines the Amount
 */
export class Amount {
    private readonly _value: BigNumber;
    private readonly _decimal: number;

    /**
     * Constructor
     * @param value The amount that have already been reflected
     * in the amount below the decimal point
     * @param decimal The number of decimal places.
     * It is used to convert to other decimal places.
     */
    constructor(value: BigNumber, decimal: number = 18) {
        this._value = BigNumber.from(value);
        if (decimal < 0) throw new Error("Invalid decimal");
        this._decimal = decimal;
    }

    /**
     * The amount
     */
    public get value(): BigNumber {
        return this._value;
    }

    /**
     * The number of decimal places.
     */
    public get decimal(): number {
        return this._decimal;
    }

    /**
     * If entered an amount that is BOA, save it as BigNumber considering the decimal point
     */
    public static make(boa: string | number, decimal: number = 18): Amount {
        if (decimal < 0) throw new Error("Invalid decimal");
        const amount = boa.toString();
        if (amount === "") return new Amount(BigNumber.from("0"), decimal);
        let ZeroString = "";
        for (let idx = 0; idx < decimal; idx++) ZeroString += "0";
        const numbers = amount.replace(/[,_]/gi, "").split(".");
        if (numbers.length === 1) return new Amount(BigNumber.from(numbers[0] + ZeroString), decimal);
        let tx_decimal = numbers[1];
        if (tx_decimal.length > decimal) tx_decimal = tx_decimal.slice(0, decimal);
        else if (tx_decimal.length < decimal) tx_decimal = tx_decimal.padEnd(decimal, "0");
        const integral = BigNumber.from(numbers[0] + ZeroString);
        return new Amount(integral.add(BigNumber.from(tx_decimal)), decimal);
    }

    /**
     * Converts the number of decimal places.
     */
    public convert(decimal: number): Amount {
        if (decimal < 0) throw new Error("Invalid decimal");
        if (decimal > this._decimal) {
            const factor = decimal - this._decimal;
            return new Amount(this._value.mul(BigNumber.from(10).pow(factor)), decimal);
        } else if (decimal < this._decimal) {
            const factor = this._decimal - decimal;
            return new Amount(this._value.div(BigNumber.from(10).pow(factor)), decimal);
        } else {
            return new Amount(this._value, decimal);
        }
    }

    /**
     * Output to String
     */
    public toString(): string {
        return this._value.toString();
    }

    /**
     * Output to String by BOA unit
     */
    public toBOAString(): string {
        const factor = BigNumber.from(10).pow(this._decimal);
        const integral = this._value.div(factor);
        const decimal = this._value.sub(integral.mul(factor));
        const integral_string = integral.toString();
        let decimal_string = decimal.toString();
        if (decimal_string.length < this._decimal) decimal_string = decimal_string.padStart(this._decimal, "0");
        return `${integral_string}.${decimal_string}`;
    }

    public toDisplayString(comma: boolean = false, precision: number = 0): string {
        const factor = BigNumber.from(10).pow(this._decimal);
        const share = this._value.div(factor);
        const remain = this._value.sub(share.mul(factor));
        const tx_share = comma
            ? share.toNumber().toLocaleString("en-US", { maximumFractionDigits: 7 })
            : share.toString();
        if (remain.eq(BigNumber.from(0))) {
            return tx_share;
        } else {
            let tx_remain = remain.toString();
            if (tx_remain.length < this._decimal) tx_remain = tx_remain.padStart(this._decimal, "0");
            if (precision !== undefined) tx_remain = tx_remain.substring(0, precision);
            if (tx_remain.length > 0) return tx_share + "." + tx_remain.replace(/0+$/g, "");
            else return tx_share;
        }
    }
}

/**
 * Used in the amount of BOA coin in BizNet
 */
export class BOAToken extends Amount {
    public static DECIMAL = 7;

    constructor(value: BigNumber) {
        super(value, BOAToken.DECIMAL);
    }

    public static make(value: string | number): BOAToken {
        return Amount.make(value, BOAToken.DECIMAL);
    }
}
