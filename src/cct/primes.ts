//import { CodingContractName } from "@ns";
import { MyContract, get_unsolved_contracts, update_contract, just_describe } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = get_unsolved_contracts(ns, ns.enums.CodingContractName.FindLargestPrimeFactor)
  if (!contracts?.length) return
  for (let c of contracts) { await solve(ns, c); update_contract(ns, c) }
}

function isFactor(number: number, factor: number): boolean {
  return Math.floor(number / factor) * factor == number
}

async function solve(ns: NS, contract: MyContract) {
  // just_describe(ns, contract)

  const originalNumber = contract.data as number

  const primes: number[] = []

  // fill primes array
  tryfactor: for (let i = 2; i < originalNumber; i++) {
    for (let p of primes) {
      if (isFactor(i, p)) {
        // found prime factor of i, so its not a prime factor itself
        continue tryfactor
      }
    }
    primes.push(i)
    if (i * i > originalNumber) {
      // We are above the square root of the number.
      // If we havent found any prime factor, the number itself must be prime.
      break tryfactor
    }
  }

  //ns.tprintf("Primes found: %s", JSON.stringify(primes))

  // We now have alist of prime factors.
  // Now search for those within the number
  let greatestPrime = 1
  let factors = []
  let number = originalNumber
  for (let p of primes) {
    while (isFactor(number, p)) {
      // found prime factor of the number, so divide it by the prime and continue searching
      number /= p
      greatestPrime = Math.max(greatestPrime, p)
      factors.push(p)
    }
    if (number < p) {
      // We have surpassed the primes known
      break
    }
  }
  if (greatestPrime < number) {
    // If we have still 1 as the greatest prime factor, the number itself must be prime
    greatestPrime = number
  }

  contract.setSolution(greatestPrime)
}