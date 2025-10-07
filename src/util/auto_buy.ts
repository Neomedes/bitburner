import { disableLogs } from "lib/functions"
import { warning_t } from "lib/log"

const ALL_PROGRAMS = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe", "Formulas.exe"]

/** @param {NS} ns */
export async function main(ns: NS) {
  disableLogs(ns, "sleep")
  // Tries to buy programs until all needed ones are there
  const missing_programs = ALL_PROGRAMS.filter(p => !ns.fileExists(p))
  while (missing_programs.length > 0) {
    if (!ns.hasTorRouter()) {
      ns.singularity.purchaseTor()
    } else {
      if (ns.singularity.purchaseProgram(missing_programs[0])) {
        warning_t(ns, "%s: Programm '%s' gekauft.", ns.getScriptName(), missing_programs[0])
        missing_programs.shift()
        ns.run("scripts/free-minions.js") // free servers
      }
    }
    await ns.sleep(10000)
  }
  ns.tprintf("%s: Alle Programme wurden gekauft. Beende Durchführung.", ns.getScriptName())
}