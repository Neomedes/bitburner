//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.SpiralizeMatrix)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const MATRIX = contract.data as number[][]
  const SNAKE: number[] = []

  function matrixIsEmpty(matrix: number[][]) {
    return matrix.length == 0 || !matrix.some(m => m.length > 0)
  }

  let step = 0
  while (!matrixIsEmpty(MATRIX)) {
    if (step == 0) {
      // step 1: First row
      SNAKE.push(...MATRIX.shift()!)
    } else if (step == 1) {
      // step 2: Last column
      MATRIX.forEach(r => SNAKE.push(r.pop()!))
    } else if (step == 2) {
      // step 2: Last row reversed
      SNAKE.push(...MATRIX.pop()!.reverse())
    } else if (step == 3) {
      // step 2: First column bottom to top
      MATRIX.slice().reverse().forEach(r => SNAKE.push(r.shift()!))
    } else {
      // error
      ns.tprintf("Misstep in CCT-Spiralize: %d", step)
      ns.exit()
    }
    step = (step + 1) % 4
  }

  contract.setSolution(JSON.stringify(SNAKE))
}