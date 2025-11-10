import { formatTime, is_empty_str } from "lib/functions"
import { error_t, success_t, warning_t } from "lib/log"
import { MyPurchasedServer, RamLevel } from "/lib/pserv"
import { OutputTable, OutputTableColumnType } from "/lib/tables"
import { get_updated_player, get_updated_pserv_list, update_server_list } from "/util/update_data"

const AUTOMATIC_BUY_INTERVAL = 60000 // every minute
const HOSTNAME_PREFIX = "psrv"

class RamLevelOverviewItem {
  lv: number
  ram: number
  cost: number
  upgrade_cost: number
  can_buy: number
  host: string
  additional_hosts: string[]
  upgradable: string

  constructor(level: RamLevel) {
    this.lv = level.lv
    this.ram = level.ram
    this.cost = level.cost
    this.upgrade_cost = level.is_max() ? -1 : level.next_level().cost - level.cost
    this.can_buy = 0
    this.host = ""
    this.additional_hosts = []
    this.upgradable = ""
  }

  fill_hosts(p_servers: MyPurchasedServer[]): RamLevelOverviewItem {
    const pserv_at_level = p_servers.filter(os => os.current_level.lv === this.lv)
    if (pserv_at_level.length > 0) {
      this.host = pserv_at_level[0].host
      this.additional_hosts = pserv_at_level.slice(1).map(s => s.host)
    }
    return this
  }

  determine_can_buy(money: number, max_left_for_purchase: number): RamLevelOverviewItem {
    this.can_buy = Math.min(max_left_for_purchase, Math.floor(money / this.cost))
    return this
  }

  determine_upgradable(ns: NS, money: number): RamLevelOverviewItem {
    if (!is_empty_str(this.host)) {
      let money_left = money - this.upgrade_cost
      this.upgradable = this.upgrade_cost > -1 ? (money >= this.upgrade_cost ? "Ja" : ns.formatNumber(this.upgrade_cost)) : "-"

    }
    return this
  }
}

/**
 * Lists RAM options if additional servers can be bought
 * @param ns Netscript API.
 * @param available_servers How many servers may still be bought.
 * @param p_servers The purchased servers already owned.
 * @param save_money How much money should not be used for purchasing.
 */
async function print_overview(ns: NS, available_servers: number, p_servers: MyPurchasedServer[], save_money: number) {

  if (available_servers > 0) {
    ns.tprintf("%d Server können noch gekauft werden.", available_servers)
  } else {
    ns.tprintf("Es können keine Server mehr gekauft werden.")
  }

  const ot = new OutputTable<RamLevelOverviewItem>(ns,
    [
      { title: "Lv", property: "lv", width: 3, type: OutputTableColumnType.Integer },
      { title: "RAM", property: "ram", width: 10, type: OutputTableColumnType.Ram },
      { title: "Preis", property: "cost", width: 10, type: OutputTableColumnType.Currency },
      { title: "Verfügbar", property: "can_buy", width: 10, type: OutputTableColumnType.Integer },
      { title: "In Besitz", property: "host", width: 16, type: OutputTableColumnType.String },
      { title: "Upgrade?", property: "upgradable", width: 10, type: OutputTableColumnType.String },
    ]
  )

  const usable_money = (await get_updated_player(ns)).money - save_money
  const overview_items = RamLevel.ALL
    .toSorted((a, b) => a.lv - b.lv)
    .map(level => new RamLevelOverviewItem(level)
      .fill_hosts(p_servers)
      .determine_can_buy(usable_money, available_servers)
      .determine_upgradable(ns, usable_money)
    )

  for (let idx in overview_items) {
    const item = overview_items[idx]
    ot.line(item)

    item.additional_hosts.forEach(host => {
      ot.line({ host: host }, false)
    })
  }

  ot.flush()
}

/**
 * Purchase servers for real. No more security checks. Writes a protocol to the terminal and a toast.
 * @param ns Netscript API.
 * @param count How many servers should be purchased.
 * @param ram How much RAM should each server have.
 * @param start_index At what index should the naming begin.
 * @return The hostnames of the bought servers
 */
async function buy_servers(ns: NS, count: number, ram: number, start_index: number): Promise<string[]> {
  const hostnames: string[] = []
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
    await update_server_list(ns)
  }
  return hostnames
}

async function fill_batch(ns: NS, batch_size: number, owned_servers: MyPurchasedServer[], maxed_servers: number, total_server_limit: number, save_money: number, initial_server_size: number = 2): Promise<boolean> {
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
      const bought_servers = await buy_servers(ns, max_affordable, initial_server_size, owned_server_count)
      if (bought_servers.length > 0) {
        owned_servers.push(...bought_servers.map(host => MyPurchasedServer.register(ns, host)))
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
 * @param {MyPurchasedServer[]} owned_servers Already owned servers
 * @param {number} server_limit Maximum amount of owned servers
 * @param {number} save_money How much money should not be used for purchasing.
 */
async function max_out_server(ns: NS, batch_size: number, owned_servers: MyPurchasedServer[], server_limit: number, save_money: number, options = { verbose: false }): Promise<void> {
  const maxed_servers = owned_servers.filter(os => os.current_level.is_max()).length
  const current_batch_size = batch_size - (maxed_servers % batch_size)
  if (!(await fill_batch(ns, current_batch_size, owned_servers, maxed_servers, server_limit, save_money))) {
    // couldn't fill batch -> no more actions available
    if (options.verbose) {
      warning_t(ns, "Konnte nicht genug neue Server kaufen.")
    }
    return
  }

  await ns.sleep(10)

  // sort by level descending
  // sort by host for identical levels
  owned_servers.sort((a, b) => MyPurchasedServer.compare(a, b, { order_by: ["lv", "host"], ascending: { lv: false, host: true } }))

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
   * @param {RamLevel} level Level to calculate the cost for.
   * @return {number} The cost to upgrade each server in the batch to this level.
   */
  function calculate_cost(level: RamLevel): number {
    const sum = batch.map(os => os.get_cost(level)).reduce((sum, cost) => sum + cost, 0)
    return sum
  }
  /**
   * Can the player afford the upgrade cost for this level?
   * @param {RamLevel} level Level to determine if the player can afford to upgrade to this level.
   * @return {boolean} False if the cost is greater than the money left for purchasing servers.
   */
  function can_afford(level: RamLevel): boolean {
    return calculate_cost(level) <= usable_money
  }
  // increase base level while player can afford it
  // as long as the base level is below the minimum level of the servers,
  // the cost would be 0 - very affordable as long as the player has any money left
  let target_level = RamLevel.BASE_LEVEL() // start with base level as min level from batch
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

  if (current_min_level.greater_than(target_level)) {
    // no upgrade affordable
    if (options.verbose) {
      warning_t(
        ns,
        "Nicht genug Geld: Für ein Upgrade von %d Servern werden $%s benötigt.",
        current_batch_size,
        ns.formatNumber(calculate_cost(current_min_level.next_level())),
      )
    }
    return
  }

  // now finally actually upgrade them
  const successes = batch.map(os => os.upgrade(ns, target_level)).filter(res => res).length
  if (successes === batch.length) {
    success_t(ns, "%d Server auf Level %d (%s RAM)", successes, target_level.lv, target_level.ram)
  }
}

async function upgrade_server(ns: NS, save_money: number): Promise<boolean> {
  const ot = new OutputTable(ns, [
    { property: "no", title: "Nr", type: OutputTableColumnType.Integer },
    { property: "name", title: "Name", type: OutputTableColumnType.String },
    { property: "level", title: "Level", type: OutputTableColumnType.Integer },
    { property: "ram", title: "RAM", type: OutputTableColumnType.Ram },
  ])
  const servers = (await get_updated_pserv_list(ns)).filter(s => !s.current_level.is_max())
  if (servers.length < 1) {
    error_t(ns, "Es gibt keine Server, die ein Upgrade erfahren könnten. Kaufe erst einen neuen")
  }
  servers.sort((a, b) => a.host.localeCompare(b.host))
  servers.forEach((s, i) => ot.line({ no: i + 1, name: s.host, level: s.current_level.lv, ram: s.current_level.ram }))

  const choices = servers.map((s, i) => `${i + 1} - ${s.host} @${s.current_level.is_max() ? "MAX LV" : `LV ${s.current_level.lv}`}`)
  choices.unshift("Abbrechen...")
  const server_selection = (await ns.prompt("Welcher Server soll ein Upgrade erfahren?", { type: "select", choices: choices })) as string

  if (server_selection == null || server_selection.indexOf(" - ") < 0) return false

  const idx = parseInt(server_selection.substring(0, server_selection.indexOf(" - "))) - 1
  const srv = servers[idx]
  let level = srv.current_level
  if (level.is_max()) {
    ns.alert(ns.sprintf("Server %s ist bereits auf maximalem Level. Suche bitte einen anderen Server aus.", srv.host))
    warning_t(ns, "Server %s ist bereits auf maximalem Level. Suche bitte einen anderen Server aus.", srv.host)
    return true
  }

  const levels: RamLevel[] = []
  while (!level.is_max()) {
    level = level.next_level()
    levels.push(level)
  }
  const level_selection = (await ns.prompt("Auf welches Level soll ?", { type: "select", choices: choices })) as string


  return true
}

async function upgrade_servers(ns: NS, save_money: number): Promise<void> {
  let again = true
  while (again) {
    again = await upgrade_server(ns, save_money)
  }
}

export async function main(ns: NS) {
  /**
   * Prints the help and exits the script.
   * @return {never}
   */
  function print_help_and_exit() {
    const line = "%-20s - %s"
    ns.tprintf("Programm zum Cluster-Management der privater Server, kurz %s.", HOSTNAME_PREFIX)
    ns.tprintf("Ohne Parameter werden die aktuell vorhandenen Server aufgelistet, sowie die ggf. verfügbaren RAM-Optionen für neue Server.")
    ns.tprintf(" ")
    ns.tprintf("Allgemein:")
    ns.tprintf(line, "-?/--help", "Zeigt diese Hilfe an und beendet das Skript.")
    ns.tprintf(line, "-l/--list", "Listet alle bereits gekauften Server auf.")
    ns.tprintf(" ")
    ns.tprintf("Kauf:")
    ns.tprintf(line, "--save M", "Behält beim Kauf eine Rücklage i.H.v. $M ein.")
    ns.tprintf(line, "-m", "Kauft/verbessert einen Server bis zum Maximum. Dabei werden vorhandene Server")
    ns.tprintf(line, "", "  erst komplett aufgerüstet, bevor ein neuer gekauft wird.")
    ns.tprintf(line, "--max ANZ", "wie -m, aber es wird dafür gesorgt, dass ANZ Server möglichst")
    ns.tprintf(line, "", "  gleichmäßig ausgerüstet sind.")
    ns.tprintf(line, "-b/--buy LV", "Kauft einen neuen Server mit Level LV")
    ns.exit()
  }

  const OPTS = ns.flags([
    ['?', false], ['help', false], // help
    ['l', false], ['list', false], // show list of servers
    ['save', 0], // save amount of money
    ['m', false], ['max', 0], // max out an amount of servers
    ['b', 0], ['buy', 0], // buy a specific level of server
    ['u', false], ['upgrade', false], // upgrade servers
  ])
  OPTS.buy = Math.max(OPTS.b as number, OPTS.buy as number)
  OPTS.max = Math.max(OPTS.m === true ? 1 : 0, OPTS.max as number)
  OPTS.upgrade = OPTS.upgrade === true || OPTS.u === true
  OPTS.list = OPTS.list === true || OPTS.l === true
  OPTS.help = OPTS.help === true || OPTS["?"] === true

  if (OPTS.help) {
    print_help_and_exit()
  }

  const SERVER_LIMIT = ns.getPurchasedServerLimit()
  const owned_servers = await get_updated_pserv_list(ns)
  let done_sth = false

  if (OPTS.buy > 0) {
    done_sth = true
    const [new_host] = await buy_servers(ns, 1, RamLevel.by_level(OPTS.buy).ram, owned_servers.length)
    owned_servers.push(MyPurchasedServer.register(ns, new_host))
  }
  if (OPTS.max > 0) {
    done_sth = true
    await max_out_server(ns, OPTS.max, owned_servers, SERVER_LIMIT, OPTS.save as number)
  }
  if (OPTS.upgrade) {
    done_sth = true
    await upgrade_servers(ns, OPTS.save as number)
  }
  if (!done_sth || OPTS.list) {
    const available_servers = SERVER_LIMIT - owned_servers.length
    await print_overview(ns, available_servers, owned_servers, OPTS.save as number)
  }
}