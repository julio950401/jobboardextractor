import { newJob } from '../state.js';
import { normalizeText } from '../utils.js';

const SOURCE = 'linkedin'

function bodyReader(){
    const section = document.querySelector('section[aria-label="Contenido principal"]');
    const root = section?.firstElementChild ?.firstElementChild?.firstElementChild;
    const header = root?.children[1]?.innerText ?? "";
    const description = root?.children[2]?.children[2]?.innerText ?? "";
    return {header, description}
}

function urlReader(job, config) {
    const regex = /https:\/\/www\.linkedin\.com\/jobs\/view\/\d+/;
    const match = job.url.match(regex);
    
    if (!match) return undefined
    if (!config) return newJob(match[0], SOURCE)
    
    console.log("config",config)
    if (config) {
        const header = normalizeText(job.header)
        const or      =  config.header.or.some(k => header.includes(normalizeText(k))) 
            || config.header.or.length==0;
        const and     =  config.header.and.every(k => header.includes(normalizeText(k)))
            || config.header.and.length==0;
        const and_not = !config.header.and_not.some(k => header.includes(normalizeText(k)))
            || config.header.and_not.length==0;
        if (or && and && and_not) return newJob(match[0], SOURCE)
        //return newJob(match[0], SOURCE)
    }

    return undefined
}

export const linkedinReader = {source: SOURCE, body: bodyReader, url: urlReader}