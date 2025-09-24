/** @param {NS} ns */
export async function main(ns) {
  const [target, time] = ns.args;
  if (time === undefined) {
    await ns.hack(target);
  } else {
    const option = { additionalMsec: Math.floor(Number(time)) };
    await ns.hack(target, option);
  }
}