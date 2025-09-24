import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = get_unsolved_contracts(ns, "HammingCodes: Integer to Encoded Binary")
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns, contract) {
  // just_describe(ns, contract)

  /** @type {number} */
  const num = contract.data

  function getSize(payloadBitSize) {
    let parityCount = 3
    let size = 4
    while (size < payloadBitSize + parityCount) {
      size *= 2
      parityCount++
    }
    return payloadBitSize + parityCount
  }

  const binary = num.toString(2)
  const payload = binary.split("").map(v => parseInt(v))
  const full = new Array(getSize(payload.length)).fill(0).map(() => 0)

  // fill with payload
  let nextParityBit = 4
  for (let i = 3; i < full.length; i++) {
    if (nextParityBit === i) {
      nextParityBit *= 2
      continue
    }
    full[i] = payload.shift() ?? 0
  }

  function getParityBit(parityBitPos, binaryArray) {
    const parity = binaryArray.filter((v, i) => i & parityBitPos && i !== parityBitPos)
      .filter(v => v === 1)
      .length % 2
    return parity
  }

  // calculate parity bits
  for (nextParityBit = 1; nextParityBit < full.length; nextParityBit *= 2) {
    full[nextParityBit] = getParityBit(nextParityBit, full)
  }

  // calculate overall parity
  full[0] = full.reduce((a, b) => a ^ b, 0)
  const result = full.map(v => `${v}`).join("")

  contract.setSolution(result)
}