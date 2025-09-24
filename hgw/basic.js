import { KeepRamEntry, read_keep_ram_file, get_keep_ram } from "lib/keep_ram.js"
import { MyServer, read_server_file } from "lib/servers.js"
import { disableLogs, error_t, finished, all_finished } from "lib/functions.js"

const HACK_SCRIPT = "hgw/hack.js"
const GROW_SCRIPT = "hgw/grow.js"
const WEAKEN_SCRIPT = "hgw/weaken.js"

/**
 * Updates the server list and their status
 * @param {NS} ns The Netscript API.
 * @return {Promimse<MyServer[]>}
 */
async function get_updated_server_list(ns) {
  const upd_pid = ns.exec("util/servers_analyze.js", "home")
  await finished(ns, upd_pid)
  return read_server_file(ns).filter(s => s.nuked && s.max_ram > 0)
}

/**
 * @param {NS} ns The Netscript API.
 * @param {MyServer[]} all_servers
 * @param {string} target
 * @param {KeepRamEntry[]} keep_ram_entries
 * @param {number} threads Number of threads to start. 0 or less to start as much as possible.
 * @param {string} script
 * @return {number[]} The PIDs of the started scripts.
 */
function start_threads(ns, all_servers, target, keep_ram_entries, threads, script) {
  let remaining_thread_count = threads > 0 ? threads : 100
  ns.printf("Starte %s Threads für Skript %s", threads > 0 ? `${threads}` : "möglichst viele", script)
  const available_servers = all_servers
    //.filter(s => s.host !== target)
    .map(s => {
      const ram_buffer = get_keep_ram(keep_ram_entries, s.host)
      const ram_per_thread = ns.getScriptRam(script, s.host)
      const max_threads = ram_per_thread > 0 ? Math.max(Math.floor((s.max_ram - s.ram_used - ram_buffer) / ram_per_thread), 0) : 0
      return { host: s.host, max_threads }
    })
    .filter(s => s.max_threads > 0)

  const pids = []
  while (remaining_thread_count > 0 && available_servers.length > 0) {
    const next_server = available_servers.shift()
    const threads2use = threads > 0 ? Math.min(next_server.max_threads, remaining_thread_count) : next_server.max_threads
    const new_pid = ns.exec(script, next_server.host, threads2use, target)
    pids.push(new_pid)
    if (threads > 0) {
      remaining_thread_count -= threads2use
    }
  }
  return pids
}

/**
 * @param {NS} ns
 * @param {MyServer[]} all_servers
 * @param {string} target
 * @param {KeepRamEntry[]} keep_ram_entries
 * @param {number} hack_thread_count
 */
async function hack_cycle(ns, all_servers, target, keep_ram_entries, hack_thread_count) {
  const pids = []
  pids.push(...start_threads(ns, all_servers, target, keep_ram_entries, hack_thread_count, HACK_SCRIPT))
  pids.push(...start_threads(ns, all_servers, target, keep_ram_entries, -1, WEAKEN_SCRIPT))
  await all_finished(ns, pids)
}

/**
 * @param {NS} ns
 * @param {MyServer[]} all_servers
 * @param {string} target
 * @param {KeepRamEntry[]} keep_ram_entries
 * @param {number} hack_thread_count
 */
async function prep_cycle(ns, all_servers, target, keep_ram_entries, grow_thread_count) {
  const pids = []
  pids.push(...start_threads(ns, all_servers, target, keep_ram_entries, grow_thread_count, GROW_SCRIPT))
  pids.push(...start_threads(ns, all_servers, target, keep_ram_entries, -1, WEAKEN_SCRIPT))
  await all_finished(ns, pids)
}

/**
 * @param {NS} ns The Netscript API.
 */
export async function main(ns) {
  disableLogs(ns, "exec", "scp")
  // The target server, i.e. the server to hack.
  const [target] = ns.args
  if (!target || target === "") {
    error_t(ns, "Kein Ziel angegeben!")
    ns.tprintf("Aufruf: %s ZIEL", ns.getScriptName())
    ns.exit()
  }


  let all_servers = await get_updated_server_list(ns)
  let target_server = all_servers.find(s => s.host === target)
  if (!target_server) {
    error_t(ns, "Server %s ist unbekannt.", target)
    ns.exit()
  }

  // copy hgw scripts to all nuked servers
  /** @param {MyServer[]} all_servers */
  function copy_scripts(all_servers) {
    const all_scripts = [HACK_SCRIPT, GROW_SCRIPT, WEAKEN_SCRIPT]
    all_servers
      .filter(s => s.host !== "home")
      .forEach(srv => ns.scp(all_scripts, srv.host, "home"))
  }

  // Continuously hack/grow/weaken the target server.
  for (; ;) {
    const keep_ram_entries = read_keep_ram_file(ns)

    // 2 GB - count = (50% to hack) / (% hacked by 1 thread) / (chance to succeed hacking) 
    const hack_thread_count = Math.ceil(0.5 / ns.hackAnalyze(target) / ns.hackAnalyzeChance(target))
    // 1 GB - how many threads would be needed to grow the money by the relative multiplier
    const grow_thread_count = Math.ceil(ns.growthAnalyze(target, 2.2, 1))

    copy_scripts(all_servers)
    if (target_server.max_money !== target_server.current_money) {
      await prep_cycle(ns, all_servers, target, keep_ram_entries, grow_thread_count)
    } else if (target_server.min_security !== target_server.current_security) {
      const pids = start_threads(ns, all_servers, target, keep_ram_entries, -1, WEAKEN_SCRIPT)
      await all_finished(ns, pids)
    } else {
      // target is prepped
      await hack_cycle(ns, all_servers, target, keep_ram_entries, hack_thread_count)
    }
    // update server list and target info
    all_servers = await get_updated_server_list(ns)
    target_server = all_servers.find(s => s.host === target)
  }
}