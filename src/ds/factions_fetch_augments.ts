import { MyFaction, read_faction_file, write_faction_file } from "lib/factions"

/** @param {NS} ns */
export async function main(ns: NS) {
  const factions = read_faction_file(ns)
  factions.forEach(f => {
    f.set_augments(ns.singularity.getAugmentationsFromFaction(f.name))
  })
  write_faction_file(ns, factions)
}