import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Find All Valid Math Expressions")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[string, number]} */
  const [data, target] = contract.data

  /**
   * @param {string[]} correctEquations The already found equations.
   * @param {string} equation The equation we are currently working on.
   * @param {string} original The original numbers.
   * @param {number} target The needed target solution for correct equations.
   * @param {number} index The position of the original numbers we are currently working on.
   * @param {number} equationResult The current result of the equation we are currently working on.
   * @param {number} lastAdd The number added last, because if we multiply in the next step we need to adhere to the normal order of operations.
   */
  async function rollingTest(correctEquations, equation, original, target, index, equationResult, lastAdd) {
    if (original.length >= 6 && index == original.length - 6) {
      // we sleep everytime on level 5
      await ns.sleep(10)
    }

    ns.printf("Test %s = %d", equation, equationResult)

    // are we there yet?
    if (index === original.length) {

      if (equationResult === target) {
        correctEquations.push(equation)
      }
      // we have no more numbers to use
      return
    }

    for (let i = index; i < original.length; i++) {
      if (i != index && original[index] === "0") {
        // we have a leading zero, so stop after the first iteration
        break
      }
      const num = parseInt(original.substring(index, i + 1))

      if (index === 0) {
        // special case: we just started
        await rollingTest(correctEquations, `${num}`, original, target, i + 1, num, num)
      } else {
        // Test add, subtract and multiply
        await rollingTest(correctEquations, `${equation}+${num}`, original, target, i + 1, equationResult + num, num)
        await rollingTest(correctEquations, `${equation}-${num}`, original, target, i + 1, equationResult - num, -num)
        await rollingTest(correctEquations, `${equation}*${num}`, original, target, i + 1, equationResult - lastAdd + lastAdd * num, lastAdd * num)
      }
    }
  }

  const result = []
  await rollingTest(result, "", data, target, 0, 0, 0)

  contract.setSolution(JSON.stringify(result))
}