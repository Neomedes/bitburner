import { disableLogs } from "lib/functions"
import { log, log_t, success_t } from "lib/log"
import { get_updated_player } from "/util/update_data"

/** @param {NS} ns
 * @param {int} ms Milliseconds to wait.
 * @param {bool} skip Should waits be omitted?
 */
async function skippableWait(ns: NS, ms: number, skip: boolean = false) {
  if (!skip) {
    await ns.sleep(ms)
  }
}

function tryPurchase(ns: NS, all_nodes: HacknetNode[]): boolean {
  const new_node_index = ns.hacknet.purchaseNode()
  if (new_node_index > -1) {
    log(ns, "Purchased node")
    all_nodes.push(new HacknetNode(ns, new_node_index))
    return true
  }
  return false
}

interface Upgrade {
  node_index: number,
  upgrade_type: string,
  cost: number,
  do_upgrade: () => void
}

class HacknetNode {
  _ns: NS
  index: number
  _level: number
  _cpus: number
  _ram: number
  /**
   * Builds a representation of a hacknet node.
   * @param {NS} ns Namespace, for using upgrading and getting costs
   * @param {number} index Index of node.
   * */
  constructor(ns: NS, index: number) {
    this._ns = ns
    this.index = index

    let stats = this._ns.hacknet.getNodeStats(index)
    this._level = stats.level
    this._cpus = stats.cores
    this._ram = stats.ram
  }

  /**
   * Calculates the next level to reach.
   * @return {number} The next level.
   */
  getNextLevel(): number {
    let nextLevel = 10
    while (nextLevel <= this._level) {
      nextLevel += 10
    }
    return nextLevel
  }

  /**
   * Calculates the levels needed to reach the next level as of {@link getNextLevel}.
   * @return {number} The levels needed to reach the next level.
   */
  getNextLevelDiff(): number {
    return this.getNextLevel() - this._level
  }

  /**
   * Calculates the cost to reach the next level and stores it internally.
   * @see getLevelUpCost
   */
  getLevelUpgradeCost() {
    return this._ns.hacknet.getLevelUpgradeCost(this.index, this.getNextLevelDiff())
  }

  /**
   * Upgrades the level of this node.
   * @return {boolean} True when upgrading was successful, false otherwise.
   */
  upgradeLevel(): boolean {
    let addLevels = this.getNextLevelDiff()
    if (this._ns.hacknet.upgradeLevel(this.index, addLevels)) {
      log(this._ns, "Purchased LVL upgrade for node %d", this.index)
      this._level += addLevels
      this.getLevelUpgradeCost()
      return true
    }
    return false
  }

  /**
   * Calculates the cost to reach the next level and stores it internally.
   */
  getCpuUpgradeCost() {
    return this._ns.hacknet.getCoreUpgradeCost(this.index, 1)
  }

  /**
   * Upgrades the CPU of this node.
   * @return {boolean} True when upgrading was successful, false otherwise.
   */
  upgradeCpu(): boolean {
    if (this._ns.hacknet.upgradeCore(this.index, 1)) {
      log(this._ns, "Purchased CPU upgrade for node %d", this.index)
      this._cpus++
      this.getCpuUpgradeCost()
      return true
    }
    return false
  }

  /**
   * Calculates the cost to reach the next level and stores it internally.
   */
  getRamUpgradeCost() {
    return this._ns.hacknet.getRamUpgradeCost(this.index, 1)
  }

  /**
   * Upgrades the RAM of this node.
   * @return {boolean} True when upgrading was successful, false otherwise.
   */
  upgradeRam(): boolean {
    if (this._ns.hacknet.upgradeRam(this.index, 1)) {
      log(this._ns, "Purchased RAM upgrade for node %d", this.index)
      this._ram *= 2
      return true
    }
    return false
  }

  /**
   * Retrieves the cheapest upgrade for this node.
   * @return An array about the cheapest upgrade for this node.
   */
  getCheapestUpgrade(): Upgrade | undefined {
    let cpuCost = this.getCpuUpgradeCost()
    let ramCost = this.getRamUpgradeCost()
    let lvlCost = this.getLevelUpgradeCost()
    if (cpuCost < ramCost) {
      return { node_index: this.index, upgrade_type: "cpu", cost: cpuCost, do_upgrade: () => this.upgradeCpu() }
    } else if (ramCost < lvlCost) {
      return { node_index: this.index, upgrade_type: "ram", cost: ramCost, do_upgrade: () => this.upgradeRam() }
    } else if (isFinite(lvlCost)) {
      return { node_index: this.index, upgrade_type: "lvl", cost: lvlCost, do_upgrade: () => this.upgradeLevel() }
    }
    return undefined
  }

}

/** @param {NS} ns */
export async function main(ns: NS) {
  disableLogs(ns, "sleep")

  const OPTS = ns.flags([
    ['burn', false], // burn through money and exit
    ['money', 10], // percentage of money available for purchasing when not burning
  ])
  OPTS.money = OPTS.burn === true ? 100 : Math.min(Math.max(0, OPTS.money as number), 100)

  async function seconds(sec: number) {
    await skippableWait(ns, sec * 1000, OPTS.burn === true)
  }
  async function minutes(min: number) {
    await seconds(min * 60)
  }


  const NODES: HacknetNode[] = []
  let currentNodeCount = ns.hacknet.numNodes()
  for (let i = 0; i < currentNodeCount; i++) {
    NODES.push(new HacknetNode(ns, i))
  }
  const MAX_NODES = ns.hacknet.maxNumNodes()

  let player = await get_updated_player(ns)
  let last_iterations_money = player.money * (100 - OPTS.money) / 100
  for (; ;) {
    const upgrades = NODES.map(n => n.getCheapestUpgrade()).filter(upg => upg !== undefined)
    if (currentNodeCount < MAX_NODES) {
      upgrades.push({
        node_index: currentNodeCount,
        upgrade_type: "buy",
        cost: ns.hacknet.getPurchaseNodeCost(),
        do_upgrade: () => {
          if (tryPurchase(ns, NODES)) currentNodeCount++
        },
      })
    }
    let cheapestUpgrade = upgrades.reduce((cheapestOverallUpgrade, cheapestNodeUpgrade) => {
      if (cheapestOverallUpgrade === undefined) return cheapestNodeUpgrade
      if (cheapestNodeUpgrade === undefined) return cheapestOverallUpgrade
      if (cheapestNodeUpgrade.cost < cheapestOverallUpgrade.cost) return cheapestNodeUpgrade
      return cheapestOverallUpgrade
    })
    if (cheapestUpgrade === undefined) {
      // there is no cheapest upgrade
      success_t(ns, "Es gibt nichts mehr zu updaten. Skript wird beendet.")
      break
    }
    // upgrade when enough money is available
    let printed_wait_msg = false
    for (; ;) {
      player = await get_updated_player(ns)
      const money_available = player.money - last_iterations_money
      if (money_available < 0) {
        // the money was drained by others means, so adjust accordingly
        last_iterations_money = player.money
      } else if (money_available >= cheapestUpgrade.cost) {
        cheapestUpgrade.do_upgrade()
        // end waiting for funds
        break
      } else {
        if (!printed_wait_msg) {
          log(ns,
            "Warte auf Geld (Node: %d, Upg: %s, Preis: %s, Baseline: %s)",
            cheapestUpgrade.node_index,
            cheapestUpgrade.upgrade_type,
            ns.formatNumber(cheapestUpgrade.cost),
            ns.formatNumber(last_iterations_money),
          )
          printed_wait_msg = true
        }
        await seconds(30)
      }
    }
    last_iterations_money = player.money - cheapestUpgrade.cost
  }
}