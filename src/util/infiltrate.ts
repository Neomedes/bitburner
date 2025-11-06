import { CityName, InfiltrationLocation, NS } from '@ns'
import { f_unique } from '/lib/functions'
import { OutputTable, OutputTableColumnType } from '/lib/tables'

export async function main(ns: NS): Promise<void> {
    const locations = ns.infiltration.getPossibleLocations()
    const all_infiltrations: InfiltrationLocation[] = locations.map(loc => ns.infiltration.getInfiltration(loc.name))

    const ot = new OutputTable(ns, [
        { property: "city", title: "Stadt" },
        { property: "location", title: "Location" },
        { property: "clearance", title: "Level", type: OutputTableColumnType.Integer },
        { property: "security", title: "Sicherheit", type: OutputTableColumnType.Integer },
        { property: "difficulty", title: "Schwierigkeit", type: OutputTableColumnType.Integer },
        { property: "reward_money", title: "Geld", type: OutputTableColumnType.Currency },
        { property: "reward_rep", title: "Rep", type: OutputTableColumnType.Number },
        { property: "reward_soa", title: "SoA", type: OutputTableColumnType.Number },
    ])

    const data = all_infiltrations.toSorted((a, b) => {
        const sort_difficulty = a.difficulty - b.difficulty
        if (sort_difficulty !== 0) return sort_difficulty
        const sort_clearance = a.maxClearanceLevel - b.maxClearanceLevel
        if (sort_clearance !== 0) return sort_clearance
        const sort_security = a.startingSecurityLevel - b.startingSecurityLevel
        if (sort_security !== 0) return sort_security
        const sort_reward_money = b.reward.sellCash - a.reward.sellCash
        if (sort_reward_money !== 0) return sort_reward_money
        const sort_reward_rep = b.reward.tradeRep - a.reward.tradeRep
        if (sort_reward_rep !== 0) return sort_reward_rep
        const sort_reward_soa = b.reward.SoARep - a.reward.SoARep
        return sort_reward_soa
    }).map(i => {
        return {
            city: i.location.city,
            location: i.location.name,
            clearance: i.maxClearanceLevel,
            security: i.startingSecurityLevel,
            difficulty: i.difficulty,
            reward_money: i.reward.sellCash,
            reward_rep: i.reward.tradeRep,
            reward_soa: i.reward.SoARep,
        }
    }).forEach(d => ot.line(d))

    ot.flush()
}