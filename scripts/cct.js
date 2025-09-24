import { disableLogs, finished, warning_t } from "lib/functions.js"

/** @param {NS} ns */
export async function main(ns) {
  disableLogs(ns, "run", "sleep")
  // wait 10 min, because chances are 25% every 10 minutes, so 1 contract every 40 minutes on average
  const WAIT_BETWEEN_SEARCHES = 600000 // = 600s = 10min

  const OPTS = ns.flags([
    ['o', false], ['once', false], // only run once
    ['l', false], ['list', false], // list types
    ['?', false], ['help', false], // help
    ['a', false], ['testall', false], // test by creating a dummy contract for every type
    ['r', false], ['random', false], // test by creating a dummy contract of a random type
    ['test', ""], // test by creating a dummy contract of the specified type
  ])

  const TYPES = ns.codingcontract.getContractTypes()

  /** @return {never} */
  function printHelpAndExit() {
    ns.tprintf("Skript zur Suche nach Contracts sowie deren Lösung.")
    ns.tprintf("Startet regulär in einer Dauerschleife und sucht alle %s nach neuen Contracts.", formatTime(WAIT_BETWEEN_SEARCHES))
    ns.tprintf(" ")
    ns.tprintf("Optionen:")
    ns.tprintf("  %-24s: %s", "--once / -o", "Startet die Suche nur einmal und beendet das Skript dann sofort.")
    ns.tprintf("  %-24s: %s", "--list / -l", "Listet alle bekannten Typen auf.")
    ns.tprintf("  %-24s: %s", "--help / -?", "Zeigt diese Hilfe an und beendet das Skript.")
    ns.tprintf(" ")
    ns.tprintf("Zum Testen (sucht nicht nach vorhandenen Contracts):")
    ns.tprintf("  %-24s: %s", "--testall / -a", "Testet alle Typen, indem Dummy-Contracts für jeden Typ erstellt und gelöst werden.")
    ns.tprintf("  %-24s: %s", "--random / -r", "Testet einen zufällig erstellten Dummy-Contract.")
    ns.tprintf("  %-24s: %s", "--test TYPE", "Testet einen Dummy-Contract zum angegebenen TYPE.")
    ns.exit()
  }

  /**
   * @param {NS} ns
   * @param {string} script
   * @param {string[]} script_args
   */
  async function run_script(ns, script, ...script_args) {
    const scr_pid = ns.run(script, 1, ...script_args)
    await finished(ns, scr_pid)
  }

  /** @param {NS} ns */
  async function run_once(ns) {
    ns.printf("Finde CCTs"); await run_script(ns, "util/cct_find.js")
    ns.printf("Ermittle Typen"); await run_script(ns, "util/cct_fetch_type.js")
    ns.printf("Hole Daten"); await run_script(ns, "util/cct_fetch_data.js")
    ns.printf("Löse Aufgaben"); await run_script(ns, "util/cct_solve.js")
    ns.printf("Committe Ergebnisse"); await run_script(ns, "util/cct_commit.js")
  }

  /**
   * @param {NS} ns
   * @param {string[]} types
   */
  async function create_dummies(ns, types) {
    for (let t of types) {
      await run_script(ns, "util/cct_dummy.js", t)
    }
  }

  if (OPTS['?'] || OPTS.help) {
    printHelpAndExit()
  } else if (OPTS.o || OPTS.once) {
    run_once(ns)
  } else if (OPTS.l || OPTS.list) {
    ns.tprintf("Folgende Typen sind bekannt:")
    TYPES.forEach(t => ns.tprintf("  %s", t))
  } else if (OPTS.r || OPTS.random) {
    let randomType = TYPES[Math.floor(Math.random() * TYPES.length)]
    await create_dummies(ns, [randomType])
    await run_once(ns)
  } else if (OPTS.a || OPTS.testall) {
    await create_dummies(ns, TYPES)
    await run_once(ns)
  } else if (OPTS.test != "") {
    const testType = OPTS.test
    if (!TYPES.includes(testType)) {
      warning_t(ns, "Typ '%s' ist unbekannt", testType)
    } else {
      await create_dummies(ns, [testType])
      await run_once(ns)
    }
  } else {
    for (; ;) {
      await run_once(ns)
      await ns.sleep(WAIT_BETWEEN_SEARCHES)
    }
  }

}