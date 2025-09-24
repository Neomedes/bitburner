import { MyServer, write_server_file } from "lib/servers.js"
import { get_updated_server_list } from "util/update_data.js"
import { error_t, warning_t, success_t, exec_script } from "lib/functions.js"

/**
 * Connects to a server
 * @param {NS} ns 
 * @param {MyServer} target_server 
 * @param {boolean} silent 
 */
async function connect_to(ns, target_server, silent) {
  for (let p of target_server.path) {
    if (ns.singularity.connect(p)) {
    } else {
      if (!silent) warning_t(ns, "%s - %s: Verbindung zu %s fehlgeschlagen", p)
      ns.singularity.connect("home")
      return false
    }
    await ns.sleep(0)
  }
  return true
}

/**
 * @param {NS} ns
 * @param {MyServer} target_server
 * @return {Promise<boolean>} Returns if a backdoor was (just now) installed.
 */
async function install_backdoor(ns, target_server, silent) {
  // check if player has enough hacking skill
  if (target_server.hack_needed > ns.getHackingLevel()) {
    if (!silent) warning_t(ns, "%s - %s: Hacking-Level zu niedrig, Level %d wird benötigt.", ns.getScriptName(), target_server.host, target_server.hack_needed)
    return false
  }
  // Check if we have root access
  if (!target_server.nuked) {
    if (!silent) warning_t(ns, "%s - %s: Kein Root-Zugang zum System.", ns.getScriptName(), target_server.host)
    return false
  }
  // Check if backdoor is already installed
  if (target_server.backdoor) {
    if (!silent) success_t(ns, "%s - %s: Backdoor ist bereits installiert.", ns.getScriptName(), target_server.host)
    return false
  }
  // connect to server
  if (!await connect_to(ns, target_server, silent)) {
    return false
  }
  // install backdoor
  if (!silent) ns.tprintf("Installiere backdoor")
  await ns.singularity.installBackdoor()
  target_server.backdoor = true
  return true
}

/** @param {NS} ns */
export async function main(ns) {
  const OPTS = ns.flags([
    ['silent', false], // silent
    ['?', false], ['help', false], // flag to display help
  ])
  const target_hosts = OPTS["_"]
  OPTS.help = OPTS.help || OPTS['?']

  /** @return {never} */
  function print_help_and_exit() {
    ns.tprintf("Connected zum angegeben Server.")
    ns.tprintf("Aufruf:")
    ns.tprintf("%s [--silent] ZIEL", ns.getScriptName())
    ns.tprintf("%-16s - %s", "--silent", "Rein informative Ausgaben unterdrücken")
    ns.tprintf("%-16s - %s", "--help|-?", "Nur diese Hilfe ausgeben und Skript beenden.")
    ns.exit()
  }

  if (OPTS.help) {
    print_help_and_exit()
  }

  if (target_hosts.filter(h => h && h !== "").length < 1) {
    error_t(ns, "%s: Fehlerhafter Aufruf: Kein Ziel-Server angegeben!", ns.getScriptName())
    if (!OPTS.silent) {
      print_help_and_exit()
    }
    ns.exit()
  }

  const initial_host = ns.getHostname()
  const servers = await get_updated_server_list(ns)

  let something_installed = false
  for (let target_host of target_hosts) {
    const target_server = servers.find(s => s.host === target_host)
    // is this called with a valid server
    if (!target_server) {
      warning_t(ns, "%s: Ziel-Server %s unbekannt.", ns.getScriptName(), target_host)
      continue
    }
    const result = await install_backdoor(ns, target_server, OPTS.silent)
    something_installed = something_installed || result
  }

  if (something_installed) {
    // write back the backdoors that were installed
    write_server_file(ns, servers)
  }

  // try to reach the initial server
  // first go back to home
  if (!OPTS.silent) {
    ns.tprintf("%s: Ausführung beendet, kehre nach '%s' zurück.", ns.getScriptName(), initial_host)
  }
  if (initial_host !== "home") {
    // we must go further
    const initial_server = servers.find(s => s.host === initial_host)
    if(!connect_to(ns, initial_server, OPTS.silent)) {
      warning_t(ns, "%s: Kehre stattdessen zu home zurück.", ns.getScriptName(), initial_host)
      ns.exit()
    }
  } else {
    ns.singularity.connect("home")
  }
}