export function waitForTabLoad(tabId) {
  return new Promise(resolve => {

    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 1500);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

export async function waitForElement(tabId, selector, timeout = 15000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {

    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel) => !!document.querySelector(sel),
      args: [selector]
    });

    if (res.result) return true;

    await new Promise(r => setTimeout(r, 500));
  }

  return false;
}

export function randomMiliseconds(minimum, maximum) {
  return Math.floor(minimum + (Math.random() * (maximum - minimum)))
}

export function uniqueByKey(array, key){
  return Array.from(new Map(array.map(x => [x[key], x])).values());
}

export function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n");
}