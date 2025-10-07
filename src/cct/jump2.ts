//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.ArrayJumpingGameII)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const jumps = contract.data as number[]

  let found = false
  let position = 0
  let choices: [number[], number, number][] = [] // in case of error
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