import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Algorithmic Stock Trader IV")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {{buy: number, sell: number, profit: number}} order
 * @param {[{buy: number, sell: number, profit: number}]} goodOrders
 * @param {number} remainingOrderCount
 * @return {Promise<number>}
 */
async function getProfit(ns, order, goodOrders, remainingOrderCount) {
  if (remainingOrderCount < 0 || goodOrders.length < 1) {
    return 0
  }
  await ns.sleep(10)
  ns.printf("getProfit(%s, %d)", JSON.stringify(order), remainingOrderCount)
  const remainingOrders = order == null ? goodOrders : goodOrders.filter(o => o.buy > order.sell)
  let bestRemainingOrderProfit = 0
  for (let o of remainingOrders) {
    if (o.bestProfits === undefined) {
      o.bestProfits = []
    }
    if (o.bestProfits[remainingOrderCount - 1] === undefined) {
      o.bestProfits[remainingOrderCount - 1] = await getProfit(ns, o, remainingOrders, remainingOrderCount - 1)
    }
    if (o.bestProfits[remainingOrderCount - 1] > bestRemainingOrderProfit) {
      bestRemainingOrderProfit = o.bestProfits[remainingOrderCount - 1]
    }
  }
  const result = bestRemainingOrderProfit + (order == null ? 0 : order.profit)
  ns.printf("getProfit(%s, %d) => %d", JSON.stringify(order), remainingOrderCount, result)
  return result
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[number, [number]]} */
  const [maxOrderCount, prices] = contract.data

  const indices = prices.map((p, i) => i)
  /** @type {[{buy: number, sell: number, profit: number}]} */
  const possibleOrders = indices.flatMap(ib => indices.filter(is => is > ib).map(is => {
    const order = { buy: ib, sell: is }
    order.profit = prices[is] - prices[ib] // sell - buy price
    return order
  })).filter(order => order.profit > 0)

  const bestProfit = await getProfit(ns, null, possibleOrders, maxOrderCount)

  contract.setSolution(bestProfit)
}