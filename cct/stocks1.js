import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Algorithmic Stock Trader I")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[number]} */
  const prices = contract.data

  const indices = prices.map((p,i) => i)
  const possibleOrders = indices.flatMap(ib => indices.filter(is => is > ib).map(is => {
    const order = [ib,is]
    order.push(prices[is] - prices[ib]) // sell - buy price
    return order
  })).filter(([ib,is,diff]) => diff > 0)

  const bestOrder = possibleOrders.reduce((best, ord) => ord[2] > best[2] ? ord : best, [-1,-1,0])

  contract.setSolution(bestOrder[2])
}