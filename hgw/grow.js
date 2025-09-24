/** @param {NS} ns */
export async function main(ns) {
  const [target, time] = ns.args;
  if (time === undefined) {
    await ns.grow(target);
  } else {
    const option = { additionalMsec: Math.floor(Number(time)) };
    await ns.grow(target, option);
  }
}