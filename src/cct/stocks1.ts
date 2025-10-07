//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.AlgorithmicStockTraderI)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

interface Order {
  buy: number,
  sell: number,
  profit: number,
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
  })).filter(ord => ord.profit > 0)

  const bestProfit = possibleOrders.map(ord => ord.profit).reduce((best, profit) => profit > best ? profit : best, 0)

  contract.setSolution(bestProfit)
}