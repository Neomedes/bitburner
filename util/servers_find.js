import { MyServer, write_server_file } from "lib/servers.js"
import { disableLogs } from "lib/functions.js"
/**
 * Recursively lists all servers
 * @param {NS} ns Namespace interface.
 * @return {MyServer[]} The list of servers reachable from home.
 */
export function list_servers(ns) {
  disableLogs(ns, "scan")
  const known_hosts = ["home"]
  let servers = [new MyServer("home", 0, ["home"], null)]
  let idx = 0

  while (idx < servers.length) {
    const c = servers[idx]
    let connected_hosts = ns.scan(c.host).filter(h => !known_hosts.includes(h))
    known_hosts.push(...connected_hosts)
    for (let s of connected_hosts) {
      servers.push(new MyServer(s, c.level + 1, [...c.path, s], c.host))
    }
    idx++
  }
  return servers
}

/** @param {NS} ns */
export async function main(ns) {
  const servers = list_servers(ns)
  write_server_file(ns, servers)
}