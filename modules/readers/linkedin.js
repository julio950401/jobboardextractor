import { newJob } from '../state.js';
import { normalizeText } from '../utils.js';

const SOURCE = 'linkedin'

function bodyReader(){
    const header = document.querySelector('main > div > div> div > div')?.innerText || '';
    const description = document.querySelector('.jobs-description__container')?.innerText || '';
    return {header, description}
}

function urlReader(job, config) {
    const regex = /https:\/\/www\.linkedin\.com\/jobs\/view\/\d+/;
    const match = job.url.match(regex);
    
     if (!match) return undefined
     if (!job.header) return newJob(match[0], SOURCE, '') 
          
    const header = normalizeText(job.header)
    const or      =  config.header.or.some(k => header.includes(normalizeText(k))) 
        || config.header.or.length==0;
    const and     =  config.header.and.every(k => header.includes(normalizeText(k)))
        || config.header.and.length==0;
    const and_not = !config.header.and_not.some(k => header.includes(normalizeText(k)))
        || config.header.and_not.length==0;
    if (or && and && and_not) return newJob(match[0], SOURCE, job.header)

    return undefined
}

export const linkedinReader = {source: SOURCE, body: bodyReader, url: urlReader}