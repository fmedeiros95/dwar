/** World speeds are stored as thousandths to keep the database integer-based. */
export const worldSpeedMultiplier = (speed: number) => speed / 1000;
