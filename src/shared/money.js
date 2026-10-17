import Decimal from 'decimal.js';

// Isolated Decimal constructor so we never mutate global config.
const Dec = Decimal.clone({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const D = (v) => new Dec(v);

/** Round to centavos (2 dp), half-up. */
const roundPeso = (v) => D(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** JSON-safe money string, always 2 decimals. */
const money = (v) => roundPeso(v).toFixed(2);

export { Dec, D, roundPeso, money };
