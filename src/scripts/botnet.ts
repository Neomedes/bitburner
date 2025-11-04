import { ScriptArg } from "@ns"
import { exec_script, is_empty_str } from "lib/functions"
import { get_keep_ram, read_keep_ram_file } from "lib/keep_ram"
import { error_t, info_t, success_t, warning_t } from "lib/log"
import { MyServer } from "lib/servers"
import { get_updated_server_list } from "util/update_data"
import { OutputTable, OutputTableColumnType } from "/lib/tables"

/**
 * Retrieves all servers with a matching hostname.
 * @param {string} search_term Search term to match hosts.
 * @param {MyServer[]} all_servers All servers available.
 * @return {MyServer[]} All matching servers found.
 */
function get_matching_servers(search_term: string, all_servers: MyServer[]): MyServer[] {
  const search_term_lc = search_term.toLowerCase()
  let s = all_servers.find(s => s.host.toLowerCase() === search_term_lc)
  if (s) {
    return [s]
  }
  return all_servers.filter(s => s.host.toLowerCase().match(search_term_lc.toLowerCase()))
}

/**
 * Prints a connect call
 * @param {NS} ns
 * @param {MyServer} server Search term to match hosts.
 * @param {boolean} verbose Verbose output: Prints additional infos about the server.
 */
function print_single_server(ns: NS, server: MyServer, verbose: boolean) {
  if (verbose) {
    success_t(ns, "Host gefunden: %s", server.host) // simple connect using this script
    ns.tprintf("%-10s: %s", "Root", server.nuked === true ? "Ja" : "Nein")
    ns.tprintf("%-10s: %s", "Backdoor", server.backdoor === true ? "Ja" : "Nein")
    if (server.max_ram !== undefined && server.max_ram > 0)
      ns.tprintf("%-10s: %s", "RAM", ns.formatRam(server.ram_used ?? 0) + " of " + ns.formatRam(server.max_ram ?? 0))
    if (server.max_money !== undefined && server.max_money > 0)
      ns.tprintf("%-10s: %s", "Geld", ns.formatNumber(server.current_money ?? 0) + " of " + ns.formatNumber(server.max_money ?? 0))
    ns.tprintf("%-10s: %s", "Sicherheit", ns.formatNumber(server.current_security ?? 0, 1, 1000000) + `; Min: ${server.min_security ?? 0}`)
    ns.tprintf("%-10s: %d", "Hack", server.hack_needed)
    ns.tprintf("%-10s: %d", "CPUs", server.cores)

    ns.tprintf(" ")
    ns.tprintf("Pfad:")
  }
  ns.tprintf(server.path.join(" > "))
}

/**
 * @param {NS} ns
 * @param {string} search_term Search term to match hosts.
 * @param {MyServer[]} servers All servers available.
 * @param {boolean} silent No output when no servers are found.
 */
function find_server(ns: NS, search_term: string, servers: MyServer[], silent: boolean) {
  const matching_servers = get_matching_servers(search_term, servers)
  if (matching_servers.length > 1) {
    if (!silent) {
      ns.tprintf("%d Server gefunden:", matching_servers.length)
    }
    matching_servers.forEach(s => ns.tprintf("  - %s", s.host))
  } else if (matching_servers.length > 0) {
    // we just found one server that matched the search term
    print_single_server(ns, matching_servers[0], !silent)
  } else if (!silent) {
    warning_t(ns, "Es wurde kein Server gefunden")
  }
}

/**
 * @param {NS} ns
 * @param {string} search_term Search term to match hosts.
 * @param {MyServer[]} servers All servers available.
 * @param {boolean} silent No output when no servers are found.
 */
function connect_server(ns: NS, search_term: string, servers: MyServer[], silent: boolean) {
  const matching_servers = get_matching_servers(search_term, servers)
  if (matching_servers.length === 1) {
    ns.exec("util/sing_connect.js", "home", 1, matching_servers[0].host)
  } else if (!silent) {
    if (matching_servers.length > 1) {
      warning_t(ns, "Der Hostname '%s' konnte nicht eindeutig einem Server zugeordnet werden. (%d Treffer)", search_term, matching_servers.length)
    } else {
      warning_t(ns, "Der Hostname '%s' konnte keinem Server zugeordnet werden.", search_term)
    }
  }
}

/**
 * @param {NS} ns
 * @param {string[]} search_term Search term to match hosts.
 * @param {MyServer[]} servers All servers available.
 * @param {boolean} silent No output when no servers are found.
 * @param open_all Open backdoors on all matching hosts
 */
async function open_backdoor(ns: NS, search_term: string, servers: MyServer[], silent: boolean, open_all: boolean) {
  const matching_servers = get_matching_servers(search_term, servers)
  if (matching_servers.length === 1) {
    const params = [matching_servers[0].host]
    if (silent) params.push('--silent')
    await exec_script(ns, "util/sing_backdoor.js", "home", 1, ...params)
  } else if (matching_servers.length > 1 && open_all) {
    const params = silent ? ['--silent'] : []
    for (const server of matching_servers) {
      await exec_script(ns, "util/sing_backdoor.js", "home", 1, ...[server.host, ...params])
    }
  } else if (!silent) {
    if (matching_servers.length > 1) {
      warning_t(ns, "Der Hostname '%s' konnte nicht eindeutig einem Server zugeordnet werden. %d Treffer:", search_term, matching_servers.length)
      matching_servers.forEach(s => ns.tprintf("%20s", s.host))
    } else {
      warning_t(ns, "Der Hostname '%s' konnte keinem Server zugeordnet werden.", search_term)
    }
  }
}

/**
 * @param {NS} ns
 * @param {string[]} search_term Search term to match hosts.
 * @param {MyServer[]} servers All servers available.
 * @param {boolean} silent No output when no servers are found.
 * @param open_all Open backdoors on all matching hosts
 */
async function open_backdoors(ns: NS, search_terms: string[], servers: MyServer[], silent: boolean, open_all: boolean) {
  const use_standard_hosts = search_terms.length <= 0
  const host_terms = use_standard_hosts ? ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"] : search_terms
  if (use_standard_hosts && !silent) {
    info_t(ns, "Öffne Backdoors auf Standard-Faction-Servern: %s", host_terms.join())
  }
  for (let search_term of host_terms) {
    await open_backdoor(ns, search_term, servers, silent, open_all)
  }
}

/**
 * @param {NS} ns
 * @param {MyServer} server Server to display.
 * @param {MyServer[]} all_servers All servers available.
 * @param {string[]} paddings Padding for subsequent lines
 */
function print_server_tree(ns: NS, server: MyServer, all_servers: MyServer[], paddings: string[] = []) {
  if (paddings.length > 0) {
    ns.tprintf(" %s+ %s", paddings.slice(0, -1).join(""), server.host)
  } else {
    ns.tprintf(" %s", server.host)
  }
  // recursive call for all direct children
  let children = all_servers.filter(s => s.parent === server.host)
  children.sort((a, b) => a.host > b.host ? 1 : -1)
  children.forEach((s, i) => {
    const next_pads = [...paddings, i === children.length - 1 ? "  " : "| "]
    print_server_tree(ns, s, all_servers, next_pads)
  })
}

/**
 * @param {NS} ns
 * @param {MyServer[]} servers All servers available.
 * @param {boolean} show_all Show all servers.
 * @param {string[]} specific_hosts Show only specific hosts.
 */
function print_server_stats(ns: NS, servers: MyServer[], show_all: boolean, specific_hosts: string[]) {
  const ot = new OutputTable(ns,
    [
      { title: "Name", property: "host", width: 20, type: OutputTableColumnType.String },
      { title: "Hack", property: "hack_needed", width: 5, type: OutputTableColumnType.Integer },
      { title: "max $", property: "max_money", width: 10, type: OutputTableColumnType.Currency },
      { title: "min Sec", property: "min_security", width: 10, type: OutputTableColumnType.Integer },
      { title: "RAM", property: "max_ram", width: 10, type: OutputTableColumnType.Ram },
      { title: "Offen", property: "nuked", width: 10, type: OutputTableColumnType.Boolean },
      { title: "Backdoor", property: "backdoor", width: 10, type: OutputTableColumnType.Boolean },
      { title: "Score", property: "score", width: 10, type: OutputTableColumnType.Percentage },
    ],
    { outer_lines: true },
  )

  const player_hack_level = ns.getHackingLevel()

  function compute_score(s: MyServer): number {
    return (player_hack_level < ((s.hack_needed ?? Infinity) * 2)) ? -1 : ((s.max_money ?? 0) / (s.min_security ?? Infinity))
  }

  const output_servers = (() => {
    if (show_all)
      return servers.filter(s => s.host !== "home")
    if ((specific_hosts?.length ?? 0) > 0)
      return specific_hosts.flatMap(h => get_matching_servers(h, servers))
    return servers.filter(s => s.host !== "home" && s.nuked! && (s.max_money ?? 0) > 0 && s.hack_needed! <= player_hack_level)
  })().map(s => {
    return {
      ...s,
      score: compute_score(s),
    }
  })

  const max_score = output_servers.reduce((max, s) => max < s.score ? s.score : max, -1)
  if (show_all || (specific_hosts?.length ?? 0) > 0) {
    output_servers.sort((a, b) => {
      return a.host.localeCompare(b.host) // name asc
    })
  } else {
    output_servers.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score // score desc
      if (b.hack_needed !== a.hack_needed) return a.hack_needed! - b.hack_needed! // hack needed asc
      return a.host.localeCompare(b.host) // name asc
    })
  }

  for (let i = 0; i < output_servers.length; i++) {
    let s = output_servers[i]
    ot.line({ ...s, score: s.score <= 0 ? 0 : s.score / max_score })
  }

  ot.flush()
}

/**
 * @param {NS} ns
 * @param {MyServer[]} servers
 * @param {string} script
 * @param {string[]} hosts
 * @param {ScriptArg[]} scripts_args
 * @param {boolean} silent
 */
function run_script_on_servers(ns: NS, servers: MyServer[], script: string, hosts: string[], scripts_args: ScriptArg[], silent: boolean) {
  const keep_ram_entries = read_keep_ram_file(ns)

  const base_server_list = hosts?.length > 0 ? hosts.flatMap(h => get_matching_servers(h, servers)) : servers
  if (base_server_list.length < 1) {
    error_t(ns, "Es wurden keine Hosts angegeben, auf denen das Skript ausgeführt werden kann.")
  }

  const available_servers = base_server_list
    .filter(s => s.nuked)
    .map(s => {
      const ram_buffer = get_keep_ram(keep_ram_entries, s.host)
      ns.scp(script, s.host)
      const ram_per_thread = ns.getScriptRam(script, s.host)
      const max_threads = ram_per_thread > 0 ? Math.max(Math.floor((s.max_ram! - s.ram_used! - ram_buffer) / ram_per_thread), 0) : 0
      return { host: s.host, max_threads }
    })
    .filter(s => s.max_threads > 0)
  if (available_servers.length < 1) {
    if (!silent) {
      warning_t(ns, "Es wurden von den %s Servern keine gefunden, auf denen das Skript ausgeführt werden kann.", base_server_list.length)
    }
  } else {
    if (!silent) {
      info_t(ns, "Führe das Skript auf %d Servern aus", available_servers.length)
    }
    available_servers.forEach(next_server => {
      ns.exec(script, next_server.host, next_server.max_threads, ...scripts_args)
    })
  }
}

/**
 * @param {NS} ns
 * @param {MyServer[]} servers
 * @param {string[]} include_hosts
 * @param {string[]} exclude_hosts
 * @param {boolean} silent
 */
function clear_scripts(ns: NS, servers: MyServer[], include_hosts: string[], exclude_hosts: string[], silent: boolean) {
  const target_servers = (() => {
    if (include_hosts?.length ?? 0 > 0)
      return include_hosts.flatMap(h => get_matching_servers(h, servers))
    const exclude_servers = exclude_hosts.flatMap(h => get_matching_servers(h, servers))
    return servers.filter(s => s.host !== "home" && !exclude_servers.includes(s))
  })()

  if (!silent) info_t(ns, "Beende Skripte auf %d Servern.", target_servers.length)

  target_servers.forEach(s => {
    ns.killall(s.host, true)
  })
}

/** @param {NS} ns */
export async function main(ns: NS) {
  const OPTS = ns.flags([
    ['all', false], // print all stats
    ['h', []], // specific hosts (INLCUDE)
    ['n', []], // specific hosts (EXCLUDE)
    ['reload', false], // just update the server cache
    ['tree', false], // print tree
    ['find', ""], ['f', ""], // find a server by host name
    ['connect', ""], ['c', ""], // connect to host
    ['backdoor', false], // install standard backdoors
    ['run', ""], ['r', ""], // run script on botnet
    ['clear', false], // clears all scripts running on other servers
    ['silent', false], // silent
    ['?', false], ['help', false], // flag to display help
  ])

  OPTS.help = OPTS.help || OPTS["?"]

  OPTS.find = OPTS.find !== "" ? OPTS.find : OPTS.f
  OPTS.connect = OPTS.connect !== "" ? OPTS.connect : OPTS.c
  OPTS.run = OPTS.run !== "" ? OPTS.run : OPTS.r

  /** @return {never} */
  function print_help_and_exit() {
    ns.tprintf("Infos über und Arbeiten mit dem Botnet.")
    ns.tprintf("Das Skript lädt zu Beginn des Skripts die Serverliste neu.")
    ns.tprintf(" ")
    ns.tprintf("Aufruf zur Ausgabe der Statistiken als Tabelle:")
    ns.tprintf("%s [OPTIONS] [--all|-h HOST [-h HOST2...]] [--silent]", ns.getScriptName())
    ns.tprintf(" ")
    ns.tprintf("%-24s - %s", "--all", "Statistiken in Tabellenform zu ALLEN bekannten Servern ausgeben.")
    ns.tprintf("%-24s - %s", "-h HOST [-h HOST2...]", "Statistiken in Tabellenform zu den angegebenen Hosts ausgeben.")
    ns.tprintf(" ")
    ns.tprintf("Alternativ können andere Ausgaben erzeugt oder Aufgaben durchgeführt werden:")
    ns.tprintf("%s [OPTIONS] [--silent]", ns.getScriptName())
    ns.tprintf(" ")
    ns.tprintf("OPTIONS sind dabei die folgenden")
    ns.tprintf("%-24s - %s", "--reload", "Serverliste nur neu laden und keine Statistiken ausgeben")
    ns.tprintf("%-24s - %s", "--tree", "Server-Baum ausgeben")
    ns.tprintf("%-24s - %s", "[--find|-f] HOST", "Infos ausgeben für einen bestimmte Node.")
    ns.tprintf("%-24s - %s", "[--connect|-c] HOST", "Mit genanntem Server verbinden.")
    ns.tprintf(" ")
    ns.tprintf("%-24s", "--backdoor [-h HOST [-h HOST2...]] [--all]")
    ns.tprintf("%-24s   %s", " ", "Installiert backdoors. Mittels -h können Hosts angegeben werden, auf denen es versucht werden soll.")
    ns.tprintf("%-24s   %s", " ", "Sind keine Hosts angegeben, werden die Standard-Faction-Servern genutzt.")
    ns.tprintf("%-24s   %s", " ", "Mittels --all kann, wenn eine Host-Bezeichnung uneindeutig ist, auf allen eine Backdoor installiert werden.")
    ns.tprintf(" ")
    ns.tprintf("%-24s", "--clear [-h HOST [-h HOST2 [...]]] [-n HOST [-n HOST2 [...]]]")
    ns.tprintf("%-24s   %s", " ", "Entfernt alle Skripte, die aktuell auf den Hosts laufen.")
    ns.tprintf("%-24s   %s", " ", "Mit -h können konkrete Hosts angegeben werden, die geleert werden sollen.")
    ns.tprintf("%-24s   %s", " ", "Mit -n können konkrete Hosts ausgeschlossen werden, alle anderen werden geleert.")
    ns.tprintf("%-24s   %s", " ", "Home kann nur geleert werden, wenn dieser explizit mittels -h angegeben wird.")
    ns.tprintf(" ")
    ns.tprintf("%-24s", "[--run|-r] SCRIPT [-h HOST [-h HOST2...]] [ARGS...]")
    ns.tprintf("%-24s   %s", " ", "Skript ausführen. Weitere Parameter können angegeben werden, aber Optionen müssen in Anführungszeichen")
    ns.tprintf("%-24s   %s", " ", "gesetzt werden. Mittels -h können konkrete Hosts angegeben werden. Ist kein Host angegeben, wird es auf")
    ns.tprintf("%-24s   %s", " ", "allen offenen Servern ausgeführt.")
    ns.tprintf(" ")
    ns.tprintf("Ausgabe steuern:")
    ns.tprintf("%-24s - %s", "--silent", "Rein informative Ausgaben unterdrücken")
    ns.tprintf("%-24s - %s", "--help|-?", "Nur diese Hilfe ausgeben und Skript beenden.")
    ns.exit()
  }

  if (OPTS.help) {
    print_help_and_exit()
  }

  let servers = await get_updated_server_list(ns)
  if (OPTS.reload === true) {
    // do nothing, the servers were already initialized...
    if (!OPTS.silent) info_t(ns, "Serverliste neu geladen.")
  } else if (OPTS.tree === true) {
    print_server_tree(ns, servers[0], servers)
  } else if (!is_empty_str(OPTS.find as string)) {
    find_server(ns, OPTS.find as string, servers, OPTS.silent === true)
  } else if (!is_empty_str(OPTS.connect as string)) {
    connect_server(ns, OPTS.connect as string, servers, OPTS.silent === true)
  } else if (OPTS.backdoor === true) {
    await open_backdoors(ns, OPTS.h as string[], servers, OPTS.silent === true, OPTS.all === true)
  } else if (!is_empty_str(OPTS.run as string)) {
    run_script_on_servers(ns, servers, OPTS.run as string, OPTS.h as string[], OPTS["_"] as string[], OPTS.silent === true)
  } else if (OPTS.clear === true) {
    clear_scripts(ns, servers, OPTS.h as string[], OPTS.n as string[], OPTS.silent === true)
  } else {
    print_server_stats(ns, servers, OPTS.all === true, OPTS.h as string[])
  }

}