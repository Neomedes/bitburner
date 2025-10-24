import { NS } from '@ns'
import { error_t } from '/lib/log'
import { MyJob } from '/lib/sing_jobs'
import { get_updated_job_list, player_must_focus } from '/util/update_data'

interface WorkUntilTargetConfig {
    target_value: number,
    get_current_value: () => number,
    on_start: (() => boolean) | undefined,
}

async function work_until_target(ns: NS, config: WorkUntilTargetConfig): Promise<boolean> {
    const first_wait_threshold = 3_600 // 1h
    const second_wait_threshold = 5 // 5s
    const malus_for_gain_increase = 0.95 // wait only 95% of the time after the first_wait_threshold

    let began_training = false
    let current_value = config.get_current_value()
    while (current_value < config.target_value) {
        if (!began_training && config.on_start !== undefined) {
            const on_start_successful = config.on_start()
            if (!on_start_successful) {
                return false
            }
            began_training = true
        }
        const previous_reputation = current_value
        await ns.sleep(10000)
        current_value = config.get_current_value()

        if (current_value >= config.target_value) {
            break;
        }
        const gain_in_10s = current_value - previous_reputation
        const diff2target = config.target_value - current_value
        const seconds2wait = diff2target / gain_in_10s * 10

        if (seconds2wait > first_wait_threshold) {
            // when waiting longer than an hour, try to take the gain increase during this time into account
            await ns.sleep((first_wait_threshold + (seconds2wait - first_wait_threshold) * malus_for_gain_increase) * 1000)
        } else if (seconds2wait > second_wait_threshold) {
            // when waiting less than an hour but more than 5 seconds until reaching the target just wait that long
            await ns.sleep(seconds2wait * 1000)
        }
        // when waiting less than 5 seconds the 10 second gain calculation gets us over the threshold.

        current_value = config.get_current_value()
    }
    return true
}

/**
 * Determines which job should and may be worked on next. If there are no jobs or the current job is
 * already the best one available, `undefined` will be returned.
 * @param available_jobs All jobs currently available.
 * @param current_job The job that is currently worked on. Can be `null`.
 * @returns The best available job that is better than the current one or `undefined` if no such job exists in the given array.
 */
function get_next_available_job(available_jobs: MyJob[], current_job: MyJob | null): MyJob | undefined {
    let job = current_job ?? available_jobs[0] // if no current job 
    let next_job = job.find_next_job(available_jobs)
    if (next_job == null) return current_job !== null ? undefined : job

    while (next_job != null) {
        job = next_job
        next_job = job.find_next_job(available_jobs)
    }
    return job
}

export async function main(ns: NS): Promise<void> {
    const OPTS = ns.flags([
        ["ladder", false], // show the steps on the carreer ladder
        ["jobs", false], // just print the available jobs and exit
        ['?', false], ['help', false], // print help
    ])
    OPTS.help = OPTS.help || OPTS["?"]

    function print_help_and_exit(): never {
        ns.tprintf(" ")
        ns.tprintf("Dieses Skript soll die Arbeit mit Jobs erleichtern.")
        ns.tprintf(" ")
        ns.tprintf("Aufruf: %s [OPTIONEN] COMPANY", ns.getScriptName())
        ns.tprintf("Hilfe : %s [-?|--help]", ns.getScriptName())
        ns.tprintf(" ")
        ns.tprintf("OPTIONEN:")
        ns.tprintf("%-16s - %s", "--ladder", "Gibt vor der Arbeit in einer neuen Position die Karriereleiter des Unternehmens aus.")
        ns.tprintf("%-16s - %s", "--jobs", "Gibt nur die einzelnen Jobs des Unternehmens aus und beendet sich dann ohne eine Arbeit zu starten.")
        ns.exit()
    }

    const companies = OPTS["_"] as string[]

    if (OPTS.help === true) {
        print_help_and_exit()
    } else if (companies.length < 1) {
        error_t(ns, "%s: Es wurde kein Unternehmen angegeben, bei dem gearbeitet werden soll.", ns.getScriptName())
        print_help_and_exit()
    }

    const company_query = companies[0].toLowerCase()
    const valid_names = Object.values(ns.enums.CompanyName)
    const company_name = valid_names.find(name => name.toLowerCase() === company_query)
    if (company_name === undefined) {
        error_t(ns, "%s: Es gibt kein Unternehmen mit dem Namen %s.", ns.getScriptName(), ns.args[0].toString())
        ns.exit()
    }

    const all_jobs = (await get_updated_job_list(ns))
        .filter(job => job.company === company_name)
        .filter(job => job.info.field === "IT")

    if (all_jobs.length < 1) {
        error_t(ns, "%s: Keine Jobs in der IT von %s gefunden! Bitte das Skript erweitern.", ns.getScriptName(), company_name)
        ns.exit();
    }

    // Sort by order in company
    all_jobs.sort((a, b) => a.order_in_company! - b.order_in_company!)

    if (OPTS.jobs === true) {
        all_jobs.forEach(job => {
            ns.tprintf("-".repeat(80))
            ns.tprintf("%-16s: %s", "Field", job.info.field)
            ns.tprintf("%-16s: %s", "Name", job.info.name)
            ns.tprintf("%-16s: %s", "Next job", job.info.nextPosition)
            ns.tprintf("%-16s: %d", "Reputation", job.info.requiredReputation)
            ns.tprintf("%-16s: %s", "Skills", job.get_skills_description())
            ns.tprintf("%-16s: %d", "Salary", job.info.salary)
        })
        ns.exit()
    }

    const final_target_reputation = 400_000
    const must_focus = await player_must_focus(ns)

    let work_needed = true
    let current_job: MyJob | null = null
    while (work_needed) {
        // search for the best job available and wait for the next one
        let current_reputation = ns.singularity.getCompanyRep(company_name)
        // are we finished already
        if (current_reputation >= final_target_reputation) {
            work_needed = false
            break
        }

        const available_jobs = all_jobs.filter(j => j.is_available(current_reputation, ns.getPlayer().skills))
        // the best job is the one where no better exists or is not available (yet)
        const next_job = get_next_available_job(available_jobs, current_job)
        if (next_job === undefined) {
            error_t(ns, "%s: Keine Position zum Arbeiten bei %s gefunden!", ns.getScriptName(), company_name)
            ns.exit()
        }

        ns.singularity.applyToCompany(company_name, next_job.info.field)

        current_job = next_job

        if (OPTS.ladder === true) {
            ns.tprintf("%s:", ns.getScriptName())
            ns.tprintf(" ")
            ns.tprintf("Karriereleiter für %s:", company_name)
            all_jobs.forEach(job => {
                const prefix = job.info.name === current_job!.info.name ? "-> " : "   "
                ns.tprintf("%s%-24s", prefix, job.to_string({ omit_company: true, omit_field: true }))
            })
        }

        // get next job, that is not available yet
        const target_job = current_job.find_next_job(all_jobs)

        // target reputation for next job or final target
        const target_reputation = target_job == null ? final_target_reputation : target_job.info.requiredReputation
        const target_skills = (target_job == null ? current_job : target_job).info.requiredSkills

        // 1. Try to reach enough reputation
        const reputation_work_config: WorkUntilTargetConfig = {
            target_value: target_reputation,
            get_current_value: () => ns.singularity.getCompanyRep(company_name),
            on_start: () => {
                if (OPTS.ladder === true) ns.tprintf("Arbeite bis zu einer Reputation von %s", ns.formatNumber(target_reputation))
                return ns.singularity.workForCompany(company_name, must_focus)
            }
        }
        let work_successful = await work_until_target(ns, reputation_work_config)
        if (!work_successful) {
            error_t(ns, "%s: Abbruch: Konnte nicht für %s arbeiten.", ns.getScriptName(), company_name)
            return
        }

        // 2. Train charisma
        const charisma_work_config: WorkUntilTargetConfig = {
            target_value: target_skills.charisma,
            get_current_value: () => ns.getPlayer().skills.charisma,
            on_start: () => {
                if (OPTS.ladder === true) ns.tprintf("Lerne Management zum Erreichen von %d Charisma", target_skills.charisma)
                if (ns.getPlayer().city !== ns.enums.CityName.Sector12) {
                    const travelled = ns.singularity.travelToCity(ns.enums.CityName.Sector12)
                    if (!travelled) {
                        error_t(ns, "%s: Abbruch: Konnte nicht nach Sektor 12 fliegen.", ns.getScriptName())
                        return false
                    }
                }
                const studying = ns.singularity.universityCourse("Rothman University", ns.enums.UniversityClassType.management)
                if (!studying) {
                    error_t(ns, "%s: Abbruch: Konnte kein Management an der Rothman studieren.", ns.getScriptName())
                    return false
                }
                return true
            }
        }
        work_successful = await work_until_target(ns, charisma_work_config)
        if (!work_successful) {
            return
        }
    }

    //ns.singularity.workForCompany(company_name, false)

}