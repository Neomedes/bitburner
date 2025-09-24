const AUGMENTS_FILE = "/data/augments_data.txt"

/*
  Sector 12   - CashRoot
                Starting money 1m, programs: BruteSSH
  TianDiHui   - Neuroreceptor Manager
                No penalty for not focussing
  BitRunners  - Neurolink
                programs: ftpCrack, relaySMTP
  Deadalus    - The Red Pill
                Revealing the WorldDeamon
 */
export const UNIQUE_AUGS = ["CashRoot Starter Kit", "Neuroreceptor Management Implant", "BitRunners Neurolink", "The Red Pill"]

export class MyAugment {
  /**
   * @param {string} name
   * @param {string} faction
   */
  constructor(name, faction) {
    this.name = name
    this.factions = [faction]

    this.is_unique = UNIQUE_AUGS.includes(this.name)

    this.stats = null
    this.price = null
    this.req_reputation = null
    this.req_augments = null
    this.owned = false
  }

  /** @param {string} faction @return {MyAugment} this */
  add_faction(faction) {
    if (!this.factions.includes(faction)) this.factions.push(faction)
    return this
  }

  /** @param {Multipliers} stats @return {MyAugment} this */
  set_stats(stats) {
    this.stats = stats
    if (this.stats == null) return this

    const s = this.stats
    this.hack_factor = s.hacking * s.hacking_chance * s.hacking_exp * s.hacking_grow * s.hacking_money * s.hacking_speed
    this.reputation_factor = s.company_rep * s.faction_rep
    this.charisma_factor = s.charisma * s.charisma_exp
    this.physical_factor = s.strength * s.strength_exp * s.defense * s.defense_exp * s.dexterity * s.dexterity_exp * s.agility * s.agility_exp

    this.score = MyAugment.calculate_score([this])
    return this
  }

  /** @param {string[]} price @return {MyAugment} this */
  set_factions(factions) { this.factions = factions; return this }
  /** @param {number} price @return {MyAugment} this */
  set_price(price) { this.price = price; return this }
  /** @param {number} req_reputation @return {MyAugment} this */
  set_req_reputation(req_reputation) { this.req_reputation = req_reputation; return this }
  /** @param {string[]} req_augments @return {MyAugment} this */
  set_req_augments(req_augments) { this.req_augments = req_augments; return this }
  /** @param {boolean} owned @return {MyAugment} this */
  set_owned(owned) { this.owned = owned; return this }

  /** @param {string[]} owned_augs @return {MyAugment} this */
  update_owned(owned_augs) {
    if (Array.isArray(owned_augs) && owned_augs.length > 0 && owned_augs.includes) {
      this.owned = owned_augs.includes(this.name)
    }
    return this
  }

  /** @param {MyAugment[]} augs @return {number} */
  static calculate_score(augs) {
    let power = 10
    let score = 0

    const unique_index = augs
      .filter(a => a.is_unique)
      .map(a => UNIQUE_AUGS.indexOf(a.name))
      .reduce((m, idx) => m > -1 && m < idx ? m : idx, -1)
    score += (unique_index + 1) * 10 ** power
    power -= 2

    const hack_factor = augs.reduce((f, a) => a.hack_factor * f, 1)
    score += (hack_factor - 1) * 10 ** power
    power--

    const reputation_factor = augs.reduce((f, a) => a.reputation_factor * f, 1)
    score += (reputation_factor - 1) * 10 ** power
    power--

    const charisma_factor = augs.reduce((f, a) => a.charisma_factor * f, 1)
    score += (charisma_factor - 1) * 10 ** power
    power--

    const physical_factor = augs.reduce((f, a) => a.physical_factor * f, 1)
    score += (physical_factor - 1) * 10 ** power
    power--

    return score
  }

  static fromJSON(o) {
    return new MyAugment(o.name, o.factions[0])
      .set_factions(o.factions)
      .set_stats(o.stats)
      .set_price(o.price)
      .set_req_reputation(o.req_reputation)
      .set_req_augments(o.req_augments)
      .set_owned(o.owned)
  }
}

/**
 * Writes all known Augmentations to file.
 * @param {NS} ns
 * @param {MyAugment[]} augments
 */
export function write_augments_file(ns, augments) {
  const server_data = JSON.stringify(augments)
  ns.write(AUGMENTS_FILE, server_data, "w")
}

/**
 * Reads all servers from file.
 * @param {NS} ns
 * @return {MyAugment[]} Loaded augmentations.
 */
export function read_augments_file(ns) {
  const augments_data = ns.read(AUGMENTS_FILE)
  const augments = JSON.parse(augments_data).map(o => MyAugment.fromJSON(o))
  return augments
}