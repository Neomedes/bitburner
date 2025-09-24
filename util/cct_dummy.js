/** @param {NS} ns */
export async function main(ns) {
  const [type] = ns.args
  ns.codingcontract.createDummyContract(type)
}