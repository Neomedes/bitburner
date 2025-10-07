//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.HammingCodesEncodedBinaryToInteger)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const digits = (contract.data as string).split("").map(v => parseInt(v))

  // overall parity must be 0 or else there is an error
  const hasError = (digits.filter(v => v).length % 2) !== 0
  contract.setDebugData({ error_found: hasError })

  if (hasError) {
    function getParityBit(parityBitPos: number, binaryArray: number[]): number {
      const parity = binaryArray.filter((v, i) => i & parityBitPos)
        .filter(v => v === 1)
        .length % 2
      return parity
    }

    // calculate parity bits
    const errorPosition: number[] = []
    for (let nextParityBit = 0; 2 ** nextParityBit < digits.length; nextParityBit++) {
      errorPosition[nextParityBit] = getParityBit(2 ** nextParityBit, digits)
    }
    errorPosition.reverse() // reverse, because the least significant bits were first in the array
    const errorIndex = parseInt(errorPosition.join(""), 2)
    contract.setDebugData({ ...contract.debug_data, error_index: errorIndex })

    digits[errorIndex] = 1 - digits[errorIndex]
  }
  // remove parity 
  const payload: number[] = []
  let nextParityBit = 4
  for (let i = 3; i < digits.length; i++) {
    if (i === nextParityBit) {
      nextParityBit *= 2
      continue
    }
    payload.push(digits[i])
  }
  const binary = payload.join("")
  contract.setDebugData({ ...contract.debug_data, binary_result: binary })
  const result = parseInt(binary, 2)

  contract.setSolution(result)
}