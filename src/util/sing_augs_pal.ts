import { FactionName, NS } from "@ns"
import { assertEqual, f_unique, intersect, minus, reduce_to_max, reduce_to_min, reduce_to_sum } from "lib/functions"
import { MyAugment } from "lib/sing_augs"
import { get_updated_augment_list, get_updated_faction_list, get_updated_server_list } from "util/update_data"
import { get_faction_requirements_info, MyFaction, RequirementData } from "/lib/factions"
import { OutputTable, OutputTableColumnType } from "/lib/tables"

const PURCHASE_INCREASE_PER_AUGMENT: number = 1.9
const MAX_DIFFICULTY: number = 1_000_000

interface ResultData {
  name: string
  score: number
  price: number
  rep: number
  data: string
}

async function to_facs_data(ns: NS, filtered: MyAugment[], factions: string[] | null = null): Promise<ResultData[]> {
  const grouped_by_fac = new Map<FactionName, MyAugment[]>()
  filtered.forEach(a => {
    a.factions.forEach(f => {
      // skip nonvalid factions if any are given
      if (factions != null && !factions.includes(f)) return

      if (grouped_by_fac.has(f)) {
        grouped_by_fac.get(f)!.push(a)
      } else {
        grouped_by_fac.set(f, [a])
      }
    })
  })

  const data: RequirementData = {
    servers: await get_updated_server_list(ns),
    augments: await get_updated_augment_list(ns, true),
  }

  const result = grouped_by_fac.keys().map(
    key => {
      const augment_list = grouped_by_fac.get(key)!
      const requirements = ns.singularity.getFactionInviteRequirements(key)
      const result: ResultData = {
        name: key,
        score: augment_list.map(a => a.score).reduce(reduce_to_sum, 0),
        price: augment_list.map(a => a.price).reduce(reduce_to_sum, 0),
        rep: augment_list.map(a => a.req_reputation).reduce(reduce_to_max, 0),
        data: get_faction_requirements_info(ns, data, requirements),
      }
      return result
    }
  ).toArray()
  return result
}

/** @param {MyAugment[]} filtered @param {string[]?} factions @return {ResultData[]} */
function to_augs_data(filtered: MyAugment[], factions: FactionName[]): ResultData[] {
  return filtered.map(
    a => {
      return {
        name: a.name,
        score: a.score,
        price: a.price,
        rep: a.req_reputation,
        data: a.factions.filter(f => factions.includes(f)).join(", "),
      }
    }
  )
}

function print_data_table(ns: NS, data: ResultData[], last_col_title: string): void {
  const ot = new OutputTable(ns,
    [
      { title: "Nr", property: "no", width: 2 },
      { title: "Preis", property: "price", width: 10, type: OutputTableColumnType.Currency },
      { title: "Name", property: "name", auto_width: true },
      { title: "Reputation", property: "rep", width: 10, type: OutputTableColumnType.Number },
      { title: "Score", property: "score", width: 10, type: OutputTableColumnType.Number },
      { title: last_col_title, property: "data", auto_width: true },
    ]
  )

  data.forEach((l, i) => ot.line({ no: i + 1, ...l }))
  ot.flush()
}

async function print_all_augs_data(ns: NS, all_augments: MyAugment[]) {
  const available_factions = (await get_updated_faction_list(ns, true))
    .filter(f => f.is_available)
    .map(f => f.name)
  if (available_factions.length < 1) return

  const augments = all_augments
    .filter(a => !a.owned) // only new augments
    .filter(a => intersect(a.factions, available_factions).length > 0) // only from factions already available
  if (augments.length < 1) return

  const data = to_augs_data(augments, available_factions)
  data.sort((a, b) => b.score - a.score) // sort by score descending
  print_data_table(ns, data, "Voraussetzungen")
}

async function print_all_facs_data(ns: NS, all_augments: MyAugment[]) {
  const augs = all_augments.filter(a => !a.owned)
  const data = await to_facs_data(ns, augs)
  assertEqual(augs.length > 0, data.length > 0)

  data.sort((a, b) => b.score - a.score) // sort by score descending
  print_data_table(ns, data, "Factions")
}

function get_faction_difficulty(ns: NS, faction: MyFaction): number {
  return faction.is_available ? 0 : MAX_DIFFICULTY
}

function get_augment_difficulty(ns: NS, augment: MyAugment, all_augments: MyAugment[], available_factions: MyFaction[]): number {
  const augment_factions = available_factions.filter(a => augment.factions.includes(a.name))
  const faction_difficulty = augment_factions.map(f => get_faction_difficulty(ns, f)).reduce(reduce_to_min, MAX_DIFFICULTY)
  const remaining_repuation = augment_factions.map(f => Math.max(augment.req_reputation - f.reputation, 0)).reduce(reduce_to_min)
  // Add faction difficulty and 0.1 per 100,000 reputation needed
  return faction_difficulty + (remaining_repuation / 1_000_000)
}

function get_price_at_position(price: number, pos: number): number {
  return Math.pow(PURCHASE_INCREASE_PER_AUGMENT, pos) * price
}

function sort_by_purchase_order(augments: MyAugment[]): (a: MyAugment, b: MyAugment) => number {
  function get_cohort_price_sum(augment: MyAugment): number {
    let cohort: MyAugment[] = [augment]
    let expanded: boolean = true
    while (expanded) {
      const last_size = cohort.length
      cohort = augments.filter(a => {
        return cohort.includes(a)
          || a.req_augments.some(req => cohort.some(c => c.name === req))
          || cohort.some(c => c.req_augments.some(req => c.name === req))
      })
        .filter(f_unique)
      expanded = cohort.length > last_size
    }
    return cohort.map(a => a.price).reduce(reduce_to_sum, 0)
  }
  return (a: MyAugment, b: MyAugment) => {
    // negative => a first, positive => b first
    if (a == null && b == null) return 0 // both empty
    if (a == null) return 1 // b first, a (nulls) last
    if (b == null) return -1 // a first, b (nulls) last
    if (a.name === b.name) return 0 // should be the same augment
    if (a.req_augments_indirect.includes(b.name)) return 1 // b first when its a prerequisite
    if (b.req_augments_indirect.includes(a.name)) return -1 // a first when its a prerequisite
    return get_cohort_price_sum(b) - get_cohort_price_sum(a) // by price in descending order (more expensive ones first)
  }
}

function get_total_price(augment_list: MyAugment[]): number {
  return augment_list.slice()
    .toSorted(sort_by_purchase_order(augment_list))
    .reduce((sum: number, aug: MyAugment, idx: number) => sum + get_price_at_position(aug.price, idx), 0)
}

function get_missing_augments(required_augments: MyAugment[], present_augments: MyAugment[]): MyAugment[] {
  return minus(required_augments, present_augments)
}

function filter_with_verbose_total(ns: NS, fn: (a: MyAugment, i: number, ar: MyAugment[]) => boolean, verbose: boolean, description: string): (a: MyAugment, i: number, ar: MyAugment[]) => boolean {
  let printed = false
  return (a: MyAugment, i: number, ar: MyAugment[]): boolean => {
    if (verbose && !printed) {
      ns.tprintf("%d Augments vor Filterung wegen \"%s\"", ar.length, description)
      printed = true
    }
    return fn(a, i, ar)
  }
}

async function print_next_augments(ns: NS, all_augments: MyAugment[], maximum_difficulty: number, verbose: boolean = false) {
  const available_money = ns.getPlayer().money
  const available_factions = (await get_updated_faction_list(ns, true))
    .filter(f => get_faction_difficulty(ns, f) <= maximum_difficulty)
  if (available_factions.length < 1) return

  const available_faction_names = available_factions.map(f => f.name)
  if (verbose) ns.tprintf("Durchsuche Augments folgender Factions:\n%s", available_faction_names.join(", "))

  const available_augments = all_augments
    .filter(filter_with_verbose_total(ns, a => !a.owned, verbose, "Besitz")) // only new augments
    .filter(filter_with_verbose_total(ns, a => a.price <= available_money, verbose, "Kosten")) // at least the augment itself must be affordable
    .filter(filter_with_verbose_total(ns, a => intersect(a.factions, available_faction_names).length > 0, verbose, "Faction")) // only from factions already available
    .filter(filter_with_verbose_total(ns, (a, i, all) => get_augment_difficulty(ns, a, all, available_factions) <= maximum_difficulty, verbose, "Difficulty"))
  if (verbose) ns.tprintf("%d Augments nach Filterung", available_augments.length)
  if (available_augments.length < 1) return

  available_augments.sort((a, b) => b.score - a.score) // sort by score descending

  const pal: MyAugment[] = []

  for (let i = 0; i < available_augments.length; i++) {
    const aug = available_augments[i]
    if (pal.includes(aug)) continue

    const required_augments = all_augments.filter(a => aug.req_augments_indirect.includes(a.name))
    const present_augments = [...pal, ...all_augments.filter(a => a.owned)]
    const missing_augments = get_missing_augments(required_augments, present_augments)

    // we may have missing augments as prerequisites
    // are all of them available? If not: skip this augment
    if (missing_augments.length > 0 && !missing_augments.every(a => available_augments.includes(a))) {
      if (verbose) {
        const unavailable = missing_augments.filter(a => !available_augments.includes(a)).map(a => a.name)
        ns.tprintf("%-40s: Fehlende Voraussetzung%s: %s", unavailable.length > 1 ? "en" : "", unavailable.join(", "))
      }
      continue
    }
    // test if enough money is available for all augments
    const total_price = get_total_price([...pal, aug, ...missing_augments])
    if (total_price > available_money) {
      continue
    }
    // they are available and affordable, so add them and go on with the next
    if (verbose) {
      ns.tprintf("%-40s: hinzu", aug.name)
      if (missing_augments.length > 0)
        missing_augments.forEach(a => ns.tprintf("%-40s: hinzu (Voraussetzung)", a.name))
    }
    pal.push(aug, ...missing_augments)
  }
  pal.sort(sort_by_purchase_order(pal))
  const data = to_augs_data(pal, available_faction_names)
  print_data_table(ns, data, "Factions")
  ns.tprintf("Gesamt-Preis: %s", ns.formatNumber(get_total_price(pal)))
  ns.tprintf("Gesamt-Score: %s", ns.formatNumber(MyAugment.calculate_score(pal)))
  ns.tprintf("Gesamt-Upgrade: +%s", ns.formatPercent(pal.map(a => a.overall_factor).reduce(reduce_to_sum, 1) - 1))
}

/** @param {NS} ns */
export async function main(ns: NS) {
  const OPTS = ns.flags([
    ['augs', false], // find best augments
    ['facs', false], // list factions instead of augments
    ['next', false], // find next augments
    ['diff', 0], // maximum difficulty to get the requirements for this augmentation
    ['?', false], ['help', false], // get purchase augmentations list
  ])
  OPTS.help = OPTS.help || OPTS['?']

  /**
   * @return {never}
   */
  function print_help_and_exit() {
    ns.tprintf("Ausgabe von sinnvollen Augments und deren Factions für die nächste Installation.")
    ns.tprintf("Diese sind auch bekannt als PAL - der 'Purchase Augmentations List'")
    ns.tprintf(" ")
    ns.tprintf("Folgende Optionen hat das Skript %s:", ns.getScriptName())
    ns.tprintf(" ")
    ns.tprintf("%-16s - %s", "--augs", "Beste Augments finden")
    ns.tprintf("%-16s - %s", "--facs", "Factions mit den besten Augments ausgeben")
    ns.tprintf("%-16s - %s", "--next", "Als nächstes zu kaufende Augments ermitteln")
    ns.tprintf("%-16s - %s", "--diff NUM", "Maximale Schwierigkeit, um die Voraussetzungen eines Augments zu erfüllen. Default 0.")
    ns.tprintf("%-16s - %s", "--help  / -?", "Diese Hilfe ausgeben")
    ns.exit()
  }

  if (OPTS.help) print_help_and_exit()

  const all_augments = await get_updated_augment_list(ns, true)

  if (OPTS.augs) {
    await print_all_augs_data(ns, all_augments)
  } else if (OPTS.facs) {
    await print_all_facs_data(ns, all_augments)
  } else if (OPTS.next) {
    await print_next_augments(ns, all_augments, OPTS.diff as number)
  } else {
    print_help_and_exit()
  }

}