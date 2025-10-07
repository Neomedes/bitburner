//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.AlgorithmicStockTraderIV)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

interface Order {
  buy: number,
  sell: number,
  profit: number,
  bestProfits: number[] | undefined,
}

async function getProfit(ns: NS, order: Order | null, goodOrders: Order[], remainingOrderCount: number): Promise<number> {
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
async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  /** @type {[number, [number]]} */
  const [maxOrderCount, prices] = contract.data as [number, number[]]

  const indices = prices.map((p, i) => i)
  const possibleOrders: Order[] = indices.flatMap(ib => indices.filter(is => is > ib).map(is => {
    const order = { buy: ib, sell: is } as Order
    order.profit = prices[is] - prices[ib] // sell - buy price
    return order
  })).filter(order => order.profit > 0)

  const bestProfit = await getProfit(ns, null, possibleOrders, maxOrderCount)

  contract.setSolution(bestProfit)
}