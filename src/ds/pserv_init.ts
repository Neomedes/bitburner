import { MyPurchasedServer, RamLevel, write_pserv_file } from "/lib/pserv"

/** @param {NS} ns */
export async function main(ns: NS) {
  const max_lv = RamLevel.get_max_lv(ns)
  for (let i = 1; i <= max_lv; i++) {
    const level = RamLevel.by_level(i)
    level.set_cost(ns.getPurchasedServerCost(level.ram))
  }
  const p_servers = ns.getPurchasedServers().map(host => MyPurchasedServer.register(ns, host))
  write_pserv_file(ns, p_servers)
}