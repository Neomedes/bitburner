import { is_empty_str, share_entries, intersect } from "lib/functions"
import { warning_t } from "lib/log"
import { MyAugment } from "lib/sing_augs"
import { get_updated_augment_list } from "util/update_data"

/**
 * Builds a string representation of only changed stats.
 * @param {NS} ns Netscript API
 * @param {MyAugment} augment The augments name
 * @return {string} The changed stats as a string
 */
function get_changed_stats(ns: NS, augment: MyAugment): string {
  const changed_stats: string[] = []
  if (augment.stats === undefined) return ""
  Object.entries(augment.stats).forEach(([prop, value]) => {
    if (value !== 1) {
      changed_stats.push(ns.sprintf("%s: %+3d%%", prop, (value - 1) * 100))
    }
  })
  return changed_stats.join(", ")
}

/** @param {string[]} possible_factions @param {string} filter @return {string[]} */
function get_filtered_factions(possible_factions: string[], filter: string): string[] {
  if (is_empty_str(filter)) return possible_factions
  const lc_filter = filter.toLowerCase()
  return possible_factions.filter(f => f.toLowerCase().includes(lc_filter))
}

/** @param {NS} ns */
export async function main(ns: NS) {
  const OPTS = ns.flags([
    // print factions and augmentations
    ['facs', false], // lists all factions
    ['augs', false], // lists all augmentations
    ['f', ""], // filter for faction
    ['a', ""], // filter for augmentation
    ['s', ""], // filter for stat
    // misc
    ['update', false], ['u', false], // update complete augmentation list
    ['pal', false], // get purchase augmentations list
    ['irep', false], // pal: ignore reputation requirements
    ['imon', false], // pal: ignore money requirements
    ['ifac', false], // pal: search for all factions
    ['all', false], // pal: irep, imon and ifac together
    ['?', false], ['help', false], // print help
  ])
  OPTS.help = OPTS.help || OPTS['?']
  OPTS.update = OPTS.update || OPTS.u

  /**
   * @return {never}
   */
  function printHelpAndExit(): never {
    ns.tprintf("Folgende Optionen hat das Skript %s:", ns.getScriptName())
    ns.tprintf(" ")
    ns.tprintf("Ausgabe von Factions und Augmentations:")
    ns.tprintf("%-16s - %s", "--facs", "Factions ausgeben")
    ns.tprintf("%-16s - %s", "--augs", "Augmentations ausgeben")
    ns.tprintf("%-16s - %s", "-f FILTER", "Auszugebende Infos nur für Factions, in denen FILTER vorkommt (case-insensitiv)")
    ns.tprintf("%-16s - %s", "-a FILTER", "Auszugebende Infos nur für Augmentations, in denen FILTER vorkommt (case-insensitiv)")
    ns.tprintf("%-16s - %s", "-s FILTER", "Auszugebende Infos nur für Augmentations, die einen Stat verbessern, in dem FILTER vorkommt (case-insensitiv)")
    ns.tprintf(" ")
    ns.tprintf("Weitere Funktionen:")
    ns.tprintf("%-16s - %s", "--update|-u", "Liste der Augments komplett neu erstellen")
    ns.tprintf("%-16s - %s", "--pal [--irep|--imon|--all|--ifac]", "'Purchase Augmentations List' ausgeben")
    ns.tprintf("%-16s - %s", "      --irep", "Aktuelle Reputation nicht berücksichtigen")
    ns.tprintf("%-16s - %s", "      --imon", "Aktuelle Finanzen nicht berücksichtigen")
    ns.tprintf("%-16s - %s", "      --ifac", "Alle Factions berücksichtigen")
    ns.tprintf("%-16s - %s", "      --all", "wie --irep, --imon und --ifac zusammen")
    ns.tprintf("%-16s - %s", "--help  / -?", "Diese Hilfe ausgeben")
    ns.exit()
  }

  if (OPTS.help) printHelpAndExit()

  const all_augments = await get_updated_augment_list(ns, OPTS.update === true || OPTS.pal === true)

  let done_something = false
  if (OPTS.facs) {
    done_something = true
    const factions = get_filtered_factions(Object.values(ns.enums.FactionName), OPTS.f.toString())
    factions.sort()

    if (factions.length < 1) {
      ns.tprintf("Leider keine passende Faction gefunden.")
    } else {
      factions.forEach(f => ns.tprintf("%30s", f))
    }
  }
  if (OPTS.augs) {
    done_something = true
    // find factions
    const factions = get_filtered_factions(Object.values(ns.enums.FactionName), OPTS.f.toString())
    factions.sort()

    // collect all augmentations of these factions
    const augmentations = all_augments
      .filter(a => share_entries(a.factions, factions))
      .filter(a => is_empty_str(OPTS.a.toString()) || a.name.includes(OPTS.a.toString()))
    augmentations.sort()

    for (let augment of augmentations) {
      const stats = get_changed_stats(ns, augment)
      if (OPTS.s !== "" && !stats.toLowerCase().includes(OPTS.s.toString().toLowerCase())) { continue }
      ns.tprintf("%-40s - %s", augment.name, stats)
    }
  }
  if (OPTS.pal) {
    done_something = true
    const purchase_cost_multiplier = 1.9
    const player_money = ns.getPlayer().money

    // preferences
    const ignore_money = OPTS.all === true || OPTS.imon === true
    const ignore_reputation = OPTS.all === true || OPTS.irep === true
    const use_all_factions = OPTS.all === true || OPTS.ifac === true

    // collect all entered factions
    const possible_factions = use_all_factions ? Object.values(ns.enums.FactionName) : [...ns.getPlayer().factions, ...ns.singularity.checkFactionInvitations()]
    function get_max_reputation(factions: string[]): number {
      const my_factions = intersect(factions, possible_factions)
      const max_rep = my_factions.map(f => ns.singularity.getFactionRep(f)).reduce((m, a) => m < a ? a : m, 0)
      return max_rep
    }
    // collect all augmentations...
    const filter_augs = (a: MyAugment): boolean =>
      share_entries(a.factions, possible_factions) // ... of these factions
      && !a.owned // ... that we do not own yet
      && (ignore_money || a.price <= player_money) // ... that we can afford on their own
      && (ignore_reputation || a.req_reputation <= get_max_reputation(a.factions)) // ... that we have enough reputation for

    const augmentations = all_augments.filter(filter_augs)

    if (augmentations.length < 1) {
      warning_t(ns, "Es stehen derzeit keine Augments zur Verfügung")
      ns.exit()
    }

    /** Determine the total price of all given augments in best order (most expensive to cheapest) */
    function total_price(augs: MyAugment[]): number {
      return augs.map(a => a.price)
        .sort()
        .reverse()
        .reduce((s, p, i) => s + ((purchase_cost_multiplier ** i) * p), 0)
    }

    // search for the best augments per price that we can afford in total
    // then add as much augments as we can afford

    // sort by best score per price in descending order
    function rel_score(a: MyAugment): number { return (a.score / (a.price === 0 ? 1 : a.price)) }
    augmentations.sort((a, b) => rel_score(b) - rel_score(a))

    // find break point, the index of the last augment where we can afford all previous augments
    let break_point = ignore_money ? augmentations.length - 1 : -1
    for (let i = break_point + 1; i < augmentations.length; i++) {
      if (total_price(augmentations.slice(0, i + 1)) > player_money)
        break
      break_point = i
    }

    const pal = augmentations.slice(0, break_point + 1)

    if (pal.length < augmentations.length - 1) {
      for (let i = break_point + 2; i < augmentations.length; i++) {
        pal.push(augmentations[i]) // add augment for testing price
        if (total_price(pal) > player_money) {
          // price would be too high -> remove augment
          pal.pop()
        }
      }
    }

    function line(nr: string, price: string, name: string, rep: string, score: string, factions: string) {
      ns.tprintf("%02s | %10s | %60s | %10s | %10s | %s", nr, price, name, rep, score, factions)
    }
    function headline() {
      line("Nr", "Preis", "Name", "Reputation", "Score", "Fraktionen")
    }
    function separator() {
      ns.tprintf("%02s-+-%10s-+-%60s-+-%10s-+-%10s-+-%s", "--", "-".repeat(10), "-".repeat(60), "-".repeat(10), "-".repeat(10), "-".repeat(30))
    }

    pal.sort((a, b) => b.price - a.price)
    if (pal.length < 1) {
      warning_t(ns, "Keine Möglichkeit des optimalen Kaufs gefunden!")
    } else {
      ns.tprintf("Zu kaufende Augmentations (Preise zum Zeitpunkt des Kaufs):")
      headline()
      separator()

      let total = 0
      pal.forEach((p, i) => {
        const real_price = (purchase_cost_multiplier ** i) * p.price
        total += real_price
        const price = ns.formatNumber(real_price)
        const rep = ns.formatNumber(p.req_reputation)
        const score = ns.formatNumber(p.score)
        const factions = p.factions.filter(f => possible_factions.includes(f)).join(", ")
        line((i + 1).toString(), price, p.name, rep, score, factions)
        if ((i + 1) % 3 === 0) separator()
      })
      if (pal.length % 3 !== 0) separator()
      ns.tprintf(" ")
      ns.tprintf("Total: %s", ns.formatNumber(total))

    }
  }

  if (!done_something) {
    printHelpAndExit()
  }
}