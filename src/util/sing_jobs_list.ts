import { MyJob, write_jobs_file } from "lib/sing_jobs"

/** @param {NS} ns */
export async function main(ns: NS) {
  // collect all augmentations of these factions
  const jobs: MyJob[] = []

  Object.values(ns.enums.CompanyName).forEach(company_name => {
    const available_positions = ns.singularity.getCompanyPositions(company_name)
    const company_jobs: MyJob[] = []
    available_positions.forEach(job_name => {
      const job_info = ns.singularity.getCompanyPositionInfo(company_name, job_name)
      company_jobs.push(new MyJob(company_name, job_info))
    })
    company_jobs.forEach(j => j.find_order_in_company(company_jobs))
    jobs.push(...company_jobs)
  })

  write_jobs_file(ns, jobs)
}