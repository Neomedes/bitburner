/** @param {NS} ns */
export async function main(ns: NS) {
  const [target, time] = ns.args.map(a => a.toString());
  if (time === undefined) {
    await ns.grow(target);
  } else {
    const option = { additionalMsec: Math.floor(Number(time)) };
    await ns.grow(target, option);
  }
}