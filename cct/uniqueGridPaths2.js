import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Unique Paths in a Grid II")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[[number]]} */
  const rect = contract.data
  const rows = rect.length
  const columns = rect[0].length

  const steps = new Array(rows).fill(0).map((a, r) => new Array(columns).fill(0));
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = columns - 1; c >= 0; c--) {
      if (rect[r][c] === 0) {
        // no obstacle, so calculate
        if (r === rows - 1) {
          if (c === columns - 1) {
            // last row (first iteration) and last column (first iteration) -> save that there is no obstacle
            steps[r][c] = 1
          } else {
            // last row (first iteration) but not last column -> just step right
            steps[r][c] = steps[r][c + 1]
          }
        } else {
          if (c === columns - 1) {
            // last column (first iteration) but not last row -> just step down
            steps[r][c] = steps[r + 1][c]
          } else {
            // neither last row nor last column -> step one time right and one time step down
            steps[r][c] = steps[r][c + 1] + steps[r + 1][c]
          }
        }
      }
      // else: leave as 0
    }
  }

  const pathCount = steps[0][0]

  contract.setSolution(pathCount)
}