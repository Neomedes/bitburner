import { run_script } from "lib/functions"

/** @param {NS} ns */
export async function main(ns: NS) {
  await run_script(ns, "scripts/botnet.js", 1, "--reload", "--silent")// update server list
  await run_script(ns, "scripts/free-minions.js") // free servers

  ns.run("util/auto_buy.js") // automatically buy programs
  ns.run("scripts/cct.js") // auto solve CCTs

  // Study Computer Science at Rothman University
  await run_script(ns, "util/sing_study.js", 1, ns.enums.LocationName.Sector12RothmanUniversity, ns.enums.UniversityClassType.computerScience, "-h", 50, "-s", 60)
  // Do criminal activities in the slums
  //await run_script(ns, "util/sing_crime.js")
  // Start hacknet
  // Travel around the world to get Faction invitations
  // Work for specific companies to get their Faction's invitation
  // Consider different node phases:
  // 1. You have nothing => 
}