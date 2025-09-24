import { read_server_file } from "lib/servers.js"
import { all_finished, finished, success_t } from "lib/functions.js"

const PORT_OPENERS = [
  { name: "brute", program: "BruteSSH.exe", script: "util/call_brute.js" },
  { name: "ftp", program: "FTPCrack.exe", script: "util/call_ftp.js" },
  { name: "http", program: "HTTPWorm.exe", script: "util/call_http.js" },
  { name: "sql", program: "SQLInject.exe", script: "util/call_sql.js" },
  { name: "smtp", program: "relaySMTP.exe", script: "util/call_smtp.js" },
]
const NUKER = { name: "nuke", program: null, script: "util/call_nuke.js" }

/**
 * Opens other servers which are already crackable
 * @param {NS} ns
 */
export async function main(ns) {
  const available_port_openers = PORT_OPENERS.filter(po => ns.fileExists(po.program))
  const closed_server_hosts = read_server_file(ns)
    .filter(s => !s.nuked && s.ports_needed <= available_port_openers.length)
    .map(s => s.host)
  if (closed_server_hosts.length < 1) {
    return
  }

  const pids = available_port_openers.map(opener => ns.run(opener.script, 1, ...closed_server_hosts))
  await all_finished(ns, pids)

  const nuke_pid = ns.run(NUKER.script, 1, ...closed_server_hosts)
  await finished(ns, nuke_pid)

  const upd_pid = ns.run("scripts/botnet.js", 1, "-i", "-s") // update server list
  await finished(ns, upd_pid)

  const now_open_server_count = read_server_file(ns)
    .filter(s => s.nuked && closed_server_hosts.includes(s.host))
    .length

  if (now_open_server_count > 0) {
    const msg = `${now_open_server_count} Server ${now_open_server_count == 1 ? "wurde" : "wurden"} gehackt`
    ns.toast(msg)
    success_t(ns, msg)
  }
}