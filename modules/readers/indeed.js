import { newJob } from '../state.js';

const SOURCE = 'indeed'

function bodyReader(){
    const headerContainer = document.querySelector('.jobsearch-InfoHeaderContainer');
    let header = ""
    if (headerContainer)  header = headerContainer.innerText.trim() //.textContent.trim();

    const descriptionContainer = document.querySelector('.jobsearch-BodyContainer');
    let description = ""
    if (descriptionContainer)  description = descriptionContainer.innerText.trim() //.textContent.trim();
    
    return {header, description}
}

function urlReader(job, config) {
    const patterns = [
        /https:\/\/mx\.indeed\.com\/pagead\/clk\?mo/ , 
        /https:\/\/mx\.indeed\.com\/rc\/clk\?jk/
    ]
    
    for (const pattern of patterns) {
        if (job.url.match(pattern)) return newJob(job.url, SOURCE)
    }

    return undefined
}

export const indeedReader = { source: SOURCE, body: bodyReader, url: urlReader}
