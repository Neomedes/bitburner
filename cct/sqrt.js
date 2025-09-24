import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Square Root")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  // number is stored as string
  /** @type {BigInt} */
  const bigNum = BigInt(contract.data)
  const placesSqrt = Math.ceil(contract.data.length / 2.0)

  let approx = BigInt("23" + "0".repeat(placesSqrt - 1))
  let nextApprox = (approx + bigNum / approx) / 2n

  function abs(n) { return (n < 0n) ? -n : n }
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