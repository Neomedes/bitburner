import { CodingContractName } from "@ns"
import { read_cct_file, write_cct_file } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = read_cct_file(ns)
  contracts.forEach(c => {
    const ccn : CodingContractName = ns.codingcontract.getContractType(c.file, c.host) as CodingContractName
    c.setType(ccn)
  })
  write_cct_file(ns, contracts)
}