import { CodingContractName, ScriptArg } from "@ns"
import { error_t } from "/lib/log"
import { is_empty_str } from "/lib/functions"

/** @param {NS} ns */
export async function main(ns: NS) {
  const [type] = ns.args.map(sa => sa.toString())

  if (is_empty_str(type) || !Object.values(CodingContractName).map(cn => cn.toString()).includes(type.toString())) {
    error_t(ns, "%s: Der Typ '%s' ist unbekannt.", ns.getScriptName(), type)
    ns.exit()
  }
  const ccn: CodingContractName = type.toString() as CodingContractName
  ns.codingcontract.createDummyContract(ccn)
}