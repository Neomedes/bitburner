import { read_cct_file, remove_contract, update_contract } from "lib/cct"
import { error_t } from "lib/log"

/** @param {NS} ns */
export async function main(ns: NS) {
  const contracts = read_cct_file(ns).filter(c => c.solution !== undefined)

  let successes = 0
  for (let c of contracts) {
    let reward
    if (c.test_multiple_solutions) {
      for (let solution of c.solution) {
        reward = ns.codingcontract.attempt(solution, c.file, c.host)
        if (reward) break
      }
    } else {
      reward = ns.codingcontract.attempt(c.solution, c.file, c.host)
    }

    if (reward) {
      successes++
      // output information about success
      ns.tprintf("CCT \"%s\" (%s) auf Host %s erfolgreich gelöst", c.type, c.file, c.host)
      ns.tprintf("    -> %s", reward)
      remove_contract(ns, c)
    } else {
      // output information to find the problem
      error_t(ns, "%s: Lösung für CCT %s auf Host %s war FALSCH!", c.type ?? "", c.file, c.host)
      error_t(ns, "    Getestete Lösung%s: %s", c.test_multiple_solutions ? "en" : "", c.solution)
      error_t(ns, "    CCT-Daten: %s", JSON.stringify(c.data))
      if (c.debug_data) {
        for (let dd in c.debug_data) {
          error_t(ns, "    %s: %s", dd, JSON.stringify(c.debug_data[dd]))
        }
      }
      // delete solutions
      c.setSolution(undefined)
      c.setDebugData(undefined)
      update_contract(ns, c)
    }
  }

  if (contracts.length > 0) {
    let toast_messages = []
    if (contracts.length > successes) {
      toast_messages.push(`CCT-Fehler: ${contracts.length - successes}`)
    }
    if (successes > 0) {
      toast_messages.push(`CCT-Erfolge: ${successes}`)
    }
    ns.toast(toast_messages.join("\n"))
  }
}