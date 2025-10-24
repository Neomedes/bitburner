import { disableLogs, finished, formatTime, is_empty_str, run_script } from "lib/functions"
import { warning_t } from "lib/log"

/** @param {NS} ns */
export async function main(ns: NS) {
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
  function print_help_and_exit(): never {
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

  /** @param {NS} ns */
  async function run_once(ns: NS) {
    let step = 0
    try {
      await run_script(ns, "util/cct_find.js"); step++
      await run_script(ns, "util/cct_fetch_type.js"); step++
      await run_script(ns, "util/cct_fetch_data.js"); step++
      await run_script(ns, "util/cct_solve.js"); step++
      await run_script(ns, "util/cct_commit.js"); step++
    }
    finally {
      ns.printf("Looked for new contracts (%d steps finished)", step)
    }
  }

  /**
   * @param {NS} ns
   * @param {string[]} types
   */
  async function create_dummies(ns: NS, types: string[]) {
    for (let t of types) {
      await run_script(ns, "util/cct_dummy.js", 1, t)
    }
  }

  if (OPTS['?'] === true || OPTS.help === true) {
    print_help_and_exit()
  } else if (OPTS.o === true || OPTS.once === true) {
    await run_once(ns)
  } else if (OPTS.l === true || OPTS.list === true) {
    ns.tprintf("Folgende Typen sind bekannt:")
    TYPES.forEach(t => ns.tprintf("  %s", t))
  } else if (OPTS.r === true || OPTS.random === true) {
    let randomType = TYPES[Math.floor(Math.random() * TYPES.length)]
    await create_dummies(ns, [randomType])
    await run_once(ns)
  } else if (OPTS.a === true || OPTS.testall === true) {
    await create_dummies(ns, TYPES)
    await run_once(ns)
  } else if (!is_empty_str(OPTS.test as string)) {
    const testType = OPTS.test as string
    if (!TYPES.map(t => t.toString()).includes(testType)) {
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