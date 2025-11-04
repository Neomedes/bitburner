import { FactionName, FactionWorkType, NS } from '@ns'
import { error_t, success_t } from '/lib/log'
import { MyJob } from '/lib/sing_jobs'
import { get_updated_faction_list, get_updated_job_list, player_must_focus } from '/util/update_data'
import { MyFaction } from '/lib/factions'

function get_best_work_type(ns: NS, faction: FactionName): FactionWorkType {
    const available_work_types = ns.singularity.getFactionWorkTypes(faction)
    if (available_work_types.includes(ns.enums.FactionWorkType.hacking)) return ns.enums.FactionWorkType.hacking
    if (available_work_types.includes(ns.enums.FactionWorkType.field)) return ns.enums.FactionWorkType.field
    return ns.enums.FactionWorkType.security
}

function is_faction(ns: NS, name: string): name is FactionName {
    return Object.values(ns.enums.FactionName).map(v => v.toString()).includes(name)
}

function get_current_reputation(all_factions: MyFaction[], faction_name: FactionName): number {
    return all_factions.find(f => f.name === faction_name)!.reputation
}

export async function main(ns: NS): Promise<void> {
    const OPTS = ns.flags([
        ['?', false], ['help', false], // print help
    ])
    OPTS.help = OPTS.help || OPTS["?"]

    function print_help_and_exit(): never {
        ns.tprintf(" ")
        ns.tprintf("Dieses Skript soll die Arbeit für Factions erleichtern.")
        ns.tprintf(" ")
        ns.tprintf("Aufruf: %s FACTION1 [THRESHOLD1 [FACTION2 [THRESHOLD2...]]]", ns.getScriptName())
        ns.tprintf("Hilfe : %s [-?|--help]", ns.getScriptName())
        ns.tprintf(" ")
        ns.tprintf("Lässt den Spieler so lange für eine Faction arbeiten, bis das zugheörige Threshold erreicht ist.")
        ns.tprintf("Anschließend wird mit der nächsten Faction (und ggf. dem nächsten Threshold) fortgefahren,")
        ns.tprintf("bis alles abgearbeitet ist. Anschließend wird das Skript beendet.")
        ns.exit()
    }

    const factions_and_thresholds = [...(OPTS["_"] as string[])]

    if (OPTS.help === true) {
        print_help_and_exit()
    } else if (factions_and_thresholds.length < 1) {
        error_t(ns, "Es wurde keine Faction angegeben, bei der gearbeitet werden soll.")
        print_help_and_exit()
    }

    let all_factions = await get_updated_faction_list(ns, true)
    const with_focus = await player_must_focus(ns)

    while (factions_and_thresholds.length > 0) {
        const faction_name = factions_and_thresholds.shift()!
        const target_reputation = parseInt(factions_and_thresholds.shift() ?? "0") // 0 means "do not wait"
        if (!is_faction(ns, faction_name)) {
            error_t(ns, "Faction '%s' ist nicht bekannt.", faction_name)
            continue
        }

        // test if initial reputation is already above the target
        if (get_current_reputation(all_factions, faction_name) >= target_reputation) continue

        const work_type = get_best_work_type(ns, faction_name)
        const working = ns.singularity.workForFaction(faction_name, work_type, with_focus)
        if (working) {
            if (target_reputation > 0) { success_t(ns, "Arbeite für %s bis zu einer Reputation von %s", faction_name, ns.formatNumber(target_reputation)) }
            else { success_t(ns, "Arbeite bis auf Widerruf für %s", faction_name) }
        } else {
            error_t(ns, "Konnte Arbeit für %s nicht beginnen.", faction_name)
            continue
        }
        // wait until a target reputation is met
        async function reputation_target_unmet(faction_name: FactionName): Promise<boolean> {
            all_factions = await get_updated_faction_list(ns, false)
            return get_current_reputation(all_factions, faction_name) < target_reputation
        }
        while (await reputation_target_unmet(faction_name)) {
            await ns.sleep(10_000)
        }
    }
}