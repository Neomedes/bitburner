import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Merge Overlapping Intervals")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[number, number][]} */
  const arrays = contract.data
  const merged = []

  arrays.sort((a, b) => a[0] - b[0])

  arrays.forEach(a => {
    let overlapping = merged.find(m => a[0] <= m[1] && a[1] >= m[0])
    if (overlapping === undefined) {
      merged.push(a.slice())
    } else {
      overlapping[0] = Math.min(a[0], overlapping[0])
      overlapping[1] = Math.max(a[1], overlapping[1])
    }
  })

  contract.setSolution(JSON.stringify(merged))
}