import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Spiralize Matrix")
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
  const MATRIX = contract.data
  const SNAKE = []

  /**
   * @param {[[number]]} matrix
   */
  function matrixIsEmpty(matrix) {
    return matrix.length == 0 || !matrix.some(m => m.length > 0)
  }

  let step = 0
  while (!matrixIsEmpty(MATRIX)) {
    if (step == 0) {
      // step 1: First row
      SNAKE.push(...MATRIX.shift())
    } else if (step == 1) {
      // step 2: Last column
      MATRIX.forEach(r => SNAKE.push(r.pop()))
    } else if (step == 2) {
      // step 2: Last row reversed
      SNAKE.push(...MATRIX.pop().reverse())
    } else if (step == 3) {
      // step 2: First column bottom to top
      MATRIX.slice().reverse().forEach(r => SNAKE.push(r.shift()))
    } else {
      // error
      ns.tprintf("Misstep in CCT-Spiralize: %d", step)
      ns.exit()
    }
    step = (step + 1) % 4
  }

  contract.setSolution(JSON.stringify(SNAKE))
}