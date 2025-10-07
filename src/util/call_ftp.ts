/** @param {NS} ns */
export async function main(ns: NS) {
  const targets = ns.args
  for (const t of targets) {
    ns.ftpcrack(t.toString())
  }
}