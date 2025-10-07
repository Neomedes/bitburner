//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract } from "lib/cct";

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.EncryptionICaesarCipher)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const [plaintext, shift] = contract.data as [string, number]

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