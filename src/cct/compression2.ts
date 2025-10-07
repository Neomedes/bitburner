//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.CompressionIILZDecompression)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const data = contract.data as string

  let result = ""
  let currentChunkType = 0 // 0 => direct copy, 1 => back-reference
  for (let i = 0; i < data.length; i++) {
    if (data[i] === "0") {
      // just change chunk type
      currentChunkType = 1 - currentChunkType
      continue
    }
    const length = parseInt(data[i])
    i++
    if (currentChunkType === 0) {
      // direct copy
      const copy = data.slice(i, i + length)
      // ns.tprintf("1: Copied %d char: %s", length, copy)
      result += copy
      i += length - 1
    } else {
      // back reference
      const charsBack = parseInt(data[i])
      // ns.tprintf("2: References %d times %d chars back", length, charsBack)
      // ns.tprintf("    was %s", result)
      for (let c = 0; c < length; c++) {
        result += result.slice(-charsBack, charsBack === 1 ? undefined : -charsBack + 1)
      }
      // ns.tprintf("    now %s", result)
    }
    currentChunkType = 1 - currentChunkType
  }

  contract.setSolution(result)
}