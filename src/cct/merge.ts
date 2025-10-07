//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.MergeOverlappingIntervals)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const arrays = contract.data as [number, number][]
  const merged: [number, number][] = []

  arrays.sort((a, b) => a[0] - b[0])

  arrays.forEach(a => {
    let overlapping = merged.find(m => a[0] <= m[1] && a[1] >= m[0])
    if (overlapping === undefined) {
      merged.push([a[0], a[1]])
    } else {
      overlapping[0] = Math.min(a[0], overlapping[0])
      overlapping[1] = Math.max(a[1], overlapping[1])
    }
  })

  contract.setSolution(JSON.stringify(merged))
}