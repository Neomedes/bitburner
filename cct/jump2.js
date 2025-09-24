import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Array Jumping Game II")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[number]} */
  const jumps = contract.data

  let found = false
  let position = 0
  let choices = [] // in case of error
  while (jumps[position] != 0) {
    if (position + jumps[position] >= jumps.length - 1) {
      found = true
      break
    }
    let reachable = jumps.slice(position + 1, position + jumps[position] + 1)
    // determine best value
    let bestValue = reachable.map((d, i) => d + i).reduce((a, b) => Math.max(a, b), -1)
    let bestIndex = reachable.findIndex((d, i) => d + i == bestValue)
    position += bestIndex + 1
    choices.push([reachable, bestIndex, position])
  }

  contract.setSolution(found ? choices.length + 1 : 0)
}