import { assert, disableLogs } from "lib/functions"
import { error_t } from "lib/log"
import { ACTION, mock_server } from "lib/hgw"
import { MyServer, read_server_file } from "lib/servers"

const HOME = "home"
const DELAY = 250 // ms

/**
 * Chooses the best potencial target.
 * @param ns
 * @param servers
 * @return Hostname of best target.
 */
function choose_target(servers: MyServer[]): MyServer | undefined {
  const best_targets = ["n00dles", "joesguns", "phantasy"]
  const target_server = best_targets
    .map(h => servers.find(srv => srv.host === h))
    .filter(s => s)
    .findLast(s => s?.nuked ?? false)
  return target_server
}

/**
 * Calculates the free RAM of a server.
 *
 * @param {NS} ns The Netscript API.
 * @param {string} host Hostname of a world server.
 * @returns {number} The maximum number of threads to run our script on the
 *     given server.
 */
function free_ram(ns: NS, host: string): number {
  const { maxRam, ramUsed } = ns.getServer(host);
  return maxRam - ramUsed;
}

/**
 * The maximum number of threads that can be used to run our script on a given
 * server.
 *
 * @param {NS} ns The Netscript API.
 * @param {string} script A script.  Assumed to be located on our home server.
 * @param {string} host Hostname of a world server.
 * @returns {number} The maximum number of threads to run our script on the
 *     given server.
 */
function num_threads(ns: NS, script: string, host: string): number {
  const script_ram = ns.getScriptRam(script, host)
  const server_ram = free_ram(ns, host)
  if (server_ram < script_ram) {
    return 0;
  }
  return Math.floor(server_ram / script_ram);
}
/**
 * @param ns
 * @param attack_host
 */
function copyAttackScripts(ns: NS, attack_host: string) {
  const scripts = [ACTION.HACK.script, ACTION.GROW.script, ACTION.WEAKEN.script]
  const success = ns.scp(scripts, attack_host, HOME)
  if (!success) {
    error_t(ns, "HGW-Skript(e) konnten nicht kopiert werden!")
    ns.exit()
  }
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {ACTION} action
 */
function hgw_wait_time(ns: NS, host: string, action: ACTION): number {
  switch (action) {
    case ACTION.GROW:
      return ns.getGrowTime(host);
    case ACTION.HACK:
      return ns.getHackTime(host);
    case ACTION.WEAKEN:
      return ns.getWeakenTime(host);
    default:
      // Should never reach here.
      assert(false);
  }
  return 0
}

/**
 * @param ns
 * @param attack_host
 * @param action
 * @param target_server
 */
async function hgw_action(ns: NS, attack_host: string, action: ACTION, target_server: MyServer) {
  const wait = action.get_timing(ns, target_server)
  const thread_count = num_threads(ns, action.script, attack_host)
  if (thread_count < 1) {
    return
  }
  const exec_options = { preventDuplicates: true, threads: thread_count }
  const pid = ns.exec(action.script, attack_host, exec_options, target_server.host)
  await ns.sleep(wait);
  const is_done = () => !ns.isRunning(pid);
  while (!is_done()) {
    await ns.sleep(1000);
  }
}

/**
 * @param {NS} ns
 * @param {string} host
 */
function hasMinSecurity(ns: NS, host: string): boolean {
  const { hackDifficulty, minDifficulty } = ns.getServer(host)
  return minDifficulty === undefined || hackDifficulty === undefined ? false : hackDifficulty <= minDifficulty
}

/**
 * @param {NS} ns
 * @param {string} host
 */
function hasMaxMoney(ns: NS, host: string): boolean {
  const { moneyAvailable, moneyMax } = ns.getServer(host)
  return moneyMax === undefined ? false : (moneyAvailable ?? 0) >= moneyMax
}

/**
 * @param {NS} ns
 * @param {string} host
 */
function isPrepped(ns: NS, host: string): boolean {
  return hasMinSecurity(ns, host) && hasMaxMoney(ns, host)
}

async function prepServer(ns: NS, attack_host: string, target_server: MyServer) {
  ns.printf("Prepping target")
  for (; ;) {
    if (!hasMinSecurity(ns, target_server.host)) {
      await hgw_action(ns, attack_host, ACTION.WEAKEN, target_server)
    }
    if (!hasMaxMoney(ns, target_server.host)) {
      await hgw_action(ns, attack_host, ACTION.GROW, target_server)
    }
    if (isPrepped(ns, target_server.host)) {
      return
    }
    await ns.sleep(0)
  }
}

/**
 * Whether it is time to prep a server.  We prep a server provided one of the
 * following conditions holds:
 *
 * (1) We have launched a certain number of batches against the server;
 * (2) We have encountered a given number of consecutive failures in launching
 *     batches.
 *
 * In general, after several batches have completed it is possible for the
 * target server to not be in the prepped state.
 *
 * @param {number} batch How many batches have run to completion.
 * @param {number} fail How many consecutive failures we have.
 * @param {number} max_fail Tolerate this many consecutive failures.
 * @returns {boolean} True if it is time for a prep cycle; false otherwise.
 */
function is_prep_time(batch: number, fail: number, max_fail: number): boolean {
  return batch >= 100 || fail >= max_fail;
}

/**
 * The maximum number of failures we can tolerate before entering the prep
 * state.  If we have too many failures to launch a batch, the issue might be
 * due to desynchronization or insufficient RAM.  In any case, prepping the
 * target again solves the problem.
 *
 * @param {NS} ns The Netscript API.
 * @param {MyServer} target_server Hostname of the server to hack.
 * @returns {number} Tolerate this many failures to launch a batch.
 */
function max_failures(ns: NS, target_server: MyServer): number {
  const nsecond = Math.ceil(ACTION.WEAKEN.get_timing(ns, target_server) / 1000)
  return Math.ceil(1.2 * nsecond)
}

interface BatchPartInfo {
  ram: number,
  thread: number,
  time: number,
}

interface BatchParams {
  total_threads: number,
  total_time: number,
  total_ram: number,
  h: BatchPartInfo,
  w1: BatchPartInfo,
  g: BatchPartInfo,
  w2: BatchPartInfo,
}

/**
 * @param {NS} ns
 * @param {MyServer} attack_server
 * @param {MyServer} target_server
 */
function calculate_batch_params(ns: NS, attack_server: MyServer, target_server: MyServer): BatchParams | null {
  // The percentage of money we want to hack from the target server.
  const max_percent = 50
  const percent = [...Array(max_percent + 1).keys()]
  percent.shift() // remove 0 percent
  percent.reverse() // now: [50,49,48,...,3,2,1]

  const prepped_target_server = target_server.get_copy()
  prepped_target_server.current_money = target_server.max_money
  prepped_target_server.current_security = target_server.min_security

  const target_ns_server = mock_server(ns, prepped_target_server)
  const player = ns.getPlayer()

  function calculate_weaken_threads(security_decrease: number): number {
    let tcount = Math.ceil(security_decrease / ns.weakenAnalyze(1))
    while (ns.weakenAnalyze(tcount) < security_decrease) { tcount++ }
    return Math.ceil(tcount * 1.05 + 1)
  }
  function calculate_required_ram(script: string, nthread: number): number {
    return nthread * ns.getScriptRam(script, HOME)
  }

  // The maximum percentage of money we can hack while using only the
  // RAM available on the host server.
  const available_ram = free_ram(ns, attack_server.host)
  for (const pc of percent) {
    const max_threads = Math.ceil(pc / 100 / ns.formulas.hacking.hackPercent(target_ns_server, player))

    const hThreads = max_threads
    const hTime = ns.formulas.hacking.hackTime(target_ns_server, player)
    const hRam = calculate_required_ram(ACTION.HACK.script, hThreads)

    const money_fraction = ns.formulas.hacking.hackPercent(target_ns_server, player)
    const money_hacked = hThreads * money_fraction * (target_ns_server.moneyMax ?? 0)
    target_ns_server.moneyAvailable = (target_ns_server.moneyMax ?? 0) - money_hacked

    // The number of grow threads required, the grow time, and the effect of
    // growing.
    const gThreads = ns.formulas.hacking.growThreads(target_ns_server, player, target_ns_server.moneyMax ?? 0, attack_server.cores ?? 1)
    const gTime = ns.formulas.hacking.growTime(target_ns_server, player)//ns.getGrowTime(target_server)
    const gRam = calculate_required_ram(ACTION.GROW.script, gThreads)

    // The number of weaken threads required and the weaken time.
    const hack_sec_increase = ns.hackAnalyzeSecurity(hThreads, target_server.host)
    const grow_sec_increase = ns.growthAnalyzeSecurity(gThreads, target_server.host)

    const wRam = calculate_required_ram(ACTION.HACK.script, 1)
    const w1Threads = calculate_weaken_threads(hack_sec_increase)
    target_ns_server.hackDifficulty = (target_ns_server.minDifficulty ?? 0) + hack_sec_increase
    const w1Time = ns.formulas.hacking.weakenTime(target_ns_server, player)
    const w1Ram = wRam * w1Threads

    const w2Threads = calculate_weaken_threads(grow_sec_increase)
    target_ns_server.hackDifficulty = (target_ns_server.minDifficulty ?? 0) + grow_sec_increase
    const w2Time = ns.formulas.hacking.weakenTime(target_ns_server, player)
    const w2Ram = wRam * w2Threads

    if (hThreads < 1 || w1Threads < 1 || gThreads < 1 || w2Threads < 1) {
      continue
    }

    const param: BatchParams = {
      total_threads: hThreads + w1Threads + gThreads + w2Threads,
      total_time: Math.max(hTime, w1Time, gTime, w2Time),
      total_ram: hRam + w1Ram + gRam + w2Ram,
      h: {
        ram: hRam,
        thread: hThreads,
        time: hTime,
      },
      w1: {
        ram: w1Ram,
        thread: w1Threads,
        time: w1Time,
      },
      g: {
        ram: gRam,
        thread: gThreads,
        time: gTime,
      },
      w2: {
        ram: w2Ram,
        thread: w2Threads,
        time: w2Time,
      },
    }

    if (param.total_ram <= available_ram) {
      return param
    }
  }
  return null
}

/**
 * Launch a batch against a target server.  Use the model of parallel
 * batcher.
 *
 * @param {NS} ns Netscript API
 * @param {MyServer} attack_server Hostname of the server our batcher deploy the attack scripts on.
 * @param {MyServer} target_server Hostname of the server our batcher will target.
 * @returns {boolean} True if the batch was successfully launched;
 *     false otherwise.
 */
function launch_batch(ns: NS, attack_server: MyServer, target_server: MyServer): boolean {
  const param = calculate_batch_params(ns, attack_server, target_server)
  if (param === null) {
    return false
  }

  const execute = (script: string, nthread: number, time: number) => {
    const option = { preventDuplicates: true, threads: nthread }
    ns.exec(
      script,
      attack_server.host,
      option,
      target_server.host,
      time,
      performance.now()
    )
  }

  // Batch: H -> W1 -> G -> W2
  /** @type {{start: number, end: number, duration: number, exe: (delay: number) => void}[]} */
  const BATCH = []
  BATCH.push({ start: 0, end: 0, duration: param.h.time, exe: (delay: number) => execute(ACTION.HACK.script, param.h.thread, delay) })
  BATCH.push({ start: 0, end: DELAY, duration: param.w1.time, exe: (delay: number) => execute(ACTION.WEAKEN.script, param.w1.thread, delay) })
  BATCH.push({ start: 0, end: 2 * DELAY, duration: param.g.time, exe: (delay: number) => execute(ACTION.GROW.script, param.g.thread, delay) })
  BATCH.push({ start: 0, end: 3 * DELAY, duration: param.w2.time, exe: (delay: number) => execute(ACTION.WEAKEN.script, param.w2.thread, delay) })

  BATCH.forEach(a => a.start = a.end - a.duration)
  BATCH.sort((a, b) => a.start - b.start)
  const earliest_start = BATCH[0].start
  BATCH.forEach(a => {
    a.start -= earliest_start
    a.exe(a.start)
  })

  return true
}

function get_pid_file_name(host: string): string {
  return `data/hgw-manager-pid-${host}.txt`
}

function find_attacker(ns: NS, attack_host: string, servers: MyServer[]): MyServer {
  if (attack_host && attack_host !== "") {
    const attack_server = servers.find(s => s.host === attack_host)
    if (!attack_server) {
      error_t(ns, "%s: Server %s (Angriff) existiert nicht.", ns.getScriptName(), attack_host)
      ns.exit()
    }
    ns.tprintf("Es wurde %s als Angriffsserver gesetzt.", attack_server.host)
    return attack_server
  }

  // try to select the first psrv server
  const psrv = servers
    .filter(s => s.host.startsWith("psrv"))
    .find(s => {
      const pid_file = get_pid_file_name(s.host)
      // search for hgw-manager-pid.txt
      if (!ns.fileExists(pid_file)) {
        return true
      }
      const mgr_pid = parseInt(ns.read(pid_file))
      return !ns.isRunning(mgr_pid)
    })
  if (!psrv) {
    error_t(ns, "%s: Es wurde kein Angriffsserver angegeben und es wurde auch kein freier pserv gefunden.", ns.getScriptName())
    ns.exit()
  }
  ns.tprintf("Es wurde %s als Angreifer ausgewählt.", psrv.host)
  return psrv
}

/**
 * @param {NS} ns
 * @param {string} target_host
 * @param {MyServer[]} servers
 * @return {MyServer}
 */
function find_target(ns: NS, target_host: string, servers: MyServer[]): MyServer {
  if (target_host && target_host !== "") {
    const target_server = servers.find(s => s.host === target_host)
    if (!target_server) {
      error_t(ns, "%s: Server %s (Ziel) existiert nicht.", ns.getScriptName(), target_host)
      ns.exit()
    }
    ns.tprintf("Es wurde %s als Ziel gesetzt.", target_server.host)
    return target_server
  }
  const target_server = choose_target(servers)
  if (!target_server) {
    error_t(ns, "%s: Es konnte automatisch kein Ziel ermittelt werden und es wurde keines angegeben.", ns.getScriptName())
    ns.exit()
  }
  ns.tprintf("Es wurde %s als Ziel ausgewählt.", target_server.host)
  return target_server
}

/** @param {NS} ns */
export async function main(ns: NS) {
  disableLogs(ns, "sleep", "exec", "scp")
  // which server should be used is determined by a script parameter
  let [attack_host, target_host] = ns.args.map(a => a.toString())

  const servers = read_server_file(ns)

  const attack_server = find_attacker(ns, attack_host, servers)

  // choose the target
  let target_server = find_target(ns, target_host, servers)
  ns.printf("Chosen target: %s", target_server.host)

  // copy attack scripts to the attacker host
  copyAttackScripts(ns, attack_server.host)

  const pid_file = get_pid_file_name(attack_server.host)
  ns.write(pid_file, ns.pid.toString(), "w")

  try {

    // prep the server
    await prepServer(ns, attack_server.host, target_server)
    ns.printf("Target prepped.")

    // Launch parallel batches whenever we can.
    let i = 0
    let fail = 0
    let max_fail = max_failures(ns, target_server)
    for (; ;) {
      const success = launch_batch(ns, attack_server, target_server)
      if (success) {
        i++
        fail = 0
        ns.printf(`Launched batch ${i}`)
      } else {
        fail++
        ns.printf(`Failure ${fail} to launch batch`)
        await ns.sleep(1000)
      }

      if (is_prep_time(i, fail, max_fail)) {
        ns.printf(`Prep cycle, batches launched = ${i}, failures = ${fail}`)
        await prepServer(ns, attack_server.host, target_server)
        i = 0
        fail = 0
        max_fail = max_failures(ns, target_server)
      }
      await ns.sleep(100)
    }
  } catch (e: any) {
    error_t(ns, "%s: Exception: %s", ns.getScriptName(), e)
  } finally {
    ns.rm(pid_file)
  }

}