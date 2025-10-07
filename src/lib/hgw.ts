import { MyServer } from "lib/servers"

/**
 * @param {NS} ns
 * @param {MyServer} server
 * @return {Server} mocked server
 */
export function mock_server(ns: NS, server: MyServer) {
  const result = ns.formulas.mockServer()
  result.backdoorInstalled = server.backdoor
  result.cpuCores = server.cores ?? 1
  result.moneyAvailable = server.current_money
  result.hackDifficulty = server.current_security
  result.serverGrowth = server.growth_mult
  result.requiredHackingSkill = server.hack_needed
  result.hostname = server.host
  result.moneyMax = server.max_money
  result.maxRam = server.max_ram ?? 0
  result.minDifficulty = server.min_security
  result.hasAdminRights = server.nuked ?? false
  result.organizationName = server.organization ?? ""
  result.numOpenPortsRequired = server.ports_needed
  result.ramUsed = server.ram_used ?? 0
  return result
}

export class ACTION {
  name: string
  script: string
  get_timing: (ns: NS, target: MyServer) => number

  static HACK = new ACTION("hack", "hgw/hack.js", ACTION.calculate_hack_time)
  static GROW = new ACTION("grow", "hgw/grow.js", ACTION.calculate_grow_time)
  static WEAKEN = new ACTION("weaken", "hgw/weaken.js", ACTION.calculate_weaken_time)

  /**
   * @param {string} name Name of action. 
   * @param {string} script Script to execute for this action.
   * @param {(ns: NS, target: MyServer) => number} timing_fn Function to determine a time after the action should start.
   */
  constructor(name: string, script: string, timing_fn: (ns: NS, target: MyServer) => number) {
    this.name = name
    this.script = script
    this.get_timing = timing_fn
  }

  /** @param {NS} ns @param {MyServer} target */
  static calculate_hack_time(ns: NS, target: MyServer): number {
    return ns.formulas.hacking.hackTime(mock_server(ns, target), ns.getPlayer())
  }

  /** @param {NS} ns @param {MyServer} target */
  static calculate_grow_time(ns: NS, target: MyServer): number {
    return ns.formulas.hacking.growTime(mock_server(ns, target), ns.getPlayer())
  }

  /** @param {NS} ns @param {MyServer} target */
  static calculate_weaken_time(ns: NS, target: MyServer): number {
    return ns.formulas.hacking.weakenTime(mock_server(ns, target), ns.getPlayer())
  }
}

/** @param {NS} ns */
function countPortOpeners(ns: NS) {
  let count = 0
  if (ns.fileExists("/BruteSSH.exe")) ++count
  if (ns.fileExists("/FTPCrack.exe")) ++count
  if (ns.fileExists("/HTTPWorm.exe")) ++count
  if (ns.fileExists("/SQLInject.exe")) ++count
  if (ns.fileExists("/relaySMTP.exe")) ++count
  return count
}

/** @param {NS} ns */
function chooseTargetHost(ns: NS): "n00dles" | "joesguns" | "phantasy" {
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
