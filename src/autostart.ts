import { run_script } from "lib/functions"

/** @param {NS} ns */
export async function main(ns: NS) {
  await run_script(ns, "scripts/botnet.js", 1, "--reload", "--silent")// update server list
  await run_script(ns, "scripts/free-minions.js") // free servers as of pre-owned programs

  ns.run("util/auto_buy.js") // automatically buy programs
  ns.run("scripts/cct.js") // auto solve CCTs
  ns.run("scripts/hacknet.js") // auto purchase HackNet nodes

  // First start the auto-hacker, since target will change depending on the current hack stat
  ns.run("util/auto_hack.js") // automatically hack servers
  // Study Computer Science at Rothman University
  await run_script(ns, "util/sing_study.js", 1, ns.enums.LocationName.Sector12RothmanUniversity, ns.enums.UniversityClassType.computerScience, "-h", 50, "-s", 60)
  // Do criminal activities in the slums
  await run_script(ns, "util/sing_crime.js")
  // Hack servers for money
}