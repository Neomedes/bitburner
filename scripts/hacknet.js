import { disableLogs, log, log_t } from "scripts/functions.js"

/** @param {NS} ns
 * @param {int} ms Milliseconds to wait.
 * @param {bool} skip Should waits be omitted?
 */
async function skippableWait(ns, ms, skip = false) {
  if (!skip) {
    await ns.sleep(ms)
  }
}

/** @param {NS} ns */
function tryPurchase(ns) {
  return ns.hacknet.purchaseNode() > -1
}

class HacknetNode {
  /**
   * Builds a representation of a hacknet node.
   * @param {NS} ns Namespace, for using upgrading and getting costs
   * @param {int} index Index of node.
   * @param {int} level Level of node.
   * @param {int} cpus Installed CPUs.
   * @param {int} ram Installed RAM.
   * */
  constructor(ns, index) {
    this._localNS = ns
    this._idx = index
    this.init()
  }

  /**
   * @return {NS} The namespace.
   */
  _ns() {
    return this._localNS
  }

  init() {
    let stats = this._ns().hacknet.getNodeStats(this._idx)
    this._level = stats.level
    this._cpus = stats.cores
    this._ram = stats.ram
  }

  /**
   * Calculates the next level to reach.
   * @return {int} The next level.
   */
  getNextLevel() {
    let nextLevel = 10
    while (nextLevel <= this._level) {
      nextLevel += 10
    }
    return nextLevel
  }

  /**
   * Calculates the levels needed to reach the next level as of {@link getNextLevel}.
   * @return {int} The levels needed to reach the next level.
   */
  getNextLevelDiff() {
    return this.getNextLevel() - this._level
  }

  /**
   * Calculates the cost to reach the next level and stores it internally.
   * @see getLevelUpCost
   */
  _updateLevelUpgradeCost() {
    this._levelUpCost = this._ns().hacknet.getLevelUpgradeCost(this._idx, this.getNextLevelDiff())
  }

  /**
   * Retrieves the cost to reach the next level.
   * @return {number} Cost to upgrade to the next level.
   */
  getLevelUpgradeCost() {
    if (this._levelUpCost == null) {
      this._updateLevelUpgradeCost()
    }
    return this._levelUpCost
  }

  /**
   * Upgrades the level of this node.
   * @return {bool} True when upgrading was successful, false otherwise.
   */
  upgradeLevel() {
    let addLevels = this.getNextLevelDiff()
    if (this._ns().hacknet.upgradeLevel(this._idx, addLevels)) {
      log(this._ns(), "Purchased LVL upgrade for node %d", this._idx)
      this._level += addLevels
      this._updateLevelUpgradeCost()
      return true
    }
    return false
  }

  /**
   * Calculates the cost to reach the next level and stores it internally.
   */
  _updateCpuUpgradeCost() {
    this._cpuUpCost = this._ns().hacknet.getCoreUpgradeCost(this._idx, 1)
  }

  /**
   * Retrieves the cost to reach the next level.
   * @return {number} Cost to upgrade to the next CPU level.
   */
  getCpuUpgradeCost() {
    if (this._cpuUpCost == null) {
      this._updateCpuUpgradeCost()
    }
    return this._cpuUpCost
  }

  /**
   * Upgrades the CPU of this node.
   * @return {bool} True when upgrading was successful, false otherwise.
   */
  upgradeCpu() {
    if (this._ns().hacknet.upgradeCore(this._idx, 1)) {
      log(this._ns(), "Purchased CPU upgrade for node %d", this._idx)
      this._cpus++
      this._updateCpuUpgradeCost()
      return true
    }
    return false
  }

  /**
   * Calculates the cost to reach the next level and stores it internally.
   */
  _updateRamUpgradeCost() {
    this._ramUpCost = this._ns().hacknet.getRamUpgradeCost(this._idx, 1)
  }

  /**
   * Retrieves the cost to reach the next level.
   * @return {number} Cost to upgrade to the next CPU level.
   */
  getRamUpgradeCost() {
    if (this._ramUpCost == null) {
      this._updateRamUpgradeCost()
    }
    return this._ramUpCost
  }

  /**
   * Upgrades the RAM of this node.
   * @return {bool} True when upgrading was successful, false otherwise.
   */
  upgradeRam() {
    if (this._ns().hacknet.upgradeRam(this._idx, 1)) {
      log(this._ns(), "Purchased RAM upgrade for node %d", this._idx)
      this._ram *= 2
      this._updateRamUpgradeCost()
      return true
    }
    return false
  }

  /**
   * Retrieves the cheapest upgrade for this node.
   * @return {[index: number, choice: string, cost: number, upgradeFn: () => void]} An array about the cheapest upgrade for this node.
   */
  getCheapestUpgrade() {
    let cpuCost = this.getCpuUpgradeCost()
    let ramCost = this.getRamUpgradeCost()
    let lvlCost = this.getLevelUpgradeCost()
    if (cpuCost < ramCost) {
      return [this._idx, "cpu", cpuCost, () => this.upgradeCpu()]
    } else if (ramCost < lvlCost) {
      return [this._idx, "ram", ramCost, () => this.upgradeRam()]
    } else if (isFinite(lvlCost)) {
      return [this._idx, "lvl", lvlCost, () => this.upgradeLevel()]
    }
    return null
  }

}



/** @param {NS} ns */
export async function main(ns) {
  disableLogs(ns, "sleep")

  const options = ns.flags([
    ['b', false], // burn through money and exit
  ])
  async function seconds(sec) {
    await skippableWait(ns, sec * 1000, options.b)
  }
  async function minutes(min) {
    await seconds(min * 60)
  }

  const NODES = []
  let currentNodeCount = ns.hacknet.numNodes()
  for (let i = 0; i < currentNodeCount; i++) {
    NODES.push(new HacknetNode(ns, i))
  }
  const MAX_NODES = ns.hacknet.maxNumNodes()
  // always try to start with 3 nodes
  while (currentNodeCount < 3) {
    if (tryPurchase(ns)) {
      NODES.push(new HacknetNode(ns, currentNodeCount))
      currentNodeCount++
    }
    await seconds(10)
  }

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
          // if no overall upgrade is chosen or if cheapest node upgrade is less pricy
          if (cheapestNodeUpgrade != null && (cheapestOverallUpgrade == null || cheapestOverallUpgrade[2] > cheapestNodeUpgrade[2])) {
            return cheapestNodeUpgrade
          } else if (cheapestOverallUpgrade != null) {
            return cheapestOverallUpgrade
          }
          return null
        })
      if (bestInvest != null) {
        // upgrade if enough money is available
        let playerMoney = ns.getPlayer().money
        if (playerMoney >= bestInvest[2]) {
          bestInvest[3]()
          bought = true
        } else {
          if (bought)
            log(ns, "Waiting for funds to upgrade %s for node %d (cost: %s, player has %s)", bestInvest[1], bestInvest[0], ns.formatNumber(bestInvest[2]), ns.formatNumber(playerMoney))
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