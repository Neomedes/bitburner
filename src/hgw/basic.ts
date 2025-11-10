import { KeepRamEntry, read_keep_ram_file, get_keep_ram } from "lib/keep_ram"
import { MyServer, read_server_file } from "lib/servers"
import { disableLogs, finished, all_finished, is_empty_str, reduce_to_sum } from "lib/functions"
import { error_t, prepend_time } from "lib/log"
import { get_updated_server_list } from "/util/update_data"

interface ScriptInfo {
  name: string,
  path: string,
  ram: number,
  parts: number,
}

const SCRIPTS = {
  HACK: { name: "Hack", path: "hgw/hack.js", ram: 1.7, parts: 1 } as ScriptInfo,
  GROW: { name: "Grow", path: "hgw/grow.js", ram: 1.75, parts: 2 } as ScriptInfo,
  WEAKEN: { name: "Weaken", path: "hgw/weaken.js", ram: 1.75, parts: 2 } as ScriptInfo,
}

interface ScriptThreadInfo {
  /** Script to run */
  script_path: string,
  /** Number of threads to run */
  threads: number,
}

interface ThreadDistribution {
  /** Host to run script on */
  host: string,
  /** What scripts to run with how many threads */
  threads: ScriptThreadInfo[],
  /** How much RAM is left */
  ram_left: number,
}

// copy hgw scripts to all nuked servers
function copy_scripts(ns: NS, minions: MyServer[]) {
  minions
    .filter(s => s.host !== "home")
    .forEach(srv => ns.scp([SCRIPTS.HACK.path, SCRIPTS.GROW.path, SCRIPTS.WEAKEN.path], srv.host, "home"))
}

function calculate_thread_distributions(ns: NS, minions: MyServer[], scripts: ScriptInfo[], keep_ram_data: KeepRamEntry[]): ThreadDistribution[] {
  // Return nothing when no scripts or no minions are given.
  if (scripts.length < 1 || minions.length < 1) return []
  // Initialize empty thread distribution
  const distributions = minions.map(srv => {
    const dist: ThreadDistribution = {
      host: srv.host,
      threads: [],
      ram_left: Math.max(0, srv.max_ram - srv.ram_used - get_keep_ram(keep_ram_data, srv.host)),
    }
    return dist
  }).filter(dist => dist.ram_left > 0)
  // Get max RAM needed per script by sorting scripts in descending order of RAM needed and use the first script's RAM.
  const max_ram_per_script_needed = scripts.toSorted((a, b) => b.ram - a.ram)[0].ram
  // Calculate how many threads per script can be maintained on the total RAM
  const total_threads_available = distributions.map(dist => Math.floor(dist.ram_left / max_ram_per_script_needed)).reduce(reduce_to_sum, 0)
  const total_parts_per_batch = scripts.map(s => s.parts).reduce(reduce_to_sum, 0)
  if (total_parts_per_batch <= 0) return []
  const total_batches = Math.floor(total_threads_available / total_parts_per_batch)
  // for every script: fill all servers with the required amount of threads for this script
  scripts.forEach(scr => {
    let remaining_threads = total_batches * scr.parts
    while (remaining_threads > 0) {
      const next_dist2use = distributions.find(dist => dist.ram_left >= scr.ram)
      if (next_dist2use === undefined) break
      const new_threads = Math.min(Math.floor(next_dist2use.ram_left / scr.ram), remaining_threads)
      next_dist2use.threads.push({ script_path: scr.path, threads: new_threads })
      next_dist2use.ram_left -= new_threads * scr.ram
      remaining_threads -= new_threads
    }
  })

  // return all distributions that have threads filled
  return distributions.filter(dist => dist.threads.length > 0)
}

function prep_needed(ns: NS, target: MyServer): boolean {
  if (target.min_security < target.current_security) {
    ns.printf("%s: Security muss noch geschwächt werden.", target.host)
    return true
  }
  if (target.max_money > target.current_money) {
    ns.printf("%s: Es muss noch Geld erzeugt werden.", target.host)
    return true
  }
  ns.printf("Server %s ist geprepped.", target.host)
  return false
}

async function run_distributions(ns: NS, distributions: ThreadDistribution[], target_host: string) {
  const pids = distributions.flatMap(dist => {
    return dist.threads.map(thr => {
      return ns.exec(thr.script_path, dist.host, thr.threads, target_host)
    })
  }).filter(pid => pid !== 0)
  await all_finished(ns, pids)
}

async function prep_target(ns: NS, minions: MyServer[], keep_ram_data: KeepRamEntry[], target: MyServer) {
  async function run_prep_action(actions: ScriptInfo[]) {
    const dist = calculate_thread_distributions(ns, minions, actions, keep_ram_data)
    actions.forEach(a => {
      const threads_for_action = dist.flatMap(d => d.threads.filter(t => t.script_path === a.path).map(t => t.threads)).reduce(reduce_to_sum, 0)
      const msg = ns.sprintf("Starte Action %s auf %d threads im botnet.", a.name, threads_for_action)
      ns.printf(prepend_time(ns, msg))
    })
    await run_distributions(ns, dist, target.host)
  }
  if (target.min_security < target.current_security) await run_prep_action([SCRIPTS.WEAKEN])
  if (target.max_money > target.current_money) await run_prep_action([SCRIPTS.GROW, SCRIPTS.WEAKEN])
}

async function hack_target(ns: NS, minions: MyServer[], keep_ram_data: KeepRamEntry[], target_host: string) {
  const scripts = [SCRIPTS.HACK, SCRIPTS.GROW, SCRIPTS.WEAKEN]
  const thread_distributions = calculate_thread_distributions(ns, minions, scripts, keep_ram_data)
  await run_distributions(ns, thread_distributions, target_host)
}

/**
 * @param {NS} ns The Netscript API.
 */
export async function main(ns: NS) {
  disableLogs(ns, "exec", "scp")
  // The target server, i.e. the server to hack.
  const target_host = ns.args[0] as string

  if (is_empty_str(target_host)) {
    error_t(ns, "Kein Ziel angegeben!")
    return ns.exit()
  }

  let target: MyServer
  async function update_target() {
    const target_server = (await get_updated_server_list(ns)).find(s => s.host === target_host)
    if (target_server === undefined) {
      error_t(ns, "Ziel '%s' ist unbekannt.", target_host)
      return ns.exit()
    }
    target = target_server
  }
  await update_target()



  let all_servers: MyServer[] = [], minions: MyServer[] = [], test_for_new_minions: boolean = true

  async function update_minions() {
    if (test_for_new_minions) {
      all_servers = await get_updated_server_list(ns)
      const possible_minions = all_servers.filter(s => s.max_ram > 0 && !s.is_purchased)
      minions = possible_minions.filter(s => s.nuked)
      copy_scripts(ns, minions)
      minions.sort((a, b) => a.max_ram - b.max_ram) // sort by max RAM ascending
      test_for_new_minions = (possible_minions.length > minions.length)
    }
  }
  await update_minions()

  async function prep() {
    while (prep_needed(ns, target)) {
      await prep_target(ns, minions, read_keep_ram_file(ns), target)
      await update_target()
    }
  }
  await prep()

  // Continuously hack/grow/weaken the target server.
  for (; ;) {
    await hack_target(ns, minions, read_keep_ram_file(ns), target_host)
    await update_target()
    await prep()
    await update_minions()
  }
}