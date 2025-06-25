/** Useful for asserting timestamps without precision affecting the result. */
export const floorToThousand = (num: number) => Math.floor(num / 1000) * 1000;
