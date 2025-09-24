import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Unique Paths in a Grid I")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[number, number]} */
  const [width, height] = contract.data
  /** @type {number[][]} */
  const steps = Array(width).fill(0).map(() => Array(height).fill(0))

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      steps[x][y] = x === 0 || y === 0 ? 1 : steps[x - 1][y] + steps[x][y - 1]
    }
  }

  const pathCount = steps[width - 1][height - 1]

  contract.setSolution(pathCount)
}