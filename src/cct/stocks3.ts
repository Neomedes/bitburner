//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.AlgorithmicStockTraderIII)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const prices = contract.data as number[]

  const indices = prices.map((p, i) => i)
  /** @type {[{buy: number, sell: number, profit: number}]} */
  const possibleOrders = indices.flatMap(ib => indices.filter(is => is > ib).map(is => {
    return { buy: ib, sell: is, profit: prices[is] - prices[ib], bestProfit: 0 }
  })).filter(order => order.profit > 0)

  possibleOrders.forEach(order => {
    const ordersAfterSelected = possibleOrders.filter(o => o.buy > order.sell)
    const bestRemainingOrder = ordersAfterSelected.reduce((o1, o2) => o2.profit > o1.profit ? o2 : o1, { profit: 0 })
    order.bestProfit = order.profit + bestRemainingOrder.profit
  })

  const bestOrder = possibleOrders.reduce((o1, o2) => o1 === undefined || o2.bestProfit > o1.bestProfit ? o2 : o1, { bestProfit: 0 })

  contract.setSolution(bestOrder.bestProfit ?? 0)
}