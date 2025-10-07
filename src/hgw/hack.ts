/** @param {NS} ns */
export async function main(ns: NS) {
  const [target, time] = ns.args.map(a => a.toString());
  if (time === undefined) {
    await ns.hack(target);
  } else {
    const option = { additionalMsec: Math.floor(Number(time)) };
    await ns.hack(target, option);
  }
}