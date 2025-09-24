import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Minimum Path Sum in a Triangle")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {[number]} path
 * @return {number}
 */
function getPathLength(path) {
  return path.reduce((a, b) => a + b)
}

/**
 * @param {NS} ns
 * @param {[[number]]} triangle
 * @return {Promise<[number]>} The steps to take
 */
async function chooseSteps(ns, triangle) {
  const steps = triangle[0].slice()
  if (triangle.length === 1) {
    return steps
  }
  await ns.sleep(10)

  const leftTriangle = triangle.slice(1).map(row => row.slice(0, -1))
  const leftSteps = await chooseSteps(ns, leftTriangle)
  const leftCost = getPathLength(leftSteps)

  const rightTriangle = triangle.slice(1).map(row => row.slice(1))
  const rightSteps = await chooseSteps(ns, rightTriangle)
  const rightCost = getPathLength(rightSteps)

  const bestSteps = leftCost < rightCost ? leftSteps : rightSteps
  steps.push(...bestSteps)

  return steps
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[[number]]} */
  const triangle = contract.data

  const steps = await chooseSteps(ns, triangle)
  const length = getPathLength(steps)

  contract.setSolution(length)
}