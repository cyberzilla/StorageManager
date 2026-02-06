(function(window, document, chrome) {
    'use strict';

    // --- Config & State ---
    let currentType = localStorage.getItem('type') || 'L';
    let currentTabId = null;
    let currentTabUrl = null;

    // --- UI Elements ---
    const els = {
        tabs: {
            L: document.getElementById('tab-local'),
            S: document.getElementById('tab-session'),
            C: document.getElementById('tab-cookies')
        },
        table: document.getElementById('table'),
        // JSON Modal Elements
        jsonModal: document.getElementById('json'),
        jsonCode: document.getElementById('code'),
        jsonTitle: document.getElementById('json-title-text'),
        // Import Accordion Elements
        importSection: document.getElementById('import-section'),
        importText: document.getElementById('import-text'),
        importFile: document.getElementById('import-file'),
        // Buttons
        btn: {
            add: document.getElementById('add'),
            reload: document.getElementById('reload'),
            clear: document.getElementById('clear'),
            copy: document.getElementById('copy'),
            import: document.getElementById('import'), // Toggles accordion
            download: document.getElementById('download'),
            closeJson: document.getElementById('close-json'),
            // Import Actions
            cancelImport: document.getElementById('btn-cancel-import'),
            processImport: document.getElementById('btn-process-import')
        }
    };

    // --- Icons ---
    const icons = {
        trash: `<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`,
        eye: `<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`,
        cross: `<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`
    };

    // --- Injected Logic & Cookie Manager (Sama) ---
    function injectedFunction(msg) {
        function getStorage() {
            var obj = {};
            var storage = msg.type === 'L' ? window.localStorage : window.sessionStorage;
            if (!storage) return;
            for (var i in storage) {
                if (storage.hasOwnProperty(i)) obj[i] = storage.getItem(i);
            }
            return obj;
        }

        var storage = msg.type === 'L' ? window.localStorage : window.sessionStorage;
        if (!storage) return undefined;

        switch (msg.what) {
            case 'get': return getStorage();
            case 'remove': storage.removeItem(msg.key); break;
            case 'set':
                if (msg.oldKey !== undefined && msg.oldKey !== msg.key) storage.removeItem(msg.oldKey);
                storage.setItem(msg.key, msg.value);
                break;
            case 'clear': storage.clear(); break;
            case 'export': return JSON.stringify(getStorage(), null, 4);
            case 'import':
                try {
                    var obj = JSON.parse(msg.json);
                    for (var i in obj) if (obj.hasOwnProperty(i)) storage.setItem(i, obj[i]);
                } catch(e) {}
                break;
        }
    }

    const CookieManager = {
        getAll: function(callback) {
            chrome.cookies.getAll({ url: currentTabUrl }, function(cookies) {
                let result = {};
                cookies.forEach(c => result[c.name] = c.value);
                callback(result);
            });
        },
        set: function(key, value, oldKey) {
            if (oldKey && oldKey !== key) chrome.cookies.remove({ url: currentTabUrl, name: oldKey });
            chrome.cookies.set({ url: currentTabUrl, name: key, value: value });
            setTimeout(renderTable, 100);
        },
        remove: function(key) {
            chrome.cookies.remove({ url: currentTabUrl, name: key }, renderTable);
        },
        clear: function() {
            chrome.cookies.getAll({ url: currentTabUrl }, function(cookies) {
                cookies.forEach(c => chrome.cookies.remove({ url: currentTabUrl, name: c.name }));
                setTimeout(renderTable, 200);
            });
        }
    };

    function getActiveTab(callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs[0]) {
                currentTabId = tabs[0].id;
                currentTabUrl = tabs[0].url;
                callback();
            }
        });
    }

    function executeAction(action, data = {}, callback) {
        if (currentType === 'C') {
            if (action === 'get') CookieManager.getAll(callback);
            else if (action === 'set') CookieManager.set(data.key, data.value, data.oldKey);
            else if (action === 'remove') CookieManager.remove(data.key);
            else if (action === 'clear') CookieManager.clear();
            else if (action === 'export' && callback) CookieManager.getAll((res) => callback(JSON.stringify(res, null, 4)));
        } else {
            const msg = { type: currentType, what: action, ...data };
            chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                func: injectedFunction,
                args: [msg]
            }).then((results) => {
                const res = results && results[0] ? results[0].result : undefined;
                if (callback) callback(res);
            }).catch(console.error);
        }
    }

    // --- Rendering ---
    function updateUIState() {
        Object.keys(els.tabs).forEach(k => {
            els.tabs[k].classList.toggle('active', k === currentType);
        });
        const storageOnlyBtns = document.querySelectorAll('.storage-only');
        storageOnlyBtns.forEach(el => el.style.display = currentType === 'C' ? 'none' : 'flex');

        // Hide import section on tab switch
        els.importSection.classList.add('hidden');
    }

    function renderTable() {
        executeAction('get', {}, function(data) {
            let html = '';
            if (!data || Object.keys(data).length === 0) {
                const typeName = currentType === 'L' ? 'Local Storage' : (currentType === 'S' ? 'Session Storage' : 'Cookies');
                html = `<div class="empty-state" id="empty-msg">No data found in ${typeName}</div>`;
            } else {
                html += `<table>
                        <thead><tr>
                            <th style="width: 35%">Key / Name</th>
                            <th style="width: 50%">Value</th>
                            <th style="width: 15%; text-align:center">Action</th>
                        </tr></thead>
                        <tbody>`;
                for (let key in data) {
                    const safeKey = htmlEscape(key);
                    const safeVal = htmlEscape(data[key]);
                    html += `<tr>
                        <td class="td-nome"><input type="text" value="${safeKey}" data-key="${safeKey}" ${currentType==='C'?'readonly':''}></td>
                        <td class="td-value"><input type="text" value="${safeVal}"></td>
                        <td style="text-align:center; white-space:nowrap;">
                            <span class="td-icon open" title="View Detail">${icons.eye}</span>
                            <span class="td-icon minus" title="Delete">${icons.trash}</span>
                        </td>
                    </tr>`;
                }
                html += `</tbody></table>`;
            }
            els.table.innerHTML = html;
        });
    }

    // --- Inline Add Row ---
    function showAddRow() {
        if (document.querySelector('.new-row')) { document.querySelector('#new-key').focus(); return; }
        const emptyMsg = document.getElementById('empty-msg');
        if (emptyMsg) {
            els.table.innerHTML = `<table><thead><tr><th style="width: 35%">Key</th><th style="width: 50%">Value</th><th style="width: 15%; text-align:center">Action</th></tr></thead><tbody></tbody></table>`;
        }
        const tbody = els.table.querySelector('tbody');
        const tr = document.createElement('tr');
        tr.className = 'new-row';
        tr.innerHTML = `
            <td class="td-nome"><input type="text" id="new-key" placeholder="New Key Name" autocomplete="off"></td>
            <td class="td-value"><input type="text" id="new-val" placeholder="Value" autocomplete="off"></td>
            <td style="text-align:center; white-space:nowrap;">
                <span class="td-icon save-new" title="Save">${icons.check}</span>
                <span class="td-icon cancel-new" title="Cancel">${icons.cross}</span>
            </td>`;
        tbody.insertBefore(tr, tbody.firstChild);
        const newKeyInput = document.getElementById('new-key');
        newKeyInput.focus();
        const handleEnter = (e) => {
            if (e.key === 'Enter') saveNewRow();
            if (e.key === 'Escape') renderTable();
        };
        newKeyInput.addEventListener('keyup', handleEnter);
        document.getElementById('new-val').addEventListener('keyup', handleEnter);
    }

    function saveNewRow() {
        const key = document.getElementById('new-key').value.trim();
        const val = document.getElementById('new-val').value;
        if (!key) return;
        executeAction('set', {key: key, value: val}, renderTable);
    }

    // --- Helpers ---
    function htmlEscape(str) {
        return String(str).replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    function syntaxHighlight(json) {
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) cls = 'key'; else cls = 'string';
            } else if (/true|false/.test(match)) cls = 'boolean'; else if (/null/.test(match)) cls = 'null';
            return '<span class="' + cls + '">' + htmlEscape(match) + '</span>';
        });
    }

    function parseDeepJSON(str) {
        try { const o = JSON.parse(str); if (o && typeof o === 'object') return o; } catch(e) {}
        return str;
    }

    // --- IMPORT LOGIC (Accordion) ---
    function toggleImportSection() {
        const isHidden = els.importSection.classList.contains('hidden');
        if (isHidden) {
            els.importSection.classList.remove('hidden');
            els.importText.focus();
        } else {
            els.importSection.classList.add('hidden');
        }
    }

    function handleProcessImport() {
        const file = els.importFile.files[0];
        const text = els.importText.value.trim();

        const processJSON = (jsonString) => {
            try {
                JSON.parse(jsonString); // Validate
                executeAction('import', {json: jsonString}, () => {
                    els.importSection.classList.add('hidden'); // Close accordion
                    renderTable();
                    els.importText.value = ''; // Reset
                    els.importFile.value = '';
                });
            } catch (e) {
                alert('Invalid JSON Format!\n' + e.message);
            }
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => processJSON(e.target.result);
            reader.readAsText(file);
        } else if (text) {
            processJSON(text);
        } else {
            alert('Please paste JSON text or select a file.');
        }
    }

    // --- Event Listeners ---
    ['L', 'S', 'C'].forEach(t => {
        els.tabs[t].addEventListener('click', () => {
            currentType = t; localStorage.setItem('type', t); updateUIState(); renderTable();
        });
    });

    els.btn.reload.addEventListener('click', renderTable);
    els.btn.add.addEventListener('click', showAddRow);
    els.btn.clear.addEventListener('click', () => { if(confirm('Delete ALL data?')) executeAction('clear', {}, renderTable); });
    els.btn.copy.addEventListener('click', () => { executeAction('export', {}, (res) => { if(res) navigator.clipboard.writeText(res); }); });

    // Download
    els.btn.download.addEventListener('click', () => {
        let host = 'data'; try { host = new URL(currentTabUrl).hostname; } catch(e){}
        const dateStr = new Date().toISOString().slice(0,19).replace(/:/g,'-');
        const filename = `${host}-${currentType}-${dateStr}.json`;
        executeAction('export', {}, (res) => {
            if(!res) return;
            const blob = new Blob([res], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100);
        });
    });

    // Import Events (Accordion)
    els.btn.import.addEventListener('click', toggleImportSection);
    els.btn.cancelImport.addEventListener('click', toggleImportSection);
    els.btn.processImport.addEventListener('click', handleProcessImport);

    // Table Actions
    els.table.addEventListener('input', (e) => {
        if(e.target.tagName !== 'INPUT' || e.target.closest('.new-row')) return;
        const input = e.target;
        const tr = input.closest('tr');
        const isValue = input.parentElement.classList.contains('td-value');
        const keyInput = tr.querySelector('.td-nome input');
        if (!isValue && currentType === 'C') return;
        const oldKey = keyInput.dataset.key;
        const key = keyInput.value;
        const value = tr.querySelector('.td-value input').value;
        if (!isValue) keyInput.dataset.key = key;
        executeAction('set', {oldKey, key, value});
    });

    els.table.addEventListener('click', (e) => {
        const icon = e.target.closest('.td-icon');
        if(!icon) return;
        const tr = icon.closest('tr');
        if (icon.classList.contains('minus')) {
            const key = tr.querySelector('.td-nome input').value;
            if(confirm(`Delete "${key}"?`)) executeAction('remove', {key}, () => { tr.remove(); if(!els.table.querySelector('tbody tr')) renderTable(); });
        } else if (icon.classList.contains('open')) {
            const key = tr.querySelector('.td-nome input').value;
            let val = tr.querySelector('.td-value input').value;

            els.jsonTitle.textContent = "Value: " + key;
            let json = parseDeepJSON(val);
            let displayVal = (typeof json === 'object') ? syntaxHighlight(JSON.stringify(json, null, 4)) : htmlEscape(val);
            els.jsonCode.innerHTML = displayVal;
            els.jsonModal.style.display = 'flex';
        } else if (icon.classList.contains('save-new')) saveNewRow();
        else if (icon.classList.contains('cancel-new')) renderTable();
    });

    els.btn.closeJson.addEventListener('click', () => { els.jsonModal.style.display = 'none'; });

    getActiveTab(() => { updateUIState(); renderTable(); });

})(window, document, chrome);