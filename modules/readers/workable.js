import { newJob } from '../state.js';

const SOURCE = 'workable'

function bodyReader(){
    let header = ""
    const title_el = document.querySelector('[class*="jobOverview__job-title"]');
    if (title_el) header += title_el.innerText.trim() 
    const company_el = document.querySelector('[class*="jobOverview__company"]');
    if (company_el) header += "\n"+company_el.innerText.trim() 
    const details_el = document.querySelector('[class*="jobOverview__job-details"]');
    if (details_el) header += "\n"+details_el.innerText.trim() 

    let description = ""
    const description_el = document.querySelector('[class*="jobBreakdown__job-breakdown"]');
    if (description_el) description = description_el.innerText.trim() 

    return {header, description}
}

function urlReader(job, config) {
    const regex =/^https?:\/\/jobs\.workable\.com\/view\/[A-Za-z0-9]+/;
    const match = job.url.match(regex);
    if (match) return newJob(match[0], SOURCE)
    return undefined
}

export const worktableReader = { source: SOURCE, body: bodyReader, url: urlReader}
