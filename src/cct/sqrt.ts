//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.SquareRoot)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  // number is stored as string
  const bigNum = BigInt(contract.data)
  const placesSqrt = Math.ceil(contract.data.length / 2.0)

  let approx = BigInt("23" + "0".repeat(placesSqrt - 1))
  let nextApprox = (approx + bigNum / approx) / 2n

  function abs(n: bigint) { return (n < 0n) ? -n : n }
  for (let i = 0; i < placesSqrt / 2; i++) {
    approx = nextApprox
    nextApprox = (approx + (bigNum / approx)) / 2n
    // ns.tprintf("approx: %s", nextApprox.toString())
    if (approx == nextApprox) {
      break
    }
  }

  contract.setSolutions([nextApprox.toString(), (nextApprox + 1n).toString(), (nextApprox - 1n).toString()])
}