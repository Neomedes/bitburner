import { MyFaction, read_faction_file, write_faction_file } from "lib/factions"

/** @param {NS} ns */
export async function main(ns: NS) {
  const factions = read_faction_file(ns)
  const joined = ns.getPlayer().factions
  const invites = ns.singularity.checkFactionInvitations()
  factions.forEach(f => f.set_status_by_lists(invites, joined))
  write_faction_file(ns, factions)
}