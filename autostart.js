import { run_script } from "lib/functions.js"

/** @param {NS} ns */
export async function main(ns) {
  await run_script(ns, "scripts/botnet.js", 1, "--reload", "--silent")// update server list
  await run_script(ns, "scripts/free-minions.js") // free servers

  ns.run("util/auto_buy.js") // automatically buy programs
  ns.run("scripts/cct.js") // auto solve CCTs

  // Study Computer Science at Rothman University
  // Do criminal activities in the slums
  // Travel around the world to get Faction invitations
  // Work for specific companies to get their Faction's invitation
}