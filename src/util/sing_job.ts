import { NS, ScriptArg } from '@ns'
import { error_t } from '/lib/log'
import { get_updated_augment_list, get_updated_job_list } from '/util/update_data'
import { MyJob } from '/lib/sing_jobs'
import { MyAugment } from '/lib/sing_augs'

async function player_must_focus(ns: NS) {
    const augments = await get_updated_augment_list(ns, true)
    const focus_augment = augments.find(a => a.name === MyAugment.unique_aug_no_focus().name)
    const must_focus = !(focus_augment?.owned ?? false)
    return must_focus
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

    function printHelpAndExit(): never {
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
        printHelpAndExit()
    } else if (companies.length < 1) {
        error_t(ns, "%s: Es wurde kein Unternehmen angegeben, bei dem gearbeitet werden soll.", ns.getScriptName())
        printHelpAndExit()
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
    const must_focus = player_must_focus(ns)

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

        if (!ns.singularity.applyToCompany(company_name, next_job.info.field)) {
            error_t(ns, "%s: Bewerbung für Job '%s' wurde von %s unerwartet abgelehnt!", ns.getScriptName(), next_job.info.name, company_name)
            ns.exit()
        }

        current_job = next_job
        ns.singularity.workForCompany(company_name)

        if (OPTS.ladder === true) {
            ns.tprintf("%s: Karriereleiter für %s:", ns.getScriptName(), company_name)
            all_jobs.forEach(job => {
                const prefix = job.info.name === current_job.info.name ? "-> " : "   "
                ns.tprintf("%s%-24s (%s)", prefix, job.to_string({ omit_company: true, omit_field: true }))
            })
        }

        // get next job, that is not available yet
        const target_job = current_job.find_next_job(all_jobs)

        // target reputation for next job or final target
        const target_reputation = target_job == null ? final_target_reputation : target_job.info.requiredReputation
        const target_skills = (target_job == null ? current_job : target_job).info.requiredSkills

        // 1. Try to reach enough reputation
        while(current_reputation < target_reputation) {

        }
    }

    //ns.singularity.workForCompany(company_name, false)

}