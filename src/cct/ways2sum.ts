//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.TotalWaysToSum)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  /** @type {number} */
  let number = contract.data

  // 1 =>  1 (1)
  // 2 =>  1 (1 + 1)
  // 3 =>  2 (2 + 1, 1 + 1 + 1)
  // 4 =>  4 (3+1, 2+2, 2+1+1, 1+1+1+1)
  // 5 =>  6 (4+1, 3+2, 3+1+1, 2+2+1, 2+1+1+1, 1+1+1+1+1)
  // 6 => 10 (5+1, 4+2, 4+1+1, 3+3, 3+2+1, 3+1+1+1, 2+2+2, 2+2+1+1, 2+1+1+1+1, 1+1+1+1+1+1)
  // 7 => 14 (6+1, 5+2, 5+1+1, 4+3, 4+2+1, 4+1+1+1, 3+3+1, 3+2+2, 3+2+1+1, 3+1+1+1+1, 2+2+2+1, 2+2+1+1+1, 2+1+1+1+1+1, 1+1+1+1+1+1+1)
  // 8 => 21 (7+1, 6+2, 6+1+1, 5+3, 5+2+1, 5+1+1+1, 4+4, 4+3+1, 4+2+2, 4+2+1+1, 4+1+1+1+1, 3+3+2, 3+3+1+1, 3+2+2+1, 3+2+1+1+1, 3+1+1+1+1+1, 2+2+2+2, 2+2+2+1+1, 2+2+1+1+1+1, 2+1+1+1+1+1+1, 1+1+1+1+1+1+1+1)

  // ways to calculate a number
  let ways = [1]
  ways.length = number + 1
  ways.fill(0, 1)
  for (let i = 1; i < number; i++) {
    for (let j = i; j <= number; j++) {
      ways[j] += ways[j - i]
    }
  }

  contract.setSolution(ways[number])
}