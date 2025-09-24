import { error_t, warning_t, assert } from "scripts/functions.js"

const LINES_PER_TABLE_BLOCK = 3

/** @param {number} ram The RAM to calculate the level for. */
function getRamLevel(ram) {
  let level = 1
  while (2 ** level < ram) {
    level++
  }
  return level
}

/** @param {NS} ns Netscript API. */
function getMaxRamLevel(ns) {
  return getRamLevel(ns.getPurchasedServerMaxRam())
}

/** @param {NS} ns Netscript API. */
function getRamLevels(ns) {
  const levels = [...Array(getMaxRamLevel(ns) + 1).keys()].slice(1)
  return levels
}

/**
 * Purchase servers for real. No more security checks. Writes a protocol to the terminal and a toast.
 * @param {NS} ns Netscript API.
 * @param {string[]} owned_servers Hostnames of already owned servers.
 * @return {{host: string, level: number, ram: number, upgradeCosts: {level: number, cost: number}[]}[]}
 */
function get_owned_servers(ns) {
  const ramLevels = getRamLevels(ns)
  const servers = ns.getPurchasedServers().map(host => {
    const server = ns.getServer(host)
    const level = getRamLevel(server.maxRam)
    const upgradeCosts = ramLevels.map(lv => lv <= level ? { level: lv, cost: 0 } : { level: lv, cost: ns.getPurchasedServerUpgradeCost(host, 2 ** level) })
    return { host, level, ram: server.maxRam, upgradeCosts }
  })
  return servers
}

/**
 * Get Info about RAM-Levels and what servers already have
 * @param {NS} ns Netscript API.
 * @param {{host: string, level: number, ram: number, upgradeCosts: {level: number, cost: number}[]}[]?} owned_servers Server info of already purchased servers. Optional, will be directly queried if omitted.
 */
function getRamInfo(ns, owned_servers = null) {
  const ramLevels = getRamLevels(ns)
  const servers = owned_servers ?? get_owned_servers(ns)
  const ramInfo = ramLevels.map(lv => {
    return {
      level: lv,
      ram: 2 ** lv,
      cost: ns.getPurchasedServerCost(2 ** lv),
      servers: servers.filter(s => s.level === lv),
    }
  })
  return ramInfo
}

/**
 * Purchase servers for real. No more security checks. Writes a protocol to the terminal and a toast.
 * @param {NS} ns Netscript API.
 * @param {number} count How many servers should be purchased.
 * @param {number} ram How much RAM should each server have.
 * @param {number} startIndex At what index should the naming begin.
 */
function buyServers(ns, count, ram, startIndex) {
  const hostnames = []
  for (let i = 0; i < count; i++) {
    const name = `psrv${String(startIndex + i).padStart(3, "0")}`
    //ns.tprintf("Purchase server with name %s and %s RAM", name, ns.formatRam(ram))
    const hostname = ns.purchaseServer(name, ram)
    if (hostname !== "") {
      hostnames.push(hostname)
    }
  }
  if (hostnames.length < count) {
    error_t(ns, "Es wurden nicht %d Server gekauft!", count)
  }
  if (hostnames.length > 0) {
    ns.tprintf("%d Server mit je %s RAM gekauft", hostnames.length, ns.formatRam(ram))
    if (hostnames.length === 1) {
      ns.tprintf("Neuer Server: %s", hostnames[0])
    } else {
      ns.tprintf("Neue Server:")
      hostnames.forEach(host => ns.tprintf("  %s", host))
    }
  }
  return hostnames.length
}

/**
 * Checks whether any servers are buyable.
 * @param {NS} ns Netscript API.
 * @param {number} available_servers Maximum number of servers than can yet be purchased
 * @param {number} owned_servers Number of servers already owned
 * @param {boolean} error Display message as an error (true) or warning (false)
 */
function check_any_buyable(ns, available_servers, owned_servers, error = true) {
  if (available_servers < 1) {
    (error ? error_t : warning_t)(ns, "No servers available for purchase, limit of %d servers already reached.", owned_servers.length)
    ns.exit()
  }
}

/**
 * Purchase servers. Writes a protocol to the terminal and a toast.
 * @param {NS} ns Netscript API.
 * @param {number} count How many servers should be purchased.
 * @param {number} ramLevel How much RAM should each server have, determined by the level (2 to the power of the level). -1 for buying with max RAM.
 * @param {number} available_servers Maximum number of servers than can be purchased
 * @param {number} owned_servers Number of servers already owned
 * @param {number} playerMoney Money available for purchasing servers
 */
function manage_buy(ns, count, ramLevel, available_servers, owned_servers, playerMoney) {
  // buy the specified amount of the given or highest tier
  const purchaseCount = Math.min(available_servers, count)
  if (purchaseCount < count) {
    warning_t(ns, "Only %d servers available, cannot buy %d. Reducing amount to %d servers.", available_servers, count, purchaseCount)
  }

  if (ramLevel === -1) {
    // buy as much RAM as possible
    const maxCostPerServer = Math.floor(playerMoney / purchaseCount)
    const maxRam = ns.getPurchasedServerMaxRam()
    let baseRam = maxRam, baseCost = ns.getPurchasedServerCost(baseRam)
    while (baseRam >= 2 && baseCost > maxCostPerServer) {
      baseRam = Math.round(baseRam / 2.0)
      baseCost = baseRam >= 2 ? ns.getPurchasedServerCost(baseRam) : 0
    }
    // now we can buy [purchaseCount] servers with [baseRam] RAM each
    // but first we try to upgrade some of those servers with the next tier
    // only if we are not on the highest tier
    let upgradeCount = 0
    if (baseRam < maxRam) {
      const moneyRemaining = playerMoney - (purchaseCount * baseCost)
      const upgradeCost = ns.getPurchasedServerCost(baseRam * 2) - baseCost
      upgradeCount = Math.floor(moneyRemaining / upgradeCost)
      assert(upgradeCount < purchaseCount, `upgradeCount (${upgradeCount}) is not less than purchaseCount (${purchaseCount})`)
    }
    let bought = buyServers(ns, purchaseCount - upgradeCount, baseRam, owned_servers)
    if (upgradeCount > 0) {
      buyServers(ns, upgradeCount, baseRam * 2, owned_servers + bought)
    }
  } else {
    // ramLevelOpt must be an integer because of the definition
    const ram = 2 ** ramLevel
    const costPerServer = ns.getPurchasedServerCost(ram)
    const maxPurchase = Math.min(purchaseCount, Math.floor(playerMoney / costPerServer))
    if (maxPurchase < 1) {
      error_t(ns, "Not enough money to buy at least one server with %s RAM", ns.formatRam(ram))
    } else if (maxPurchase < purchaseCount) {
      warning_t(ns, "Not enough money to buy all %d servers. Reducing amount to %d servers.", purchaseCount, maxPurchase)
    }
    buyServers(ns, maxPurchase, ram, owned_servers)
  }

}

/**
 * Lists already owned servers.
 * @param {NS} ns Netscript API.
 * @param {{host: string, level: number, ram: number, upgradeCosts: {level: number, cost: number}[]}[]?} owned_servers Server info of already purchased servers. Optional, will be directly queried if omitted.
 */
function listOwnedServers(ns, owned_servers) {
  if (owned_servers.length > 0) {
    function spacer() {
      ns.tprintf("+----------------------+------------+-------+")
    }
    function line(host, ram, level, is_title = false) {
      ns.tprintf("| %-20s | %10s | %5s |", host, is_title ? ram : ns.formatRam(ram), is_title ? level : ns.formatNumber(level, 0))
    }
    ns.tprintf("%d servers already purchased:", owned_servers.length)
    ns.tprintf(" ")

    spacer()
    line("Hostname", "RAM", "Level", true)
    spacer()

    let lineNum = 0
    for (let server of owned_servers) {
      if (lineNum >= LINES_PER_TABLE_BLOCK) {
        spacer()
        lineNum = 0
      }
      line(server.host, server.ram, server.level)
      lineNum++
    }

    spacer()
  } else {
    ns.tprint("No servers already purchased\n")
  }
}

/**
 * Lists RAM options if additional servers can be bought
 * @param {NS} ns Netscript API.
 * @param {number} available_servers Maximum number of servers than can be purchased
 * @param {{host: string, level: number, ram: number, upgradeCosts: {level: number, cost: number}[]}[]?} owned_servers Server info of already purchased servers. Optional, will be directly queried if omitted.
 */
function list_ram_options(ns, available_servers, owned_servers, playerMoney) {
  if (available_servers > 0) {
    ns.tprintf("%d servers available for purchasing:", available_servers)
    function spacer() {
      ns.tprintf("+-----+------------+------------+------------+------------+")
    }
    function line(level, ram, cost, canBuy, cmd, is_title = false) {
      if (is_title) {
        ns.tprintf("| %3s | %10s | %10s | %10s | %10s |", level, ram, cost, canBuy, cmd)
      } else {
        ns.tprintf("| %3s | %10s | %10s | %10s | %10s |", ns.formatNumber(level, 0), ns.formatRam(ram), ns.formatNumber(cost), ns.formatNumber(canBuy, 0), cmd)
      }
    }

    spacer()
    line("Lv", "RAM", "Cost", "Can buy", "-b cmd", true)
    spacer()

    let level = 1, ram = 2
    const maxRam = ns.getPurchasedServerMaxRam()

    let lineNum = 0
    while (ram <= maxRam) {
      if (lineNum >= LINES_PER_TABLE_BLOCK) {
        spacer()
        lineNum = 0
      }

      let cost = ns.getPurchasedServerCost(ram)
      let numMaxBuy = Math.min(available_servers, Math.floor(playerMoney / cost))
      let purchaseCommand = numMaxBuy > 0 ? `${numMaxBuy}x${level}` : ""

      line(level, ram, cost, numMaxBuy, purchaseCommand)

      ram *= 2
      level++
      lineNum++
    }
    spacer()
  } else {
    ns.tprint("No servers available for purchasing")
  }
}

/**
 * Purchase servers and upgrade them.
 * @param {NS} ns
 */
export async function main(ns) {
  /**
   * Prints the help and exits the script.
   * @return {never}
   */
  function printHelpAndExit() {
    ns.tprintf("Programm zum Cluster-Management der privater Server, kurz psrv.")
    ns.tprintf("Ohne Parameter werden die aktuell vorhandenen Server aufgelistet, sowie die ggf. verfügbaren RAM-Optionen für neue Server.")
    ns.tprintf(" ")
    ns.tprintf("Allgemein:")
    ns.tprintf("%-16s - %s", "-s [money] |", "Behält beim Kauf eine Rücklage i.H.v. [money] ein.")
    ns.tprintf("%-16s - %s", "--save [money]", "s.o.")
    ns.tprintf("%-16s - %s", "-? | --help", "Zeigt diese Hilfe an und beendet das Skript")
    ns.tprintf(" ")
    ns.tprintf("Manueller Kauf:")
    ns.tprintf("%-16s - %s", "-b max", "Kauft so viele neue Server wie möglich mit so viel RAM wie möglich.")
    ns.tprintf("%-16s - %s", "-b [d]", "Kauft die angegebene Anzahl [d] neuer Server mit so viel RAM wie möglich.")
    ns.tprintf("%-16s - %s", "-b [d]x[l]", "Kauft die angegebene Anzahl [d] neuer Server mit dem angegebenen RAM-Level.")
    ns.tprintf(" ")
    ns.tprintf("Manuelles Upgrade:")
    ns.tprintf("%-16s - %s", "-u max", "Kauft so viele neue Server wie möglich mit so viel RAM wie möglich.")
    ns.tprintf("%-16s - %s", "-u [d]", "Kauft die angegebene Anzahl [d] neuer Server mit so viel RAM wie möglich.")
    ns.tprintf("%-16s - %s", "-u [d]x[l]", "Kauft die angegebene Anzahl [d] neuer Server mit dem angegebenen RAM-Level.")
    ns.tprintf(" ")
    ns.tprintf("Automatischer Kauf:")
    ns.tprintf("%-16s - %s", "-a", "Kauft gleichmäßig so lange neue Server oder erweitert vorhandene, bis alle Server auf MAX sind.")
    ns.exit()
  }

  const OPTS = ns.flags([
    ['b', ""], // purchase servers
    ['u', ""], // upgrade servers
    ['s', 0], ['save', 0], // save amount of money
    ['?', false], ['help', false], // help
  ])

  if (OPTS["?"] || OPTS.help) {
    printHelpAndExit()
  }

  const SERVER_LIMIT = ns.getPurchasedServerLimit()
  const owned_servers = get_owned_servers(ns)
  const available_servers = SERVER_LIMIT - owned_servers.length

  const playerMoney = ns.getPlayer().money - (OPTS.s + OPTS.save)

  if (OPTS.b.length > 0) {

    // check for max
    if (OPTS.b.toLowerCase() === "max") {
      // buy as much as possible
      check_any_buyable(ns, available_servers, owned_servers.length, false)
      manage_buy(ns, available_servers, -1, available_servers, playerMoney)

    } else if (OPTS.b.match(/^\d+$/)) {
      // buy given amount with max RAM
      check_any_buyable(ns, available_servers, owned_servers.length)
      const count = parseInt(OPTS.b)
      manage_buy(ns, count, -1, available_servers, playerMoney)

    } else if (OPTS.b.match(/^\d+x\d+$/)) {
      check_any_buyable(ns, available_servers, owned_servers.length)

      const [countOpt, ramLevelOpt] = OPTS.b.split("x")
      const count = parseInt(countOpt)
      const ramLevel = parseInt(ramLevelOpt)

      manage_buy(ns, count, ramLevel, available_servers, owned_servers.length, playerMoney)
    } else {
      error_t(ns, "Unzulässiger Wert für Parameter -p: %s", OPTS.b)
      printHelpAndExit()
    }

  } else if (OPTS.u.length > 0) {

    // check for max
    if (OPTS.u.toLowerCase() === "max") {
      // upgrade as much as possible
      check_any_buyable(ns, available_servers, owned_servers.length, false)
      manage_buy(ns, available_servers, -1, available_servers, playerMoney)

    } else if (OPTS.u.match(/^\d+$/)) {
      // buy given amount with max RAM
      check_any_buyable(ns, available_servers, owned_servers.length)
      const count = parseInt(OPTS.u)
      manage_buy(ns, count, -1, available_servers, playerMoney)

    } else if (OPTS.u.match(/^\d+x\d+$/)) {
      check_any_buyable(ns, available_servers, owned_servers.length)

      const [countOpt, ramLevelOpt] = OPTS.u.split("x")
      const count = parseInt(countOpt)
      const ramLevel = parseInt(ramLevelOpt)

      manage_buy(ns, count, ramLevel, available_servers, owned_servers.length, playerMoney)
    } else {
      error_t(ns, "Unzulässiger Wert für Parameter -p: %s", OPTS.u)
      printHelpAndExit()
    }

  } else if (OPTS.a) {
    // start automatic buy...
  } else {
    listOwnedServers(ns, owned_servers)
    ns.tprintf(" ")
    list_ram_options(ns, available_servers, owned_servers, playerMoney)
  }
  // getPurchasedServerCost(ram)	Get cost of purchasing a server.
  // getPurchasedServerLimit()	Returns the maximum number of servers you can purchase.
  // getPurchasedServerMaxRam()	Returns the maximum RAM that a purchased server can have.
  // getPurchasedServers()	Returns an array with the hostnames of all of the servers you have purchased.
  // getPurchasedServerUpgradeCost(hostname, ram)
}