import { FactionName, NS } from "@ns"
import { assertEqual, f_unique, intersect, minus, reduce_to_max, reduce_to_min, reduce_to_product, reduce_to_sum } from "lib/functions"
import { MyAugment } from "lib/sing_augs"
import { get_updated_augment_list, get_updated_faction_list, get_updated_server_list } from "util/update_data"
import { get_faction_difficulty, get_faction_req_difficulty, get_faction_requirements_info, MAX_DIFFICULTY, MyFaction, RequirementData } from "/lib/factions"
import { OutputTable, OutputTableColumnType } from "/lib/tables"
import { warning_t } from "/lib/log"

const PURCHASE_INCREASE_PER_AUGMENT: number = 1.9

class ScoreVariant {
  name: string
  short: string
  get_value: (a: MyAugment) => number
  reduce_fn: (a: number, b: number) => number
  reduce_default: number
  overwrite_on_then: boolean

  constructor(
    name: string,
    short: string,
    fn: (a: MyAugment) => number,
    reduce_fn: (a: number, b: number) => number,
    reduce_default: number,
    overwrite_on_then: boolean = false) {
    this.name = name
    this.short = short
    this.get_value = fn
    this.reduce_fn = reduce_fn
    this.reduce_default = reduce_default
    this.overwrite_on_then = overwrite_on_then
  }

  static SCORE: ScoreVariant = new ScoreVariant("Score", "SC", (a: MyAugment) => a.score, reduce_to_sum, 0)
  static HACK: ScoreVariant = new ScoreVariant("Faktor (HA)", "HA", (a: MyAugment) => a.hack_factor, reduce_to_product, 1)
  static CHARISMA: ScoreVariant = new ScoreVariant("Faktor (CH)", "CH", (a: MyAugment) => a.charisma_factor, reduce_to_product, 1)
  static REPUTATION: ScoreVariant = new ScoreVariant("Faktor (REP)", "REP", (a: MyAugment) => a.reputation_factor, reduce_to_product, 1)
  static FACTION_REP: ScoreVariant = new ScoreVariant("Faktor (FR)", "FR", (a: MyAugment) => a.stats.faction_rep, reduce_to_product, 1)
  static COMPANY_REP: ScoreVariant = new ScoreVariant("Faktor (CR)", "CR", (a: MyAugment) => a.stats.company_rep, reduce_to_product, 1)
  static IDENTITY: ScoreVariant = new ScoreVariant("1", "1", (a: MyAugment) => 1, reduce_to_product, 1, true)

  then(next_factor: ScoreVariant): ScoreVariant {
    if (this.overwrite_on_then) return next_factor
    if (next_factor.overwrite_on_then) return this

    const new_short = [this.short, next_factor.short].join(", ")
    const new_name = `F (${new_short})`
    const that = this
    const new_fn = (a: MyAugment) => that.get_value(a) * next_factor.get_value(a)
    const new_reduce_fn = this.reduce_fn === reduce_to_sum || next_factor.reduce_fn === reduce_to_sum ? reduce_to_sum : reduce_to_product
    const new_reduce_default = new_reduce_fn === reduce_to_sum ? 0 : 1
    return new ScoreVariant(new_name, new_short, new_fn, new_reduce_fn, new_reduce_default)
  }
}

async function print_all_augs_data(ns: NS, scoring: ScoreVariant, from_all_facs: boolean) {

  const available_factions = (await get_updated_faction_list(ns, true))
    .filter(f => f.is_available)
  if (available_factions.length < 1) return
  const available_faction_names = available_factions.map(f => f.name)

  const all_augments = await get_updated_augment_list(ns, true)
  const req_data: RequirementData = {
    augments: all_augments,
    servers: await get_updated_server_list(ns)
  }

  const augments = all_augments
    .filter(a => !a.owned) // only new augments
    .filter(a => from_all_facs || intersect(a.factions, available_faction_names).length > 0) // only from factions already available
  if (augments.length < 1) return

  augments.sort((a, b) => scoring.get_value(b) - scoring.get_value(a)) // sort by score descending
  const data = augments.map(
    a => {
      return {
        name: a.name,
        score: scoring.get_value(a),
        price: a.price,
        rep: a.req_reputation,
        diff: get_augment_difficulty(ns, a, augments, available_factions, req_data),
        data: a.factions.filter(f => from_all_facs || available_faction_names.includes(f)).join(", "),
      }
    }
  ).filter(d => d.score > 1 && d.diff < MAX_DIFFICULTY)
  const ot = new OutputTable(ns,
    [
      { title: "Nr", property: "no", width: 2 },
      { title: "Preis", property: "price", width: 10, type: OutputTableColumnType.Currency },
      { title: "Name", property: "name", auto_width: true },
      { title: "Reputation", property: "rep", width: 10, type: OutputTableColumnType.Number },
      { title: "Score", property: "score", width: 10, type: OutputTableColumnType.Number },
      { title: "Diff", property: "diff", width: 10, type: OutputTableColumnType.Number },
      { title: "Factions", property: "data", auto_width: true },
    ]
  )

  data.forEach((l, i) => ot.line({ no: i + 1, ...l }))
  ot.flush()
}

async function print_all_facs_data(ns: NS, scoring: ScoreVariant) {

  const all_factions = await get_updated_faction_list(ns, true)
  const all_augments = await get_updated_augment_list(ns, true)

  const missing_augments = all_augments.filter(a => !a.owned)
  const relevant_factions = all_factions.filter(f => missing_augments.some(a => a.factions.includes(f.name)))

  const req_data: RequirementData = {
    servers: await get_updated_server_list(ns),
    augments: all_augments,
  }

  const data = relevant_factions.map(f => {
    const augment_list = missing_augments.filter(a => a.factions.includes(f.name))
    const relevant_aug_data = augment_list.map(a => {
      return {
        score: scoring.get_value(a),
        price: a.price,
        rep: a.req_reputation,
      }
    }).filter(d => d.score > 1)
    const result = {
      name: f.name,
      score: relevant_aug_data.map(a => a.score).reduce(scoring.reduce_fn, scoring.reduce_default),
      price: relevant_aug_data.map(a => a.price).reduce(reduce_to_sum, 0),
      rep: relevant_aug_data.map(a => a.rep).reduce(reduce_to_max, 0),
      data: get_faction_requirements_info(ns, req_data, f.invite_requirements),
    }
    return result
  })
    .filter(d => d.score > 1)

  assertEqual(missing_augments.length > 0, data.length > 0)

  data.sort((a, b) => b.score - a.score) // sort by score descending
  const ot = new OutputTable(ns,
    [
      { title: "Nr", property: "no", width: 2 },
      { title: "Preis", property: "price", width: 10, type: OutputTableColumnType.Currency },
      { title: "Name", property: "name", auto_width: true },
      { title: "Reputation", property: "rep", width: 10, type: OutputTableColumnType.Number },
      { title: "Score", property: "score", width: 10, type: OutputTableColumnType.Number },
      { title: "Voraussetzungen", property: "data", auto_width: true },
    ]
  )

  data.forEach((l, i) => ot.line({ no: i + 1, ...l }))
  ot.flush()
}

function get_augment_difficulty(ns: NS, augment: MyAugment, all_augments: MyAugment[], available_factions: MyFaction[], req_data: RequirementData): number {
  const augment_factions = available_factions.filter(a => augment.factions.includes(a.name))
  const faction_difficulty = augment_factions.map(f => get_faction_difficulty(ns, req_data, f)).reduce(reduce_to_min, MAX_DIFFICULTY)
  const remaining_repuation = augment_factions.map(f => Math.max(augment.req_reputation - f.reputation, 0)).reduce(reduce_to_min, MAX_DIFFICULTY)
  // Add faction difficulty and 0.1 per 100,000 reputation needed
  let max_prerequisite_difficulty = 0
  if (augment.req_augments.length > 0) {
    max_prerequisite_difficulty = all_augments
      .filter(a => augment.req_augments.includes(a.name))
      .map(a => get_augment_difficulty(ns, a, all_augments, available_factions, req_data))
      .reduce(reduce_to_max, 0)
  }
  return Math.max(max_prerequisite_difficulty, faction_difficulty + (remaining_repuation / 1_000_000))
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

async function print_next_augments(ns: NS, scoring: ScoreVariant, allowed_difficulty: number, verbose: boolean = false) {

  const all_factions = await get_updated_faction_list(ns, true)

  const all_augments = await get_updated_augment_list(ns, true)
  const req_data: RequirementData = {
    augments: all_augments,
    servers: await get_updated_server_list(ns)
  }

  const available_factions = all_factions.filter((f: MyFaction) => (get_faction_difficulty(ns, req_data, f) <= allowed_difficulty))
  if (available_factions.length < 1) {
    warning_t(ns, "Keine Factions verfügbar.")
    return
  }
  const available_faction_names = available_factions.map(f => f.name)

  const available_money = ns.getPlayer().money

  // determine filtering
  const augment_filter = (a: MyAugment, i: number, all: MyAugment[]) =>
    !a.owned
    && a.price <= available_money
    && intersect(a.factions, available_faction_names).length > 0
    && get_augment_difficulty(ns, a, all, available_factions, req_data) <= allowed_difficulty

  const available_augments = all_augments.filter(augment_filter)
  if (available_augments.length < 1) {
    warning_t(ns, "Keine Augments verfügbar.")
    return
  }

  available_augments.sort((a, b) => scoring.get_value(b) - scoring.get_value(a))

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

  const augment_count = (f: MyFaction) => pal.filter(a => a.factions.includes(f.name)).length
  const best_factions = available_factions.toSorted((a, b) => augment_count(b) - augment_count(a))
  const get_best_faction = (factions: FactionName[]) => best_factions.find(bf => factions.includes(bf.name))!.name
  pal.sort(sort_by_purchase_order(pal))

  const ot = new OutputTable(ns,
    [
      { title: "Nr", property: "no", width: 2 },
      { title: "Name", property: "name", auto_width: true },
      { title: "Rec. Faction", property: "faction", auto_width: true },
      { title: "Preis", property: "price", width: 10, type: OutputTableColumnType.Currency },
      { title: "Reputation", property: "rep", width: 10, type: OutputTableColumnType.Number },
      { title: scoring.name, property: "prio", auto_width: true, type: OutputTableColumnType.Number },
      { title: "Score", property: "score", width: 10, type: OutputTableColumnType.Number },
      { title: "Factions", property: "factions", auto_width: true },
    ]
  )

  pal.forEach((a, i) => ot.line({
    no: i + 1,
    name: a.name,
    faction: get_best_faction(a.factions),
    price: a.price,
    rep: a.req_reputation,
    prio: scoring.get_value(a),
    score: a.score,
    factions: a.factions.filter(fn => available_factions.some(f => f.name === fn)).toSorted().join(", ")
  }))
  ot.flush()

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
    ['rep', false], // prefer reputation enhancing augments
    ['frep', false], // prefer faction reputation enhancing augments
    ['crep', false], // prefer company reputation enhancing augments
    ['cha', false], // prefer charisma enhancing augments
    ['hack', false], // prefer hacking enhancing augments
    ['diff', 0], // maximum difficulty to get the requirements for this augmentation
    ['all', false], // maximum difficulty to get the requirements for this augmentation
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
    ns.tprintf("%-32s - %s", "--facs [Score-Opts]", "Factions mit den besten Augments ausgeben")
    ns.tprintf("%-32s - %s", "--augs [Score-Opts] [Aug-Opts]", "Beste Augments der bekannten Factions finden")
    ns.tprintf("%-32s - %s", "--next [Score-Opts] [Req.-Opts]", "Als nächstes zu kaufende Augments ermitteln")
    ns.tprintf("%-32s - %s", "--help  / -?", "Diese Hilfe ausgeben")
    ns.tprintf(" ")
    ns.tprintf("[Score-Opts] sind folgende:")
    ns.tprintf("%-32s - %s", "--rep", "Benutze die Verbesserung der Reputations-Faktoren für den Score.")
    ns.tprintf("%-32s - %s", "--frep", "Benutze die Verbesserung der Faction-Reputations-Faktoren für den Score.")
    ns.tprintf("%-32s - %s", "--crep", "Benutze die Verbesserung der Unternehmens-Reputations-Faktoren für den Score.")
    ns.tprintf("%-32s - %s", "--cha", "Benutze die Verbesserung der Charisma-Faktoren für den Score.")
    ns.tprintf("%-32s - %s", "--hack", "Benutze die Verbesserung der Hacking-Faktoren für den Score.")
    ns.tprintf("%-32s - %s", "--score", "Benutze den Standard-Score für die Bewertung.")
    ns.tprintf(" ")
    ns.tprintf("[Req.-Opts] sind folgende:")
    ns.tprintf("%-32s - %s", "--diff NUM", "Maximale Schwierigkeit, um die Voraussetzungen eines Augments zu erfüllen. Default 0.")
    ns.tprintf(" ")
    ns.tprintf("[Aug-Opts] sind folgende:")
    ns.tprintf("%-32s - %s", "--all", "Augments aller Factions ausgeben, auch von noch unbekannten Factions.")
    ns.exit()
  }

  if (OPTS.help) print_help_and_exit()


  // determine scoring
  let scoring = ScoreVariant.IDENTITY
  if (OPTS.rep) scoring = scoring.then(ScoreVariant.REPUTATION)
  if (OPTS.frep) scoring = scoring.then(ScoreVariant.FACTION_REP)
  if (OPTS.crep) scoring = scoring.then(ScoreVariant.COMPANY_REP)
  if (OPTS.cha) scoring = scoring.then(ScoreVariant.CHARISMA)
  if (OPTS.hack) scoring = scoring.then(ScoreVariant.HACK)
  if (OPTS.score || scoring === ScoreVariant.IDENTITY) scoring = scoring.then(ScoreVariant.SCORE)

  if (OPTS.facs) {
    await print_all_facs_data(ns, scoring)
  } else if (OPTS.augs) {
    await print_all_augs_data(ns, scoring, OPTS.all as boolean)
  } else if (OPTS.next) {
    const allowed_difficulty = (OPTS.diff as number)
    await print_next_augments(ns, scoring, allowed_difficulty)
  } else {
    print_help_and_exit()
  }

}