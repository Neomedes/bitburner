import { write_server_file, read_server_file } from "lib/servers.js"

/** @param {NS} ns */
export async function main(ns) {
  const servers = read_server_file(ns)
  servers.forEach(s => {
    const nsServer = ns.getServer(s.host)
    s.add_analyze_data(
      nsServer.maxRam,
      nsServer.minDifficulty,
      nsServer.moneyMax,
      nsServer.requiredHackingSkill,
      nsServer.organizationName,
      nsServer.serverGrowth,
      nsServer.numOpenPortsRequired,
      nsServer.cpuCores,
    )
    s.set_status(nsServer.hasAdminRights, nsServer.backdoorInstalled ?? false, nsServer.ramUsed, nsServer.moneyAvailable, nsServer.hackDifficulty)
  })
  write_server_file(ns, servers)
}