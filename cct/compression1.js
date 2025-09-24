import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Compression I: RLE Compression")
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

  const parts = []
  for (let i = 0; i < data.length; i++) {
    const firstChar = data[i]
    let length = data.slice(i).match(new RegExp(`^[${firstChar}]+`))[0].length
    while (length > 9) {
      parts.push(9 + firstChar)
      length -= 9
      i += 9
    }
    parts.push(length + firstChar)
    i += (length - 1)
  }

  contract.setSolution(parts.join(""))
}