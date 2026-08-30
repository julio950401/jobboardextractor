import { randomMiliseconds,waitForTabLoad,waitForElement,uniqueByKey  } from './modules/utils.js';
import { emptyState, getState, setState } from './modules/state.js';
import { jobBoardsReaders} from './modules/jobboardsreaders.js';

async function getCurrentTab(){
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab
}
async function autoScroll(tab) {
  let same = 0
  let previous = 0
  for (let i = 0; i < 100; i++) {
    const [res] = await chrome.scripting.executeScript({target: { tabId:tab.id} , func:() => {
      const contenedor = document.querySelector('#workspace');
      contenedor.scrollTop = contenedor.scrollHeight;
      return contenedor.scrollHeight
    }});
    if (res.result == previous) same +=1
    else same=0
    previous = res.result;
    if (same>2) break;

    const toWait = randomMiliseconds(400, 1400)
    await new Promise(resolve => setTimeout(resolve, toWait));
  }
}
function filterJobs(inputJobs, config) {
  let filteredJobs = []
  for (const inputJob of inputJobs) {
    for (const reader of jobBoardsReaders) {
      const job = reader.url(inputJob, config)
      console.log("filterJobs job", job)
      if(job) filteredJobs.push(job)
    }
  }
  console.log("filterJobs inputJobs", inputJobs)
  console.log("filterJobs filteredJobs", filteredJobs)
  return filteredJobs;
}
async function findjobsInTab(tab){
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const anchors = document.querySelectorAll("a[href]");
      if (!anchors || anchors.length === 0) return [];
      return Array.from(anchors)
      .map(a => ({url: a.href, header: a.innerText.trim()}))
      .filter(Boolean);
    }
  });
  const inputs = results?.[0]?.result ?? []
  const state = await getState()
  const outputs = await filterJobs(inputs, state.config);

  return outputs
}

async function saveConfig(config){
  const state = await getState()
  state.config = config
  await setState(state)
}
async function clean(){
  const state = await getState()
  state.running = false
  state.jobs = []
  await setState(state)
}
async function add(){
  const state = await getState()
  if(state.running) return
  state.running = false

  const tab = await getCurrentTab();
  const jobs = await findjobsInTab(tab);

  const unique = uniqueByKey(jobs, 'url')
  state.jobs.push(...unique);
  await setState(state);
}
async function update(jobs){
  const state = await getState()
  if(state.running) return
  state.running = false;

  for (const job of jobs) {
    if (!job.header?.trim()) {
      const foundJob = state.jobs.find(({ url }) => url === job.url);
      if (foundJob?.header?.trim()) job.header = foundJob.header;
    }
  }
 
  const extracted = filterJobs(jobs, state.config)
  const unique = uniqueByKey(extracted, 'url')
  state.jobs = unique
  await setState(state);
}
async function openurls(){
  const state = await getState()
  state.running = true
  await setState(state);
  for (const job of state.jobs) {
    if (!state.running) break;
    try {

      const [tab] = await chrome.tabs.query({active: true,currentWindow: true});
      await chrome.tabs.update(tab.id, {url: job.url});

      job.header =  ''
      job.description =  ''
      job.error = ''

      await waitForTabLoad(tab.id);
      await waitForElement(tab.id, "body");
      const extra_time_out = randomMiliseconds(state.config.duration.min, state.config.duration.max)
      await new Promise(resolve => setTimeout(resolve, extra_time_out));
      let toExecute = () => {return {header:"", description:""}}

      for (const reader of jobBoardsReaders) {
        if (job.source == reader.source) toExecute = reader.body
      }

      const [res] = await chrome.scripting.executeScript({target: { tabId:tab.id} , func:toExecute})

      job.header =  res.result.header
      job.description =  res.result.description

    } catch (error) {
      job.error = error.message
    }
    await setState(state);
  }
  
  state.running = false
  await setState(state);
}
async function scan(){
  let state = await getState()
  state.running = true
  
  for (const page of state.config.pages) {
    for (const line of state.config.lines) {
      state.currentline = line
      await setState(state);
      const keywords = line.replace(" ", "%20")
      const url = page.search.replace("@keywords", keywords)
      const tab = await getCurrentTab();
      await chrome.tabs.update(tab.id, {url: url});
      await waitForTabLoad(tab.id);
      await waitForElement(tab.id, "body");
      await autoScroll(tab);
      const jobs = await findjobsInTab(tab);
      state.jobs.push(...jobs);
      await setState(state);
    }
  }

  state = await getState()
  state.currentline = ""
  state.running = false
  const unique = uniqueByKey(state.jobs, 'url')
  state.jobs = unique
  await setState(state)

  if(state.jobs.length > 50) await openurls()
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {  
  if (message.action === "save_config") await saveConfig(message.config)
  if (message.action === "clean") await clean()
  if (message.action === "update") await update(message.jobs)
  if (message.action === "add") await add()
  if (message.action === "openurls") await openurls()
  if (message.action === "get_state") {
    const state = await getState()
    await sendResponse(state)
  }
  if (message.action === "scan") await scan()

});