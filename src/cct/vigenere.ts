//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.EncryptionIIVigenereCipher)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  /** @type {[string, string]} */
  const [plaintext, keyword] = contract.data

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
  const VIGENERE_SQARE = ALPHABET.map((c, i) => ALPHABET.map((b, j) => ALPHABET[(i + j) % ALPHABET.length]))

  let cipher = ""
  const keylong = keyword.repeat(Math.ceil(plaintext.length / keyword.length)).split("")
  for (let i = 0; i < plaintext.length; i++) {
    const keychar = keylong.shift()
    if (!ALPHABET.includes(plaintext[i])) {
      cipher += plaintext[i]
    } else {
      cipher += VIGENERE_SQARE[ALPHABET.indexOf(plaintext[i])][ALPHABET.indexOf(keychar)]
    }
  }

  contract.setSolution(cipher)
}