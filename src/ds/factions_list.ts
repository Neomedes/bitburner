import { MyFaction, write_faction_file } from "lib/factions"

/** @param {NS} ns */
export async function main(ns: NS) {
  const factions = Object.values(ns.enums.FactionName).map(name => {
    const faction = new MyFaction(name)
    const reqs = ns.singularity.getFactionInviteRequirements(name)
    faction.set_requirements(reqs)
    return faction
  })
  write_faction_file(ns, factions)
}