import { disableLogs } from "lib/functions"
import { Color, colored_t, info_t, success_t, warning_t } from "lib/log"
import { get_updated_player } from "/util/update_data"

const ALL_PROGRAMS = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe", "Formulas.exe"]

/** @param {NS} ns */
export async function main(ns: NS) {
  disableLogs(ns, "sleep")
  // Tries to buy programs until all needed ones are there
  const missing_programs = ALL_PROGRAMS.filter(p => !ns.fileExists(p))
  while (missing_programs.length > 0) {
    if (ns.hasTorRouter() || ns.singularity.purchaseTor()) {
      const new_program = missing_programs[0]
      const price = ns.singularity.getDarkwebProgramCost(new_program)
      const money = (await get_updated_player(ns)).money
      if (money >= price && ns.singularity.purchaseProgram(new_program)) {
        success_t(ns, "Programm '%s' gekauft.", new_program)
        ns.run("scripts/free-minions.js") // free servers

        missing_programs.shift()
        const next_program = missing_programs[0]
        if (next_program !== undefined) {
          const next_price = ns.singularity.getDarkwebProgramCost(next_program)
          info_t(ns, "Nächstes Programm: %s ($%s)", next_program, ns.formatNumber(next_price))
        }
      }
    }
    await ns.sleep(10000)
  }
  success_t(ns, "Alle Programme wurden gekauft. Beende Durchführung.")
}