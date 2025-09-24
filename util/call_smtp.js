/** @param {NS} ns */
export async function main(ns) {
  const targets = ns.args
  for (const t of targets) {
    ns.relaysmtp(t)
  }
}