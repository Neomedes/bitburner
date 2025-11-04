import { read_server_file } from "lib/servers"
import { MyContract, write_cct_file } from "lib/cct"

/** @param {NS} ns */
export async function main(ns: NS) {
  const servers = read_server_file(ns)
  let ccts: MyContract[] = []
  servers.forEach(s => {
    ns.ls(s.host, ".cct").forEach(cct => {
      ccts.push(new MyContract(s.host, cct))
    })
  })
  if (ccts.length > 0) {
    ns.toast(`${ccts.length} CCTs gefunden.`)
    ns.printf("%d CCTs gefunden.", ccts.length)
  }
  write_cct_file(ns, ccts)
}