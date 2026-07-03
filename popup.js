function getElement(name){
  return document.getElementById(name)
}

function findjobsInInput(){
  return getElement("jobs").value
    .split(/\r?\n/)
    .map(x => ({url: x.trim(), header: ""}))
    .filter(x => x.url !== "")
}

async function findjobsInTab(){
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return [];

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

  const state = await chrome.runtime.sendMessage({action: "get_state"});

  const outputs = []
  for (const input of inputs) {
    const output = await chrome.runtime.sendMessage({
      action: "extract_jobs", 
      jobs: [input], 
      config: state.config
    });
    if(output) outputs.push(...output)
  }
  await chrome.runtime.sendMessage({action: "add", jobs: outputs});
}

async function refresh(state){

  const orEl = getElement("or")
  orEl.value = state.config.header.or.join(", ")
  const andEl = getElement("and")
  andEl.value = state.config.header.and.join(", ")
  const and_notEl = getElement("and_not")
  and_notEl.value = state.config.header.and_not.join(", ")

  const totalEl = getElement("total")
  totalEl.innerHTML = "TOTAL LINKS: "+ state.jobs.length

  const jobsEl = getElement("jobs")
  const logEl  = getElement("log")
  jobsEl.value = ""
  logEl.value  = ""

  for (let i = 0; i < state.jobs.length; i++) {
    const job = state.jobs[i]
    jobsEl.value += "\n"+job.url
    if (job.description.length>0) logEl.value += "\n" + job.url
  }

  const statusEl = getElement("status")
  const lastEl = getElement("last")
  lastEl.value = ""
    
  const processed = state.jobs.filter(x=> x.header.length>0)

  statusEl.innerHTML = "PROCESS: STOPPED"
  if (state.running){
    statusEl.innerHTML = `PROCESS: RUNNING ${processed.length}/${state.jobs.length}`
    logEl.scrollTop = logEl.scrollHeight;
  }

  if (processed.length>0){
    const last = processed[processed.length-1]
    lastEl.value = last.header+ "\n\n" + last.description
  } 
}
async function onLoad(){
  const state = await chrome.runtime.sendMessage({action: "get_state"});
  await refresh(state)
}
async function saveConfig(){
  const split = (str) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);
  config ={
    duration:{
      min:Number(getElement("minimum").value), 
      max:Number(getElement("maximum").value)
    }
    , header: {
      or: split(getElement("or").value), 
      and: split(getElement("and").value), 
      and_not: split(getElement("and_not").value)
    }
  }
  console.log("save_config config",config)
  await chrome.runtime.sendMessage({action: "save_config", config });
}
async function clean(){
  await saveConfig();
  await chrome.runtime.sendMessage({action: "clean"});
}
async function add(){
  await saveConfig();
  await findjobsInTab();
}
async function edit(){
  const jobs = await findjobsInInput()
  await chrome.runtime.sendMessage({action: "update", jobs: jobs });
}
async function run(){
  const jobs = await findjobsInInput()
  await chrome.runtime.sendMessage({action: "update", jobs: jobs });
  await chrome.runtime.sendMessage({action: "process"});
}
async function download(){
  const state = await chrome.runtime.sendMessage({action: "get_state"});
  const json = JSON.stringify(state.jobs, null, 2);
  const blob = new Blob([json], {type: "application/json"});
  const objUrl = URL.createObjectURL(blob);
  await chrome.downloads.download({url: objUrl, filename: "jobs.json"});
}

window.onload = async () => { onLoad()};
chrome.runtime.onMessage.addListener(async (result) => {await refresh(result.state)});
getElement("save_config").addEventListener("click", async () => {await saveConfig();});
getElement("clean").addEventListener("click", async () => {await clean();});
getElement("add").addEventListener("click", async () => {await add();}); 
getElement("edit").addEventListener("click", async () => {await edit();});
getElement("run").addEventListener("click", async () => {await run()});
getElement("download").addEventListener("click", async () => await download());