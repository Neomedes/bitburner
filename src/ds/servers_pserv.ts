import { write_server_file, read_server_file } from "lib/servers"

/** @param {NS} ns */
export async function main(ns: NS) {
  const servers = read_server_file(ns)
  const purchased_server_hosts = ns.getPurchasedServers()
  servers.filter(s => purchased_server_hosts.includes(s.host)).forEach(s => s.set_is_purchased(true))
  write_server_file(ns, servers)
}