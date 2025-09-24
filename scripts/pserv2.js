import { COLOR, error_t, warning_t, assert, formatTime } from "lib/functions.js"

const LINES_PER_TABLE_BLOCK = 3
const AUTOMATIC_BUY_INTERVAL = 60000 // every minute
const HOSTNAME_PREFIX = "psrv"

class ServerLevel {
  static MAX_LV = 20 // default
  /** @type {ServerLevel[]} */
  static LEVELS = [] // already defined levels

  /**
   * @param {number} lv The level
   */
  constructor(lv) {
    this.lv = lv
    this.ram = 2 ** lv
  }

  /**
   * @param {ServerLevel} other
   */
  greater_than(other) {
    return other == null || (this.lv > other.lv)
  }

  /**
   * @return {boolean} Is this the max level
   */
  is_max() {
    return this.lv === ServerLevel.MAX_LV
  }

  /**
   * @return {ServerLevel} The next level
   */
  next_level() {
    if (this.is_max()) {
      throw new Error("Level kann nicht übers Maximum hinaus erhöht werden.")
    }
    return ServerLevel.get_level(this.lv + 1)
  }

  toString() {
    return "Lv" + String(this.lv).padStart(2, "0")
  }

  /**
   * @param {number} lv The desired level.
   * @return {ServerLevel}
   */
  static get_level(lv) {
    const defined = ServerLevel.LEVELS.find(level => level.lv === lv)
    if (defined) {
      return defined
    }
    const new_level = new ServerLevel(lv)
    ServerLevel.LEVELS.push(new_level)
    return new_level
  }

  /**
   * @param {number} lv
   * @return {ServerLevel}
   */
  static by_level(lv) {
    return ServerLevel.get_level(lv)
  }
  /**
   * @param {number} ram
   * @return {ServerLevel}
   */
  static by_ram(ram) {
    return ServerLevel.get_level(ServerLevel.ram2lv(ram))
  }

  /**
   * Calculates the server level by its RAM.
   * @param {number} ram The RAM to calculate the level for.
   * @return {number} The corresponding server level.
   */
  static ram2lv(ram) {
    let lv = 1
    while (2 ** lv < ram) {
      lv++
    }
    return lv
  }

  /**
   * Gets the maximum server level
   * @param {NS} ns Netscript API
   * @return {number} The maximum server level.
   */
  static get_max_lv(ns) {
    ServerLevel.MAX_LV = ServerLevel.ram2lv(ns.getPurchasedServerMaxRam())
    return ServerLevel.MAX_LV
  }

  static BASE_LEVEL() {
    return ServerLevel.get_level(1)
  }

}

class OwnedServer {
  /**
   * @param {string} host
   * @param {ServerLevel} current_level
   */
  constructor(host, current_level) {
    this.host = host
    this.current_level = current_level
  }

  /**
   * @param {NS} ns
   * @param {ServerLevel} level
   */
  get_cost(ns, level) {
    if (!level.greater_than(this.current_level)) {
      //ns.tprintf("get_cost(%s): %s <= %s so cost is 0", this.host, level.toString(), this.current_level.toString())
      return 0
    }
    const cost = ns.getPurchasedServerUpgradeCost(this.host, level.ram)
    //ns.tprintf("get_cost(%s): from %s to %s = %s", this.host, this.current_level.toString(), level.toString(), ns.formatNumber(cost))
    return cost
  }

  /**
   * @param {OwnedServer} other
   */
  compare_to(other) {
    return OwnedServer.compare(this, other)
  }

  /**
   * @param {NS} ns
   * @param {ServerLevel} to_level
   */
  upgrade(ns, to_level) {
    ns.tprintf("Upgrade %s to %s RAM", this.host, ns.formatRam(to_level.ram))
    if (ns.upgradePurchasedServer(this.host, to_level.ram)) {
      this.current_level = to_level
      return true
    }
    return false
  }

  /**
   * @param {NS} ns
   * @param {string} host
   */
  static build(ns, host) {
    const server = ns.getServer(host)
    const current_level = ServerLevel.by_ram(server.maxRam)
    return new OwnedServer(host, current_level)
  }

  /**
   * @param {OwnedServer} a
   * @param {OwnedServer} b
   * @param {{order_by: ("lv"|"host")[], ascending: {"lv": boolean, "host": boolean}}} options
   */
  static compare(a, b, options = { order_by: ["lv", "host"], ascending: { "lv": true, "host": true } }) {
    if (a === b) {
      return 0
    }
    if (a == null) {
      return -1
    }
    if (b == null) {
      return 1
    }
    for (let i = 0; i < options.order_by.length; i++) {
      const order_field = options.order_by[i]
      let order_value
      switch (order_field) {
        case "lv":
          order_value = a.current_level.lv - b.current_level.lv
          break;
        case "host":
          order_value = a.host.localeCompare(b.host)
          break;
      }
      if (options.ascending[order_field] === false) {
        order_value *= -1
      }
      if (order_value !== 0) {
        return order_value
      }
    }
    return 0
  }
}

class ServerLevelOverviewItem {
  /**
   * @param {ServerLevel} level
   * @param {number} cost
   * @param {OwnedServer[]} owned_servers
   */
  constructor(level, cost, owned_servers) {
    this.level = level
    this.cost = cost
    this.owned_servers = owned_servers.filter(os => os.current_level.lv === this.level.lv)
  }
}

/**
 * Lists RAM options if additional servers can be bought
 * @param {NS} ns Netscript API.
 * @param {number} available_servers How many servers may still be bought.
 * @param {ServerLevelOverviewItem[]} overview_items The overview items to display.
 * @param {number} save_money How much money should not be used for purchasing.
 */
function print_overview(ns, available_servers, overview_items, save_money) {
  if (available_servers > 0) {
    ns.tprintf("%d Server können noch gekauft werden.", available_servers)
  } else {
    ns.tprintf("Es können keine Server mehr gekauft werden.")
  }


  function spacer() {
    ns.tprintf("+-----+------------+------------+------------+------------------+------------+")
  }
  function line(level, ram, cost, canBuy, server, upgradable, all_strings = false) {
    if (all_strings) {
      ns.tprintf("| %3s | %10s | %10s | %10s | %16s | %10s |", level, ram, cost, canBuy, server, upgradable)
    } else {
      ns.tprintf("| %3s | %10s | %10s | %10s | %16s | %10s |", ns.formatNumber(level, 0), ns.formatRam(ram), ns.formatNumber(cost), ns.formatNumber(canBuy, 0), server, upgradable)
    }
  }

  spacer()
  line("Lv", "RAM", "Preis", "Verfügbar", "In Besitz", "Upgrade?", true)
  spacer()

  const usable_money = ns.getPlayer().money - save_money
  for (let idx in overview_items) {
    if (idx % LINES_PER_TABLE_BLOCK === 0 && idx > 0) {
      spacer()
    }

    const item = overview_items[idx]
    const can_buy = Math.min(available_servers, Math.floor(usable_money / item.cost))
    if (item.owned_servers.length === 0) {
      line(item.level.lv, item.level.ram, item.cost, can_buy, "-", "")
    } else {
      const first_server = item.owned_servers[0]
      const has_next_level = !first_server.current_level.is_max()
      const upgrade_cost = has_next_level ? first_server.get_cost(ns, first_server.current_level.next_level()) : 0
      const upgradable = has_next_level ? (upgrade_cost <= usable_money ? "Ja" : ns.formatNumber(upgrade_cost)) : "-"
      line(item.level.lv, item.level.ram, item.cost, can_buy, first_server.host, upgradable)
      item.owned_servers.slice(1).forEach(os => line("", "", "", "", os.host, "", true))
    }
  }
  spacer()
}

/**
 * @param {NS} ns Netscript API.
 * @return {ServerLevel[]}
 */
function get_ram_levels(ns) {
  const levels = [...Array(ServerLevel.get_max_lv(ns) + 1).keys()] // [0..max]
    .slice(1) // [1..max]
    .map(ServerLevel.by_level) // as server levels
  return levels
}

/**
 * Purchase servers for real. No more security checks. Writes a protocol to the terminal and a toast.
 * @param {NS} ns Netscript API.
 * @return {OwnedServer[]}
 */
function get_owned_servers(ns) {
  const servers = ns.getPurchasedServers().map(host => OwnedServer.build(ns, host))
  return servers
}

/**
 * Get Info about RAM-Levels and what servers already have
 * @param {NS} ns Netscript API.
 * @param {OwnedServer[]?} owned_servers Server info of already purchased servers. Optional, will be directly queried if omitted.
 */
function get_overview(ns, owned_servers = null) {
  const ram_levels = get_ram_levels(ns)
  const servers = owned_servers ?? get_owned_servers(ns)
  const overview = ram_levels.map(level => new ServerLevelOverviewItem(level, ns.getPurchasedServerCost(2 ** level.lv), servers))
  return overview
}

/**
 * Purchase servers for real. No more security checks. Writes a protocol to the terminal and a toast.
 * @param {NS} ns Netscript API.
 * @param {number} count How many servers should be purchased.
 * @param {number} ram How much RAM should each server have.
 * @param {number} start_index At what index should the naming begin.
 * @return {string[]} The hostnames of the bought servers
 */
function buy_servers(ns, count, ram, start_index) {
  const hostnames = []
  for (let i = 0; i < count; i++) {
    const name = `${HOSTNAME_PREFIX}${String(start_index + i).padStart(3, "0")}`
    //ns.tprintf("Purchase server with name %s and %s RAM", name, ns.formatRam(ram))
    const hostname = ns.purchaseServer(name, ram)
    if (hostname !== "") {
      hostnames.push(hostname)
    }
  }
  if (hostnames.length > 0) {
    ns.tprintf("%d Server mit je %s RAM gekauft", hostnames.length, ns.formatRam(ram))
    if (hostnames.length === 1) {
      ns.tprintf("Neuer Server: %s", hostnames[0])
    } else {
      ns.tprintf("Neue Server:")
      hostnames.forEach(host => ns.tprintf("  %s", host))
    }
    ns.run("scripts/botnet.js", 1, "-i", "-s") // update server list
  }
  return hostnames
}

function fill_batch(ns, batch_size, owned_servers, maxed_servers, total_server_limit, save_money, initial_server_size = 2) {
  const owned_server_count = owned_servers.length
  // buy servers if possible and neccessary
  if (owned_server_count < total_server_limit) {

    const buy_servers_count = Math.min(
      // server count of current batch that can not be filled by un-maxed servers
      Math.max(0, batch_size - (owned_server_count - maxed_servers)),
      // total available servers
      total_server_limit - owned_server_count
    )

    if (buy_servers_count > 0) {
      const player_money = ns.getPlayer().money - save_money
      const base_server_cost = ns.getPurchasedServerCost(initial_server_size)
      const max_affordable = Math.min(buy_servers_count, Math.floor(player_money / base_server_cost))
      // if buying servers, buy smallest type possible and upgrade later
      const bought_servers = buy_servers(ns, max_affordable, initial_server_size, owned_server_count)
      if (bought_servers.length > 0) {
        owned_servers.push(...bought_servers.map(host => OwnedServer.build(ns, host)))
      }
      if (bought_servers.length < buy_servers_count) {
        // we could afford enough new servers, so no further buying possible / needed
        return false
      }
    }
  }
  return true
}

/**
 * 
 * @param {NS} ns Netscript API.
 * @param {number} batch_size Upgrade as many servers together
 * @param {OwnedServer[]} owned_servers Already owned servers
 * @param {number} server_limit Maximum amount of owned servers
 * @param {number} save_money How much money should not be used for purchasing.
 */
async function max_out_server(ns, batch_size, owned_servers, server_limit, save_money, options = { verbose: false }) {
  const maxed_servers = owned_servers.filter(os => os.current_level.is_max()).length
  const current_batch_size = batch_size - (maxed_servers % batch_size)
  if (!fill_batch(ns, current_batch_size, owned_servers, maxed_servers, server_limit, save_money)) {
    // couldn't fill batch -> no more actions available
    if (options.verbose) {
      warning_t(ns, "Konnte nicht genug neue Server kaufen.")
    }
    return
  }

  await ns.sleep(10)

  // sort by level descending
  // sort by host for identical levels
  owned_servers.sort((a, b) => OwnedServer.compare(a, b, { order_by: ["lv", "host"], ascending: { lv: false, host: true } }))

  await ns.sleep(10)

  // select batch of servers to upgrade
  const batch = owned_servers.filter(os => !os.current_level.is_max()).slice(0, current_batch_size)
  const usable_money = ns.getPlayer().money - save_money // money available
  if (usable_money <= 0) {
    // no money => nothing to do
    if (options.verbose) {
      warning_t(ns, "Nicht genug Geld.")
    }
    return
  }
  /**
   * How much would it cost to upgrade each server in the batch to the given level.
   * @param {ServerLevel} level Level to calculate the cost for.
   * @return {number} The cost to upgrade each server in the batch to this level.
   */
  function calculate_cost(level) {
    const sum = batch.map(os => os.get_cost(ns, level)).reduce((sum, cost) => sum + cost, 0)
    return sum
  }
  /**
   * Can the player afford the upgrade cost for this level?
   * @param {ServerLevel} level Level to determine if the player can afford to upgrade to this level.
   * @return {boolean} False if the cost is greater than the money left for purchasing servers.
   */
  function can_afford(level) {
    return calculate_cost(level) <= usable_money
  }
  // increase base level while player can afford it
  // as long as the base level is below the minimum level of the servers,
  // the cost would be 0 - very affordable as long as the player has any money left
  let target_level = ServerLevel.BASE_LEVEL() // start with base level as min level from batch
  let next_level = target_level.next_level()
  while (can_afford(next_level)) {
    await ns.sleep(10)
    target_level = next_level
    if (target_level.is_max())
      break
    next_level = target_level.next_level()
  }

  await ns.sleep(10)

  const current_min_level = batch.map(os => os.current_level).reduce((min, lv) => min.greater_than(lv) ? lv : min, target_level)

  await ns.sleep(10)

  if (current_min_level >= target_level) {
    // no upgrade affordable
    if (options.verbose) {
      warning_t(
        ns,
        "Nicht genug Geld: Für %d Server werden $%s benötigt, aber nur %s sind verfügbar.",
        current_batch_size,
        ns.formatNumber(calculate_cost(current_min_level + 1)),
        ns.formatNumber(usable_money)
      )
    }
    return
  }

  // now finally actually upgrade them
  const successes = batch.map(os => os.upgrade(ns, target_level)).filter(res => res).length
  if (successes === batch.length) {
    ns.tprintf("%sPSERV: %d Server auf Level %d (%s RAM)", COLOR.green, successes, target_level.lv, target_level.ram)
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
    const line = "%-20s - %s"
    ns.tprintf("Programm zum Cluster-Management der privater Server, kurz %s.", HOSTNAME_PREFIX)
    ns.tprintf("Ohne Parameter werden die aktuell vorhandenen Server aufgelistet, sowie die ggf. verfügbaren RAM-Optionen für neue Server.")
    ns.tprintf(" ")
    ns.tprintf("Allgemein:")
    ns.tprintf(line, "-?/--help", "Zeigt diese Hilfe an und beendet das Skript.")
    ns.tprintf(line, "-l", "Listet alle bereits gekauften Server auf.")
    ns.tprintf(" ")
    ns.tprintf("Kauf:")
    ns.tprintf(line, "-s/--save M", "Behält beim Kauf eine Rücklage i.H.v. $M ein.")
    ns.tprintf(line, "-m", "Kauft/verbessert die Server bis zum Maximum. Dabei werden vorhandene Server")
    ns.tprintf(line, "", "  erst komplett aufgerüstet, bevor ein neuer gekauft wird.")
    ns.tprintf(line, "--max ANZ", "wie -m, aber es wird dafür gesorgt, dass ANZ Server möglichst")
    ns.tprintf(line, "", "  gleichmäßig ausgerüstet sind.")
    ns.tprintf(line, "-a/--auto", `Analog zu einem Aufruf von \`${ns.getScriptName()} -m\` alle ${formatTime(AUTOMATIC_BUY_INTERVAL)}`)
    ns.tprintf(line, "-b/--buy LV", "Kauft einen neuen Server mit Level LV")
    ns.exit()
  }

  const OPTS = ns.flags([
    ['?', false], ['help', false], // help
    ['l', false], ['list', false], // show list of servers
    ['s', 0], ['save', 0], // save amount of money
    ['m', false], ['max', 0], // max out an amount of servers
    ['a', false], ['auto', false], // max out on servers
    ['b', 0], ['buy', 0], // buy a specific level of server
  ])
  OPTS.save = Math.max(OPTS.s, OPTS.save)
  OPTS.buy = Math.max(OPTS.b, OPTS.buy)
  OPTS.max = Math.max(OPTS.m ? 1 : 0, OPTS.max)
  OPTS.auto = OPTS.auto || OPTS.a
  OPTS.list = OPTS.list || OPTS.l
  OPTS.help = OPTS.help || OPTS["?"]

  if (OPTS.help) {
    printHelpAndExit()
  }

  const SERVER_LIMIT = ns.getPurchasedServerLimit()
  const owned_servers = get_owned_servers(ns)
  let done_sth = false

  if (OPTS.buy > 0) {
    done_sth = true
    const [new_host] = buy_servers(ns, 1, ServerLevel.by_level(OPTS.buy).ram, owned_servers.length)
    owned_servers.push(OwnedServer.build(ns, new_host))
  }
  if (OPTS.max > 0) {
    done_sth = true
    await max_out_server(ns, OPTS.max, owned_servers, SERVER_LIMIT, OPTS.save)
  }
  if (OPTS.list) {
    done_sth = true
    const available_servers = SERVER_LIMIT - owned_servers.length
    const overview_items = get_overview(ns, owned_servers)
    print_overview(ns, available_servers, overview_items, OPTS.save)
  }
  if (!done_sth) {
    // if nothing else should be done
    printHelpAndExit()
  }
}