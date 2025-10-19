import { disableLogs } from "lib/functions"
import { log, log_t } from "lib/log"

/** @param {NS} ns
 * @param {int} ms Milliseconds to wait.
 * @param {bool} skip Should waits be omitted?
 */
async function skippableWait(ns: NS, ms: number, skip: boolean = false) {
  if (!skip) {
    await ns.sleep(ms)
  }
}

/** @param {NS} ns */
function tryPurchase(ns: NS): boolean {
  return ns.hacknet.purchaseNode() > -1
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
   * @return {Upgrade | null} An array about the cheapest upgrade for this node.
   */
  getCheapestUpgrade(): Upgrade | null {
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
    return null
  }

}

/** @param {NS} ns */
export async function main(ns: NS) {
  disableLogs(ns, "sleep")

  const OPTS = ns.flags([
    ['burn', false], // burn through money and exit
    ['money', 10], // percentage of money available for purchasing when not burning
  ])

  // TODO get player

  async function seconds(sec: number) {
    await skippableWait(ns, sec * 1000, OPTS.burn === true)
  }
  async function minutes(min: number) {
    await seconds(min * 60)
  }

  const NODES = []
  let currentNodeCount = ns.hacknet.numNodes()
  for (let i = 0; i < currentNodeCount; i++) {
    NODES.push(new HacknetNode(ns, i))
  }
  const MAX_NODES = ns.hacknet.maxNumNodes()

  let bought = true
  for (; ;) {
    // always try to purchase a new node
    if (tryPurchase(ns)) {
      log(ns, "Purchased node")
      NODES.push(new HacknetNode(ns, currentNodeCount))
      currentNodeCount++
      bought = true
    } else {
      let bestInvest = NODES
        .map(n => n.getCheapestUpgrade())
        .reduce((cheapestOverallUpgrade, cheapestNodeUpgrade) => {
          if (cheapestOverallUpgrade == null) return cheapestNodeUpgrade
          if (cheapestNodeUpgrade == null) return cheapestOverallUpgrade
          if (cheapestNodeUpgrade.cost < cheapestOverallUpgrade.cost) return cheapestNodeUpgrade
          return cheapestOverallUpgrade
        })
      if (bestInvest != null) {
        // upgrade if enough money is available
        let playerMoney = ns.getPlayer().money
        if (playerMoney >= bestInvest.cost) {
          bestInvest.do_upgrade()
          bought = true
        } else {
          if (bought)
            log(ns, "Waiting for funds to upgrade %s for node %d (cost: %s, player has %s)", bestInvest.upgrade_type, bestInvest.node_index, ns.formatNumber(bestInvest.cost), ns.formatNumber(playerMoney))
          bought = false
        }
      } else if (currentNodeCount >= MAX_NODES) {
        // end loop, because there is nothing more to do.
        log_t(ns, "nothing left to purchase")
        log_t(ns, "ending...")
        bought = false
        break
      } else {
        if (bought)
          log(ns, "Nothing to upgrade, waiting for next node to purchase...")
        bought = false
        await minutes(5)
      }
    }
    await seconds(10)
  }
}