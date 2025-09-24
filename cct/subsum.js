import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Subarray with Maximum Sum")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {number[]} */
  let array = contract.data

  let sum = Number.NEGATIVE_INFINITY
  // search for start
  for (let s = 0; s < array.length; s++) {
    // search for end
    for (let e = s; e < array.length; e++) {
      let partialSum = array.slice(s, e + 1).reduce((a, b) => a + b, 0)
      if (partialSum > sum) {
        sum = partialSum
      }
    }
  }

  contract.setSolution(sum)
}