function getElement(name){
  return document.getElementById(name)
}

function findLinesInInput(){
  return getElement("jobs").value
    .split(/\r?\n/)
    .map(x => ({url: x.trim(), header: ""}))
    .filter(x => x.url !== "")
}

async function refresh(state){

  const orEl = getElement("or")
  orEl.value = state.config.header.or.join(", ")
  const andEl = getElement("and")
  andEl.value = state.config.header.and.join(", ")
  const and_notEl = getElement("and_not")
  and_notEl.value = state.config.header.and_not.join(", ")
  const linesEl = getElement("lines")
  linesEl.value = state.config.lines.join("\n")

  const totalEl = getElement("total")
  totalEl.innerHTML = "TOTAL LINKS: "+ state.jobs.length

  const jobsEl = getElement("jobs")
  const logEl  = getElement("log")
  jobsEl.value = ""
  logEl.value  = ""

  for (const job of state.jobs) {
    jobsEl.value += "\n"+job.url
    if (job.description.length>0) logEl.value += "\n" + job.url
  }

  const statusEl = getElement("status")
  const lastEl = getElement("last")
  lastEl.value = ""
    
  const processed = state.jobs.filter(x=> x.description.length>0)

  statusEl.innerHTML = "STOPPED"
  if (state.running){
    if (!state.currentline){
      statusEl.innerHTML = `RUNNING (${processed.length}/${state.jobs.length})`
      logEl.scrollTop = logEl.scrollHeight;
    }
    else{
       statusEl.innerHTML = `RUNNING LINE (${state.currentline})`
    }
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
  const prefiltersplit = (str) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);

  const linessplit = getElement("lines").value.split('\n').map(s => s.trim()).filter(s => s.length > 0);

  config = {
    duration: {
      min:Number(getElement("minimum").value), 
      max:Number(getElement("maximum").value)
    }
    , header: {
      or: prefiltersplit(getElement("or").value), 
      and: prefiltersplit(getElement("and").value), 
      and_not: prefiltersplit(getElement("and_not").value)
    }
    ,lines: linessplit
    ,pages: [
      {
        name:"linkedin",
        search:"https://www.linkedin.com/jobs/search-results/?keywords=@keywords&origin=SEMANTIC_SEARCH_LANDING_PAGE&geoId=91000011"
      }
    ]
  }
  await chrome.runtime.sendMessage({action: "save_config", config });
}
async function clean(){
  await saveConfig();
  await chrome.runtime.sendMessage({action: "clean"});
}
async function add(){
  await saveConfig();
  await chrome.runtime.sendMessage({action: "add"});
}
async function scan(){
  await clean();
  await chrome.runtime.sendMessage({action: "scan"});
}
async function update(){
  const jobs = await findLinesInInput()
  await chrome.runtime.sendMessage({action: "update", jobs: jobs });
}
async function openurls(){
  await update()
  await chrome.runtime.sendMessage({action: "openurls"});
}
async function download(){
  const state = await chrome.runtime.sendMessage({action: "get_state"});
  const blob = new Blob([JSON.stringify(state.jobs, null, 2)], {type: "application/json"});
  const objUrl = URL.createObjectURL(blob);
  await chrome.downloads.download({url: objUrl, filename: "jobs.json"});
}

window.onload = async () => { onLoad()};
chrome.runtime.onMessage.addListener(async (result) => {await refresh(result.state)});
getElement("save_config").addEventListener("click", async () => {await saveConfig();});
getElement("clean").addEventListener("click", async () => {await clean();}); 
getElement("add").addEventListener("click", async () => {await add();}); 
getElement("edit").addEventListener("click", async () => {await update();});
getElement("scan").addEventListener("click", async () => {await scan();});
getElement("openurls").addEventListener("click", async () => {await openurls()});
getElement("download").addEventListener("click", async () => await download());