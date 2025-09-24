import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Sanitize Parentheses in Expression")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {string} */
  const data = contract.data

  let left = 0, right = 0
  // count parentheses
  for (let i = 0; i < data.length; i++) {
    if (data[i] === "(") {
      ++left;
    } else if (data[i] === ")") {
      left > 0 ? --left : ++right;
    }
  }

  /**
   * @param {number} pair How many pairs of parentheses are open
   * @param {number} index Index of data to check.
   * @param {number} left Number of left parentheses to omit
   * @param {number} right Number of right parentheses to omit
   * @param {string} s The whole data string
   * @param {string} solution The solution the function is currently working on
   * @param {string[]} res The total array of solutions already found
   */
  function dfs(pair, index, left, right, s, solution, res) {
    if (s.length === index) {
      if (left === 0 && right === 0 && pair === 0) {
        for (let i = 0; i < res.length; i++) {
          if (res[i] === solution) {
            return;
          }
        }
        res.push(solution);
      }
      return;
    }

    if (s[index] === "(") {
      if (left > 0) {
        dfs(pair, index + 1, left - 1, right, s, solution, res);
      }
      dfs(pair + 1, index + 1, left, right, s, solution + s[index], res);
    } else if (s[index] === ")") {
      if (right > 0) dfs(pair, index + 1, left, right - 1, s, solution, res);
      if (pair > 0) dfs(pair - 1, index + 1, left, right, s, solution + s[index], res);
    } else {
      dfs(pair, index + 1, left, right, s, solution + s[index], res);
    }
  }

  const res = []
  dfs(0, 0, left, right, data, "", res);

  contract.setSolution(JSON.stringify(res))
}