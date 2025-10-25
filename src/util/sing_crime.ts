import { CrimeType, NS } from '@ns'
import { error_t } from '/lib/log'
import { get_updated_player, player_must_focus } from '/util/update_data'

function get_best_crime(ns: NS): CrimeType {
    const threshold = 0.8
    if (ns.singularity.getCrimeChance(ns.enums.CrimeType.homicide) >= threshold) return ns.enums.CrimeType.homicide
    if (ns.singularity.getCrimeChance(ns.enums.CrimeType.mug) >= threshold) return ns.enums.CrimeType.mug
    return ns.enums.CrimeType.shoplift
}

export async function main(ns: NS): Promise<void> {
    const OPTS = ns.flags([
        ['?', false], ['help', false], // study until charisma level reached
    ])
    OPTS.help = OPTS.help === true || OPTS['?'] === true

    function print_help_and_exit() {
        ns.tprintf("Skript zur Arbeit als Krimineller")
        ns.tprintf("Aufruf: %s [OPTIONEN]", ns.getScriptName())
        ns.tprintf(" ")
        ns.tprintf("Folgende Optionen stehen zur Verfügung:")
        ns.tprintf("%-16s - %s", "--help / -?", "Diese Hilfe ausgeben")
        ns.exit()
    }

    if (OPTS.help) {
        print_help_and_exit()
    }

    let current_crime: CrimeType | undefined = undefined
    for (; ;) {
        const best_crime = get_best_crime(ns)
        if (best_crime !== current_crime) {
            ns.singularity.commitCrime(best_crime, await player_must_focus(ns))
            current_crime = best_crime
        }
        if (best_crime === ns.enums.CrimeType.homicide) break
        await ns.sleep(10000)
    }
}