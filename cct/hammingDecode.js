import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "HammingCodes: Encoded Binary to Integer")
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
  const digits = contract.data.split("").map(v => parseInt(v))

  // overall parity must be 0 or else there is an error
  const hasError = (digits.filter(v => v).length % 2) !== 0
  contract.setDebugData({ error_found: hasError })

  if (hasError) {
    function getParityBit(parityBitPos, binaryArray) {
      const parity = binaryArray.filter((v, i) => i & parityBitPos)
        .filter(v => v === 1)
        .length % 2
      return parity
    }

    // calculate parity bits
    const errorPosition = []
    for (let nextParityBit = 0; 2 ** nextParityBit < digits.length; nextParityBit++) {
      errorPosition[nextParityBit] = getParityBit(2 ** nextParityBit, digits)
    }
    errorPosition.reverse() // reverse, because the least significant bits were first in the array
    const errorIndex = parseInt(errorPosition.join(""), 2)
    contract.setDebugData({ ...contract.debug_data, error_index: errorIndex })

    digits[errorIndex] = 1 - digits[errorIndex]
  }
  // remove parity 
  const payload = []
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