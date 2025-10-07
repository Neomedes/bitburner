import { CompanyName, CompanyPositionInfo, Skills } from "@ns"

const JOBS_FILE = "/data/jobs_data.txt"

export class MyJob {
  company: CompanyName
  info: CompanyPositionInfo
  order_in_company: number | undefined

  constructor(company: CompanyName, info: CompanyPositionInfo) {
    this.company = company
    this.info = info
  }

  /**
   * Finds the job that comes next after this.
   * @param all_jobs_of_company All jobs of the company.
   * @returns
   * The job that comes next.
   * 
   * If no such job exists, `null` will be returned.
   * 
   * If `all_jobs_of_company` did not contain the next job, `undefined` will be returned.
   */
  find_next_job(all_jobs_of_company: MyJob[]): MyJob | null | undefined {
    if (this.info.nextPosition === null) return null
    return all_jobs_of_company.find(j => j.info.field === this.info.field && j.info.name === this.info.nextPosition)
  }

  /**
   * Finds the job that comes before this one.
   * @param all_jobs_of_company All jobs of the company.
   * @returns
   * The job that comes before this one.
   * 
   * If `all_jobs_of_company` did not contain the next job, `undefined` will be returned.
   */
  find_previous_job(all_jobs_of_company: MyJob[]): MyJob | undefined {
    return all_jobs_of_company.find(j => j.info.field === this.info.field && j.info.nextPosition === this.info.name)
  }

  /**
   * Determines the order of this job (and thereby for all previous jobs).
   * @param all_jobs_of_company All jobs of the company.
   * @returns This job.
   */
  find_order_in_company(all_jobs_of_company: MyJob[]): MyJob {
    if (this.order_in_company !== undefined) return this

    const previous_job = this.find_previous_job(all_jobs_of_company)
    if (previous_job === undefined) {
      this.order_in_company = 0
    } else {
      previous_job.find_order_in_company(all_jobs_of_company)
      this.order_in_company = previous_job.order_in_company! + 1
    }
    return this
  }

  get_skills_description(): string {
    return Object.entries(this.info.requiredSkills)
      .filter(([skill, value]) => value > 0)
      .map(([skill, value]) => {
        return `${skill}: ${value}`
      }).join(", ")
  }

  to_string({ omit_company = false, omit_field = false, show_details = false, ns = undefined }: { omit_company?: boolean, omit_field?: boolean, show_details?: boolean, ns?: NS, } = {}): string {
    const company = omit_company === true ? "" : `${this.company}: `
    const field = omit_field === true ? "" : ` (${this.info.field})`
    const details = show_details === true ? `` : ""
    return `${company}${this.info.name}${field}${details}`
  }

  toString(): string {
    return this.to_string()
  }

  is_available(current_reputation: number, current_skills: Skills): boolean {
    if (this.info.requiredReputation > current_reputation) return false
    if (this.info.requiredSkills.agility > current_skills.agility) return false
    if (this.info.requiredSkills.charisma > current_skills.charisma) return false
    if (this.info.requiredSkills.defense > current_skills.defense) return false
    if (this.info.requiredSkills.dexterity > current_skills.dexterity) return false
    if (this.info.requiredSkills.hacking > current_skills.hacking) return false
    if (this.info.requiredSkills.intelligence > current_skills.intelligence) return false
    if (this.info.requiredSkills.strength > current_skills.strength) return false
    return true
  }

  static fromJSON(o: any): MyJob {
    return new MyJob(o.company as CompanyName, o.info as CompanyPositionInfo)
  }
}

/**
 * Writes all known jobs to file.
 * @param {NS} ns
 * @param {MyJob[]} jobs
 */
export function write_jobs_file(ns: NS, jobs: MyJob[]): void {
  const server_data = JSON.stringify(jobs)
  ns.write(JOBS_FILE, server_data, "w")
}

/**
 * Reads all jobs from file.
 * @param {NS} ns
 * @return {MyJob[]} Loaded jobs.
 */
export function read_jobs_file(ns: NS): MyJob[] {
  const jobs_data = ns.read(JOBS_FILE)
  const jobs = JSON.parse(jobs_data).map((o: any) => MyJob.fromJSON(o))
  return jobs
}