//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.AlgorithmicStockTraderII)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

interface Order {
  buy: number,
  sell: number,
  profit: number,
  bestProfit: number | undefined
}

/**
 * @param possibleOrders Prices to analyze.
 * @return Best profit to be made with these
 */
function determineBestProfit(possibleOrders: Order[]): number {
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
async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const prices = contract.data as number[]

  const indices = prices.map((p, i) => i)
  const possibleOrders = indices.flatMap(ib => indices.filter(is => is > ib).map(is => {
    return { buy: ib, sell: is, profit: prices[is] - prices[ib] } as Order
  })).filter(order => order.profit > 0)

  contract.setSolution(determineBestProfit(possibleOrders))
}