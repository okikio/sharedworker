export function toNumber(num: unknown) {
  if (!Number.isNaN(num) && num !== Infinity) {
    return Math.max(parseInt(num as string), 0);
  }

  return 0;
}