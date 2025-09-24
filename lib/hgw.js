import { MyServer } from "lib/servers.js"

/**
 * @param {NS} ns
 * @param {MyServer} server
 * @return {Server} mocked server
 */
export function mock_server(ns, server) {
  const result = ns.formulas.mockServer()
  result.backdoorInstalled = server.backdoor
  result.cpuCores = server.cores
  result.moneyAvailable = server.current_money
  result.hackDifficulty = server.current_security
  result.serverGrowth = server.growth_mult
  result.requiredHackingSkill = server.hack_needed
  result.hostname = server.host
  result.moneyMax = server.max_money
  result.maxRam = server.max_ram
  result.minDifficulty = server.min_security
  result.hasAdminRights = server.nuked
  result.organizationName = server.organization
  result.numOpenPortsRequired = server.ports_needed
  result.ramUsed = server.ram_used
  return result
}

export class ACTION {
  static HACK = new ACTION("hack", "hgw/hack.js", ACTION.calculate_hack_time)
  static GROW = new ACTION("grow", "hgw/grow.js", ACTION.calculate_grow_time)
  static WEAKEN = new ACTION("weaken", "hgw/weaken.js", ACTION.calculate_weaken_time)

  /**
   * @param {string} name Name of action. 
   * @param {string} script Script to execute for this action.
   * @param {(ns: NS, target: MyServer) => number} timing_fn Function to determine a time after the action should start.
   */
  constructor(name, script, timing_fn) {
    this.name = name
    this.script = script
    this.get_timing = timing_fn
  }

  /** @param {NS} ns @param {MyServer} target */
  static calculate_hack_time(ns, target) {
    return ns.formulas.hacking.hackTime(mock_server(ns, target), ns.getPlayer())
  }

  /** @param {NS} ns @param {MyServer} target */
  static calculate_grow_time(ns, target) {
    return ns.formulas.hacking.growTime(mock_server(ns, target), ns.getPlayer())
  }

  /** @param {NS} ns @param {MyServer} target */
  static calculate_weaken_time(ns, target) {
    return ns.formulas.hacking.weakenTime(mock_server(ns, target), ns.getPlayer())
  }
}

/** @param {NS} ns */
function countPortOpeners(ns) {
  let count = 0
  if (ns.fileExists("/BruteSSH.exe")) ++count
  if (ns.fileExists("/FTPCrack.exe")) ++count
  if (ns.fileExists("/HTTPWorm.exe")) ++count
  if (ns.fileExists("/SQLInject.exe")) ++count
  if (ns.fileExists("/relaySMTP.exe")) ++count
  return count
}

/** @param {NS} ns */
function chooseTargetHost(ns) {
  const n00dles = "n00dles", joesguns = "joesguns", phantasy = "phantasy"
  const portOpenerCount = countPortOpeners(ns)
  ns.printf("Found %d port openers", portOpenerCount)
  if (portOpenerCount < 2) {
    return n00dles
  }
  const playerHackLevel = ns.getPlayer().skills.hacking
  const hackLevel4Phantasy = ns.getServerRequiredHackingLevel(phantasy)
  if (portOpenerCount >= 5 && playerHackLevel > hackLevel4Phantasy * 2) {
    return phantasy
  }

  return joesguns
}
