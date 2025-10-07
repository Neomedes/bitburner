import { write_server_file, read_server_file } from "lib/servers"

/** @param {NS} ns */
export async function main(ns: NS) {
  const servers = read_server_file(ns)
  servers.forEach(s => {
    const nsServer = ns.getServer(s.host)
    s.add_analyze_data(
      nsServer.maxRam,
      nsServer.minDifficulty ?? 0,
      nsServer.moneyMax ?? 0,
      nsServer.requiredHackingSkill ?? 0,
      nsServer.organizationName,
      nsServer.serverGrowth ?? 0,
      nsServer.numOpenPortsRequired ?? 0,
      nsServer.cpuCores,
    )
    s.set_status(nsServer.hasAdminRights, nsServer.backdoorInstalled ?? false, nsServer.ramUsed, nsServer.moneyAvailable ?? 0, nsServer.hackDifficulty ?? 0)
  })
  write_server_file(ns, servers)
}