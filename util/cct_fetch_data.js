import { read_cct_file, write_cct_file } from "lib/cct.js"

/** @param {NS} ns */
export async function main(ns) {
  const contracts = read_cct_file(ns)
  contracts.forEach(c => {
    c.setData(ns.codingcontract.getData(c.file, c.host))
  })
  write_cct_file(ns, contracts)
}