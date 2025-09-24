import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Algorithmic Stock Trader II")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {[{buy: number, sell: number, profit: number}]} possibleOrders Prices to analyze.
 * @return {number} Best profit to be made with these
 */
function determineBestProfit(possibleOrders) {
  let bestProfit = 0
  possibleOrders.forEach(selectedOrder => {
    if (selectedOrder.bestProfit === undefined) {
      const ordersAfterSelected = possibleOrders.filter(order => order.buy > selectedOrder.sell)
      selectedOrder.bestProfit = selectedOrder.profit + determineBestProfit(ordersAfterSelected)
    }
    if (selectedOrder.bestProfit > bestProfit) {
      bestProfit = selectedOrder.bestProfit
    }
  })
  return bestProfit
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[number]} */
  const prices = contract.data

  const indices = prices.map((p, i) => i)
  /** @type {[{buy: number, sell: number, profit: number}]} */
  const possibleOrders = indices.flatMap(ib => indices.filter(is => is > ib).map(is => {
    const order = { buy: ib, sell: is }
    order.profit = prices[is] - prices[ib] // sell - buy price
    return order
  })).filter(order => order.profit > 0)

  contract.setSolution(determineBestProfit(possibleOrders))
}