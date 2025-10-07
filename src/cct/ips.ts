//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.GenerateIPAddresses)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

/**
 * @param number Number to part
 * @param remainingParts Number of parts that must be build by the number
 * @return The possible 
 */
function partNumber(number: string, remainingParts: number): string[] {
  let possibleNextParts = []
  // impossible
  if (number.length > remainingParts * 3 || number.length < 1) {
    return []
  }
  // single digits
  if (remainingParts > 1 || number.length == 1) {
    possibleNextParts.push(number.charAt(0))
  }
  if (number.charAt(0) !== '0' && number.length > 1) {
    // two digits (if not starting with zero)
    if (remainingParts > 1 || number.length == 2) {
      possibleNextParts.push(number.slice(0, 2))
    }
    // three digits (if not greater than 255)
    if (number.length > 2) {
      let threeDigits = number.slice(0, 3)
      if (parseInt(threeDigits) < 256 && (remainingParts > 1 || number.length == 3)) {
        possibleNextParts.push(threeDigits)
      }
    }
  }

  // now we have all possibilities for the next
  if (remainingParts == 1) {
    return possibleNextParts
  } else {
    let parts: string[] = []
    possibleNextParts.forEach(p1 => {
      let remainingNumber = number.slice(p1.length)
      let possibleRemainders = partNumber(remainingNumber, remainingParts - 1)
      possibleRemainders.forEach(r => {
        parts.push(`${p1}.${r}`)
      })
    })
    return parts
  }
}

/**
 * @param {NS} ns
 * @param {MyContract} contract
 */
async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const number = contract.data as string
  const possibilities = partNumber(number, 4)

  contract.setSolution(JSON.stringify(possibilities))
}