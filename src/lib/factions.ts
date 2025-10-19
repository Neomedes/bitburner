import { CompanyName, FactionName, FactionWorkType, NodeStats, NS, PlayerRequirement } from '@ns'
import { get_skills_diff, has_skills } from '/lib/player'
import { MyServer } from '/lib/servers'
import { MyAugment } from '/lib/sing_augs'

const FACTION_FILE = "/data/faction_data.txt"

export interface RequirementData {
    servers: MyServer[],
    augments: MyAugment[],
}

export function count_hacknet_prop(ns: NS, prop: (stats: NodeStats) => number): number {
    let sum = 0
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        const stats = ns.hacknet.getNodeStats(i)
        sum += prop(stats)
    }
    return sum
}

export function player_meets_faction_req(ns: NS, data: RequirementData, requirement: PlayerRequirement): boolean {
    switch (requirement.type) {
        case "everyCondition":
            return requirement.conditions.every(cond => player_meets_faction_req(ns, data, cond))
        case "someCondition":
            return requirement.conditions.some(cond => player_meets_faction_req(ns, data, cond))
        case "not":
            return !player_meets_faction_req(ns, data, requirement.condition)
        case "backdoorInstalled":
            return data.servers.some(s => s.host === requirement.server && s.backdoor)
        case "city":
            return ns.getPlayer().city === requirement.city
        case "companyReputation":
            return ns.singularity.getCompanyRep(requirement.company) >= requirement.reputation
        case "employedBy":
            return ns.singularity.getCompanyRep(requirement.company) > 0 || ns.singularity.getCompanyFavor(requirement.company) > 0
        case "file":
            return ns.fileExists(requirement.file)
        case "money":
            return ns.getPlayer().money >= requirement.money
        case "location":
            return requirement.location === ns.getPlayer().location
        case "numAugmentations":
            return data.augments.filter(aug => aug.installed).length >= requirement.numAugmentations
        case "skills":
            return has_skills(ns.getPlayer().skills, requirement.skills)
        case "sourceFile":
            return ns.singularity.getOwnedSourceFiles().some(sfl => sfl.n === requirement.sourceFile)
        case "numPeopleKilled":
            return ns.getPlayer().numPeopleKilled >= requirement.numPeopleKilled
        case "karma":
            return (ns.heart.break() / requirement.karma) >= 1
        case "hacknetCores":
            return count_hacknet_prop(ns, s => s.cores) >= requirement.hacknetCores
        case "hacknetLevels":
            return count_hacknet_prop(ns, s => s.level) >= requirement.hacknetLevels
        case "hacknetRAM":
            return count_hacknet_prop(ns, s => s.ram) >= requirement.hacknetRAM
        case "bitNodeN":
        case "bladeburnerRank":
        case "jobTitle":
        case "numInfiltrations":
        default:
            return false
    }
}

export function faction_req_to_string(ns: NS, requirement: PlayerRequirement): string {
    switch (requirement.type) {
        case "everyCondition":
            return "(" + requirement.conditions.map(cond => faction_req_to_string(ns, cond)).join(" UND ") + ")"
        case "someCondition":
            return "(" + requirement.conditions.map(cond => faction_req_to_string(ns, cond)).join(" ODER ") + ")"
        case "not":
            return "NICHT " + faction_req_to_string(ns, requirement.condition)
        case "backdoorInstalled":
            return ns.sprintf("Backdoor auf '%s'", requirement.server)
        case "city":
            return ns.sprintf("Sei in %s", requirement.city)
        case "companyReputation":
            return ns.sprintf("%s Reputation bei %s", requirement.reputation, requirement.company)
        case "employedBy":
            return ns.sprintf("Angestellt bei %s", requirement.company)
        case "file":
            return ns.sprintf("Habe Datei %s", requirement.file)
        case "money":
            return ns.sprintf("Habe $%s", ns.formatNumber(requirement.money))
        case "location":
            return ns.sprintf("Sei bei %s", requirement.location)
        case "numAugmentations":
            return ns.sprintf("Habe %d Augments", requirement.numAugmentations)
        case "skills":
            return ns.sprintf("(Skills: %s)", Object.entries(requirement.skills).filter(([key, val]) => val !== undefined).map(([key, val]) => `${key}: ${val}`).join(", "))
        case "sourceFile":
            return ns.sprintf("Habe SF %d", requirement.sourceFile)
        case "bitNodeN":
            return ns.sprintf("Sei in BN %d", requirement.bitNodeN)
        case "bladeburnerRank":
            return ns.sprintf("Bladeburner Rang %d", requirement.bladeburnerRank)
        case "hacknetCores":
            return ns.sprintf("%d Hacknet Cores", requirement.hacknetCores)
        case "hacknetLevels":
            return ns.sprintf("%d Hacknet Level", requirement.hacknetLevels)
        case "hacknetRAM":
            return ns.sprintf("%d Hacknet RAM", requirement.hacknetRAM)
        case "jobTitle":
            return ns.sprintf("Job Position %s", requirement.jobTitle)
        case "karma":
            return ns.sprintf("%s Karma", ns.formatNumber(requirement.karma))
        case "numInfiltrations":
            return ns.sprintf("%d Infiltrationen", requirement.numInfiltrations)
        case "numPeopleKilled":
            return ns.sprintf("%d Tote", requirement.numPeopleKilled)
        default:
            return ns.sprintf("Unbekannter Typ")
    }
}

export function get_faction_req_difficulty(ns: NS, data: RequirementData, requirement: PlayerRequirement): number {
    const max_difficulty = 1_000_000_000
    function clamp_rel_0_10(value: number, min: number, max: number): number { return Math.pow(Math.E, (value - min) / max * 10) }
    function get_relative_difficulty(current_value: number, target_value: number, min: number, max: number) {
        if (target_value <= current_value) return 0
        return clamp_rel_0_10(target_value, min, max) - clamp_rel_0_10(current_value, min, max)
    }
    function backdoor_difficulty(host: string): number {
        const target = data.servers.find(s => s.host === host)
        if (target === undefined) return max_difficulty
        if (target.backdoor!) return 0
        return get_relative_difficulty(ns.getPlayer().skills.hacking, target.hack_needed!, 0, 10000)
    }

    switch (requirement.type) {
        case "everyCondition":
            // return sum
            return requirement.conditions.map(cond => get_faction_req_difficulty(ns, data, cond)).reduce((sum, diff) => sum + diff, 0)
        case "someCondition":
            // return min
            return requirement.conditions.map(cond => get_faction_req_difficulty(ns, data, cond)).reduce((sum, diff) => sum > diff ? diff : sum, max_difficulty)
        case "not":
            return max_difficulty - get_faction_req_difficulty(ns, data, requirement.condition)
        case "backdoorInstalled":
            return backdoor_difficulty(requirement.server)
        case "city":
            return ns.getPlayer().city === requirement.city ? 0 : .05
        case "companyReputation":
            const cur_rep = ns.singularity.getCompanyRep(requirement.company)
            return get_relative_difficulty(cur_rep, requirement.reputation, 0, 100_000)
        case "employedBy":
            return (ns.getPlayer().jobs[requirement.company] !== undefined) ? 0 : .05
        case "file":
            return ns.fileExists(requirement.file) ? 0 : 10
        case "money":
            let relative_max = 1
            while (relative_max * 100 < ns.getPlayer().money) relative_max *= 10
            return get_relative_difficulty(ns.getPlayer().money, requirement.money, 0, relative_max)
        case "location":
            return ns.getPlayer().location === requirement.location ? 0 : .05
        case "numAugmentations":
            return data.augments.filter(aug => aug.installed).length >= requirement.numAugmentations ? 0 : max_difficulty
        case "skills":
            let diff = 0
            let skills_diff = get_skills_diff(ns.getPlayer().skills, requirement.skills)
            diff += get_relative_difficulty(0, skills_diff.agility, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.charisma, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.defense, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.dexterity, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.hacking, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.intelligence, 0, 100)
            diff += get_relative_difficulty(0, skills_diff.strength, 0, 100)
            return diff
        case "sourceFile":
            return ns.singularity.getOwnedSourceFiles().some(sfl => sfl.n === requirement.sourceFile) ? 0 : max_difficulty
        case "numPeopleKilled":
            return ns.getPlayer().numPeopleKilled >= requirement.numPeopleKilled ? 0 : (requirement.numPeopleKilled - ns.getPlayer().numPeopleKilled) * 0.05
        case "karma":
            return (ns.heart.break() / requirement.karma) >= 1 ? 0 : Math.log10(Math.abs(requirement.karma - ns.heart.break()))
        case "hacknetCores":
            const core_count = count_hacknet_prop(ns, s => s.cores)
            return core_count >= requirement.hacknetCores ? 0 : (requirement.hacknetCores - core_count) * 0.2
        case "hacknetLevels":
            const level_count = count_hacknet_prop(ns, s => s.level)
            return level_count >= requirement.hacknetLevels ? 0 : (requirement.hacknetLevels - level_count) * 0.001
        case "hacknetRAM":
            const ram_total = count_hacknet_prop(ns, s => s.ram)
            return ram_total >= requirement.hacknetRAM ? 0 : Math.log2(requirement.hacknetRAM - ram_total) * 0.1
        case "bitNodeN":
        case "bladeburnerRank":
        case "jobTitle":
        case "numInfiltrations":

        default:
            return 10
    }
}

export function get_faction_requirements_info(ns: NS, data: RequirementData, requirements: PlayerRequirement[]): string {
    const missing_reqs = requirements.filter(req => !player_meets_faction_req(ns, data, req))
    return missing_reqs.map(req => faction_req_to_string(ns, req)).join(", ")
}

export class MyFaction {
    name: FactionName
    invite_requirements: PlayerRequirement[]
    enemies: string[]
    favor: number
    reputation: number
    work_types: FactionWorkType[]
    is_available: boolean
    joined_them: boolean
    augments: string[]

    constructor(name: FactionName) {
        this.name = name
        this.invite_requirements = []
        this.enemies = []
        this.favor = 0
        this.reputation = 0
        this.work_types = []
        this.is_available = false
        this.joined_them = false
        this.augments = []
    }

    set_requirements(reqs: PlayerRequirement[]): MyFaction {
        this.invite_requirements = reqs
        return this
    }

    set_enemies(val: string[]): MyFaction {
        this.enemies = val
        return this
    }

    set_favor(val: number): MyFaction {
        this.favor = val
        return this
    }

    set_reputation(val: number): MyFaction {
        this.reputation = val
        return this
    }

    set_work_types(val: FactionWorkType[]): MyFaction {
        this.work_types = val
        return this
    }

    set_status(joined_them: boolean, is_available: boolean): MyFaction {
        this.is_available = is_available || joined_them // joined factions are also available
        this.joined_them = joined_them
        return this
    }

    set_status_by_lists(invites: string[], joined: string[]): MyFaction {
        this.set_status(joined.includes(this.name), invites.includes(this.name))
        return this
    }

    set_augments(val: string[]): MyFaction {
        this.augments = val
        return this
    }

    /**
     * @param {any} Object parsed from JSON
     * @return {MyFaction} The parsed faction.
     */
    static fromJSON(obj: any): MyFaction {
        const s = new MyFaction(obj.name!)
        s.set_requirements(obj.requirements)
        s.set_enemies(obj.enemies)
        s.set_favor(obj.favor)
        s.set_reputation(obj.reputation)
        s.set_work_types(obj.work_types)
        s.set_status(obj.joined_them, obj.is_available)
        s.set_augments(obj.augments)
        return s
    }
}

/**
 * Writes all factions to file.
 * @param {NS} ns
 * @param {MyFaction[]} factions
 */
export function write_faction_file(ns: NS, factions: MyFaction[]) {
    const faction_data = JSON.stringify(factions)
    ns.write(FACTION_FILE, faction_data, "w")
}

/**
 * Reads all factions from file.
 * @param {NS} ns
 * @return {MyFaction[]} Loaded factions.
 */
export function read_faction_file(ns: NS): MyFaction[] {
    const faction_data = ns.read(FACTION_FILE)
    const factions = JSON.parse(faction_data).map((o: any) => MyFaction.fromJSON(o))
    return factions
}
