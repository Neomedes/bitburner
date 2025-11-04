import { NS } from '@ns'
import { error_t } from '/lib/log'
import { get_updated_player, player_must_focus } from '/util/update_data'

async function check_wait_finished(ns: NS, target_hack_level: number, target_charsima_level: number): Promise<boolean> {
    if (target_hack_level < 1 && target_charsima_level < 1) return false
    const player = await get_updated_player(ns)
    const hack_finished = target_hack_level < 1 || player.skills.hacking >= target_hack_level
    const charisma_finished = target_charsima_level < 1 || player.skills.charisma >= target_charsima_level
    return hack_finished && charisma_finished
}

export async function main(ns: NS): Promise<void> {
    const OPTS = ns.flags([
        ['h', 0], // study until hacking level reached
        ['s', 0], // study until time in seconds passed
        ['c', 0], // study until charisma level reached
        ['?', false], ['help', false], // study until charisma level reached
    ])
    OPTS.help = OPTS.help === true || OPTS['?'] === true
    const charisma_level: number = OPTS.c as number
    const hack_level: number = OPTS.h as number
    const wait_seconds: number = OPTS.s as number

    function print_help_and_exit() {
        ns.tprintf("Skript zum Studieren")
        ns.tprintf("Aufruf: %s [OPTIONEN] UNI Kurs", ns.getScriptName())
        ns.tprintf(" ")
        ns.tprintf("Folgende Optionen stehen zur Verfügung:")
        ns.tprintf("%-16s - %s", "-c [LEVEL]", "Nur bis zu einem Erreichen eines Hack-Levels von [LEVEL] studieren")
        ns.tprintf("%-16s - %s", "-h [LEVEL]", "Nur bis zu einem Erreichen eines Hack-Levels von [LEVEL] studieren")
        ns.tprintf("%-16s - %s", "-s [SEC]", "Nur [SEC] Sekunden studieren")
        ns.tprintf("%-16s - %s", "--help / -?", "Diese Hilfe ausgeben")
        ns.exit()
    }

    if (OPTS.help) {
        print_help_and_exit()
    }

    const university_param = (OPTS['_'] as string[])[0]
    const course_param = (OPTS['_'] as string[])[1]
    const universities: ["Summit University", "Rothman University", "ZB Institute of Technology"] = ["Summit University", "Rothman University", "ZB Institute of Technology"]
    const university = universities.find(u => u.toString() === university_param)
    const course = Object.values(ns.enums.UniversityClassType).find(u => u.toString() === course_param)

    if (university === undefined) {
        error_t(ns, "Es gibt keine Universität mit Namen %s", university_param)
    }

    if (course === undefined) {
        error_t(ns, "Es gibt keinen Kurs mit Namen %s", course_param)
    }

    ns.singularity.universityCourse(university!, course!, await player_must_focus(ns))

    let running = true
    let time = 0
    while (running) {
        running = !(await check_wait_finished(ns, hack_level, charisma_level))
        await ns.sleep(1000)
        time++
        // overwrite running, when time hasn't passed yet (but skill levels might)
        if (wait_seconds > 0 && time < wait_seconds) running = true
    }
}