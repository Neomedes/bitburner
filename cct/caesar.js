import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "Encryption I: Caesar Cipher")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {[string, number]} */
  const [plaintext, shift] = contract.data

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
  const ROTATED = ALPHABET.map((c, i) => ALPHABET[(i + ALPHABET.length - shift) % ALPHABET.length])

  const cipher = plaintext.split("").map(c => {
    if (!ALPHABET.includes(c)) {
      return c
    }
    return ROTATED[ALPHABET.indexOf(c)]
  }).join("")

  contract.setSolution(cipher)
}