import { randomMiliseconds,waitForTabLoad,waitForElement,uniqueByKey  } from './modules/utils.js';
import { emptyState, getState, setState } from './modules/state.js';
import { jobBoardsReaders} from './modules/jobboardsreaders.js';

async function saveConfig(config){
  const state = await getState()
  state.config = config
  console.log("save_config state",state)
  await setState(state)
}

async function clean(){
  const state = await getState()
  state.running = false
  state.jobs = []
  await setState(state)
}

function extractJobs(inputJobs, config) {
  let filteredJobs = []
  for (const inputJob of inputJobs) {
    for (const reader of jobBoardsReaders) {
      const job = reader.url(inputJob, config)
      if(job) filteredJobs.push(job)
    }
  }
  return filteredJobs;//uniqueByKey(filteredJobs, 'url');
}

async function add(jobs){
  const state = await getState()
  if(state.running) return
  state.running = false
  const unique = uniqueByKey(jobs, 'url')
  state.jobs.push(...unique);
  await setState(state);
}

async function update(jobs){
  const state = await getState()
  if(state.running) return
  state.running = false;
  const extracted =  extractJobs(jobs, undefined)
  const unique = uniqueByKey(extracted, 'url')
  state.jobs = unique
  await setState(state);
}

async function process(sendResponse){
  const state = await getState()
  state.running = true
  await setState(state);
  for (let i = 0; i < state.jobs.length; i++) {
    if (!state.running) break;
    try {

      const [tab] = await chrome.tabs.query({active: true,currentWindow: true});
      await chrome.tabs.update(tab.id, {url: state.jobs[i].url});

      state.jobs[i].header =  ''
      state.jobs[i].description =  ''
      state.jobs[i].error = ''

      await waitForTabLoad(tab.id);
      await waitForElement(tab.id, "body");
      const extra_time_out = randomMiliseconds(state.config.duration.min, state.config.duration.max)
      await new Promise(resolve => setTimeout(resolve, extra_time_out));
      let toExecute = () => {return {header:"", description:""}}

      for (const reader of jobBoardsReaders) {
        if (state.jobs[i].source == reader.source) toExecute = reader.body
      }

      const [res] = await chrome.scripting.executeScript({target: { tabId:tab.id} , func:toExecute})

      state.jobs[i].header =  res.result.header
      state.jobs[i].description =  res.result.description

    } catch (error) {
      state.jobs[i].error = error.message
    }
    await setState(state);
  }
  
  state.running = false
  await setState(state);
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {  
  if (message.action === "save_config") await saveConfig(message.config)
  if (message.action === "clean") await clean()
  if (message.action === "update") await update(message.jobs)
  if (message.action === "add") await add(message.jobs)
  if (message.action === "process") await process(sendResponse)
  if (message.action === "get_state") {
    const state = await getState()
    await sendResponse(state)
  }
  if (message.action === "extract_jobs") {
    const extracted = await extractJobs(message.jobs, message.config);
    await sendResponse(extracted);
  }

});