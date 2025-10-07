//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.TotalWaysToSumII)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  /** @type {[number, number[]]} */
  let [sum, parts] = contract.data

  const ways = [1]
  ways.length = sum + 1
  ways.fill(0, 1)
  for (let i = 0; i < parts.length; i++) {
    for (let j = parts[i]; j <= sum; j++) {
      ways[j] += ways[j - parts[i]];
    }
  }

  contract.setSolution(ways[sum])
}