(function(window, document, chrome) {
    'use strict';

    // --- Config & State ---
    let currentType = localStorage.getItem('type') || 'L';
    if(!['L','S','C','A'].includes(currentType)) currentType = 'L';

    let currentTabId = null;
    let currentTabUrl = '';

    // --- UI Elements ---
    const els = {
        tabs: {
            L: document.getElementById('tab-local'),
            S: document.getElementById('tab-session'),
            C: document.getElementById('tab-cookies'),
            A: document.getElementById('tab-about')
        },
        buttons: document.getElementById('buttons'),
        table: document.getElementById('table'),
        importSection: document.getElementById('import-section'),
        aboutView: document.getElementById('about-view'),
        appVersion: document.getElementById('app-version'),

        jsonModal: document.getElementById('json'),
        jsonCode: document.getElementById('code'),
        jsonTitle: document.getElementById('json-title-text'),

        importText: document.getElementById('import-text'),
        importFile: document.getElementById('import-file'),
        importFileLabel: document.getElementById('import-file-label'),
        fileNameText: document.getElementById('file-name-text'),

        toastContainer: document.getElementById('toast-container'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmTitle: document.getElementById('confirm-title'),
        confirmMsg: document.getElementById('confirm-msg'),
        confirmOk: document.getElementById('confirm-ok'),
        confirmCancel: document.getElementById('confirm-cancel'),

        btn: {
            add: document.getElementById('add'),
            reload: document.getElementById('reload'),
            clear: document.getElementById('clear'),
            copy: document.getElementById('copy'),
            import: document.getElementById('import'),
            download: document.getElementById('download'),
            closeJson: document.getElementById('close-json'),
            cancelImport: document.getElementById('btn-cancel-import'),
            processImport: document.getElementById('btn-process-import')
        }
    };

    // --- Icons ---
    const icons = {
        trash: `<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`,
        eye: `<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`,
        cross: `<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
        // New Clean Empty Icon (Folder Open)
        empty: `<svg xmlns="http://www.w3.org/2000/svg" class="empty-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>`,
        // Restricted Icon (Shield Exclamation)
        restricted: `<svg xmlns="http://www.w3.org/2000/svg" class="empty-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`
    };

    // --- UI HELPERS ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const iconSvg = type === 'success'
            ? `<svg class="icon-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`
            : `<svg class="icon-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;
        toast.innerHTML = `${iconSvg} <span>${message}</span>`;
        els.toastContainer.appendChild(toast);
        setTimeout(() => { toast.classList.add('fading'); toast.addEventListener('animationend', () => toast.remove()); }, 3000);
    }

    let confirmCallback = null;
    function showConfirm(title, message, callback) {
        els.confirmTitle.textContent = title; els.confirmMsg.textContent = message;
        confirmCallback = callback; els.confirmModal.style.display = 'flex';
    }
    function hideConfirm() { els.confirmModal.style.display = 'none'; confirmCallback = null; }
    els.confirmOk.addEventListener('click', () => { if (confirmCallback) confirmCallback(); hideConfirm(); });
    els.confirmCancel.addEventListener('click', hideConfirm);

    // --- Core Logic ---
    function injectedFunction(msg) {
        function getStorage() {
            var obj = {};
            var storage = msg.type === 'L' ? window.localStorage : window.sessionStorage;
            if (!storage) return;
            for (var i in storage) { if (storage.hasOwnProperty(i)) obj[i] = storage.getItem(i); }
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
                } catch(e) { return {error: e.message}; }
                break;
        }
    }

    const CookieManager = {
        getAll: function(callback) {
            chrome.cookies.getAll({ url: currentTabUrl }, function(cookies) {
                let result = {}; cookies.forEach(c => result[c.name] = c.value); callback(result);
            });
        },
        set: function(key, value, oldKey) {
            if (oldKey && oldKey !== key) chrome.cookies.remove({ url: currentTabUrl, name: oldKey });
            chrome.cookies.set({ url: currentTabUrl, name: key, value: value });
            setTimeout(renderTable, 100);
        },
        remove: function(key) { chrome.cookies.remove({ url: currentTabUrl, name: key }, renderTable); },
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
                currentTabUrl = tabs[0].url || '';
                callback();
            }
        });
    }

    function executeAction(action, data = {}, callback) {
        // --- 1. HANDLE RESTRICTED URLS (FIX CONSOLE ERROR) ---
        const isRestricted = currentTabUrl.startsWith('chrome:') ||
            currentTabUrl.startsWith('edge:') ||
            currentTabUrl.startsWith('about:') ||
            currentTabUrl.startsWith('brave:') ||
            currentTabUrl.startsWith('file:'); // File URLs sometimes restricted too

        if (isRestricted) {
            // Cannot run script here. Cookies might work but usually not useful.
            if (callback) callback({ error: 'RESTRICTED_PAGE' });
            return;
        }

        if (currentType === 'C') {
            if (action === 'get') CookieManager.getAll(callback);
            else if (action === 'set') { CookieManager.set(data.key, data.value, data.oldKey); if(callback) callback(); }
            else if (action === 'remove') { CookieManager.remove(data.key); if(callback) callback(); }
            else if (action === 'clear') { CookieManager.clear(); if(callback) callback(); }
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
            }).catch((err) => {
                // Handle injection error quietly
                console.warn("StorageManager: Injection failed (likely restricted frame)", err);
                if (callback) callback({ error: 'INJECTION_FAILED' });
            });
        }
    }

    function updateUIState() {
        Object.keys(els.tabs).forEach(k => els.tabs[k].classList.toggle('active', k === currentType));
        els.importSection.classList.add('hidden');
        if (currentType === 'A') {
            els.aboutView.classList.remove('hidden'); els.buttons.style.display = 'none'; els.table.style.display = 'none';
        } else {
            els.aboutView.classList.add('hidden'); els.buttons.style.display = 'flex'; els.table.style.display = 'block';
            const storageOnlyBtns = document.querySelectorAll('.storage-only');
            storageOnlyBtns.forEach(el => el.style.display = currentType === 'C' ? 'none' : 'flex');
        }
    }

    function renderTable() {
        if (currentType === 'A') return;

        // FIXED: Clear table first to prevent flickering stale data
        els.table.innerHTML = '';

        executeAction('get', {}, function(data) {
            let html = '';

            // --- 2. DEFINITIF STORAGE NAME (FIX BUG TEXT) ---
            let storageName = 'Unknown';
            if (currentType === 'L') storageName = 'Local Storage';
            else if (currentType === 'S') storageName = 'Session Storage';
            else if (currentType === 'C') storageName = 'Cookies';

            // --- 3. HANDLE ERRORS & EMPTY STATE ---
            // Cek apakah halaman restricted
            const isRestricted = data && (data.error === 'RESTRICTED_PAGE' || data.error === 'INJECTION_FAILED');

            if (isRestricted) {
                // HIDE BUTTONS ON RESTRICTED PAGE
                els.buttons.style.display = 'none';

                html = `<div class="empty-state">
                            <div class="empty-icon-wrapper restricted">${icons.restricted}</div>
                            <p>Cannot access data on <br><strong>Browser System Page</strong></p>
                        </div>`;
            }
            else {
                // RESTORE BUTTONS (Jika bukan restricted)
                els.buttons.style.display = 'flex';

                if (!data || Object.keys(data).length === 0) {
                    // Clean Empty State with SVG
                    html = `<div class="empty-state">
                                <div class="empty-icon-wrapper">${icons.empty}</div>
                                <p>No data found in <br><strong>${storageName}</strong></p>
                             </div>`;
                } else {
                    // Render Data Table
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
            }
            els.table.innerHTML = html;
        });
    }

    function showAddRow() {
        if (document.querySelector('.new-row')) { document.querySelector('#new-key').focus(); return; }
        // If empty state exists, remove it first by replacing html
        if (document.querySelector('.empty-state')) {
            els.table.innerHTML = `<table><thead><tr><th style="width: 35%">Key</th><th style="width: 50%">Value</th><th style="width: 15%; text-align:center">Action</th></tr></thead><tbody></tbody></table>`;
        }

        const tbody = els.table.querySelector('tbody');
        if(!tbody) return; // Guard

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
        const newValInput = document.getElementById('new-val');
        newKeyInput.focus();
        newKeyInput.addEventListener('input', function() { this.style.borderColor = ''; });
        const handleEnter = (e) => { if (e.key === 'Enter') saveNewRow(); if (e.key === 'Escape') renderTable(); };
        newKeyInput.addEventListener('keyup', handleEnter);
        newValInput.addEventListener('keyup', handleEnter);
    }

    function saveNewRow() {
        const keyInput = document.getElementById('new-key');
        const valInput = document.getElementById('new-val');
        if (!keyInput || !valInput) return;
        const key = keyInput.value.trim();
        const val = valInput.value;
        if (!key) {
            showToast('Key name cannot be empty!', 'error');
            keyInput.style.borderColor = 'var(--danger)';
            keyInput.focus(); return;
        }
        executeAction('set', {key: key, value: val}, () => { renderTable(); showToast('Item added successfully'); });
    }

    function htmlEscape(str) { return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
    function syntaxHighlight(json) {
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'number';
            if (/^"/.test(match)) { if (/:$/.test(match)) cls = 'key'; else cls = 'string'; }
            else if (/true|false/.test(match)) cls = 'boolean'; else if (/null/.test(match)) cls = 'null';
            return '<span class="' + cls + '">' + htmlEscape(match) + '</span>';
        });
    }
    function parseDeepJSON(str) { try { const o = JSON.parse(str); if (o && typeof o === 'object') return o; } catch(e) {} return str; }

    function toggleImportSection() {
        const isHidden = els.importSection.classList.contains('hidden');
        if (isHidden) { els.importSection.classList.remove('hidden'); els.importText.focus(); } else { els.importSection.classList.add('hidden'); }
    }

    // File Input Logic
    els.importFile.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            els.fileNameText.textContent = this.files[0].name;
            els.importFileLabel.style.borderColor = 'var(--primary)'; els.importFileLabel.style.color = 'var(--primary)';
        } else {
            els.fileNameText.textContent = "Choose File"; els.importFileLabel.style = '';
        }
    });

    function handleProcessImport() {
        const file = els.importFile.files[0];
        const text = els.importText.value.trim();
        const processJSON = (jsonString) => {
            try {
                JSON.parse(jsonString);
                executeAction('import', {json: jsonString}, (res) => {
                    if(res && res.error) { showToast('Import Failed: ' + res.error, 'error'); }
                    else {
                        els.importSection.classList.add('hidden'); renderTable(); showToast('Data imported successfully');
                        // Reset Inputs
                        els.importText.value = ''; els.importFile.value = '';
                        els.fileNameText.textContent = 'Choose File'; els.importFileLabel.style = '';
                    }
                });
            } catch (e) { showToast('Invalid JSON Format', 'error'); }
        };
        if (file) { const reader = new FileReader(); reader.onload = (e) => processJSON(e.target.result); reader.readAsText(file); }
        else if (text) { processJSON(text); } else { showToast('Please paste JSON text or select a file', 'error'); }
    }

    // --- Event Listeners ---
    ['L', 'S', 'C', 'A'].forEach(t => { els.tabs[t].addEventListener('click', () => { currentType = t; localStorage.setItem('type', t); updateUIState(); renderTable(); }); });
    els.btn.reload.addEventListener('click', () => { renderTable(); showToast('Data reloaded'); });
    els.btn.add.addEventListener('click', showAddRow);
    els.btn.clear.addEventListener('click', () => {
        showConfirm('Clear All Data?', `This will delete ALL items in ${currentType === 'L' ? 'Local Storage' : (currentType === 'S' ? 'Session Storage' : 'Cookies')}.`,
            () => { executeAction('clear', {}, () => { renderTable(); showToast('All data cleared'); }); });
    });
    els.btn.copy.addEventListener('click', () => { executeAction('export', {}, (res) => { if(res) { navigator.clipboard.writeText(res); showToast('Copied to clipboard'); } else { showToast('Nothing to copy', 'error'); } }); });
    els.btn.download.addEventListener('click', () => {
        let host = 'data'; try { host = new URL(currentTabUrl).hostname; } catch(e){}
        const dateStr = new Date().toISOString().slice(0,19).replace(/:/g,'-');
        const filename = `${host}-${currentType}-${dateStr}.json`;
        executeAction('export', {}, (res) => {
            if(!res) { showToast('No data to export', 'error'); return; }
            const blob = new Blob([res], {type: 'application/json'}); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100);
            showToast('Export successful');
        });
    });
    els.btn.import.addEventListener('click', toggleImportSection);
    els.btn.cancelImport.addEventListener('click', toggleImportSection);
    els.btn.processImport.addEventListener('click', handleProcessImport);

    els.table.addEventListener('input', (e) => {
        if(e.target.tagName !== 'INPUT' || e.target.closest('.new-row')) return;
        const input = e.target; const tr = input.closest('tr');
        const isValue = input.parentElement.classList.contains('td-value');
        const keyInput = tr.querySelector('.td-nome input');
        if (!isValue && currentType === 'C') return;
        const oldKey = keyInput.dataset.key; const key = keyInput.value; const value = tr.querySelector('.td-value input').value;
        if (!isValue) keyInput.dataset.key = key;
        executeAction('set', {oldKey, key, value});
    });

    els.table.addEventListener('click', (e) => {
        const icon = e.target.closest('.td-icon'); if(!icon) return; const tr = icon.closest('tr');
        if (icon.classList.contains('minus')) {
            const key = tr.querySelector('.td-nome input').value;
            showConfirm('Delete Item?', `Are you sure you want to delete "${key}"?`, () => {
                executeAction('remove', {key}, () => { tr.remove(); if(!els.table.querySelector('tbody tr')) renderTable(); showToast('Item deleted'); });
            });
        } else if (icon.classList.contains('open')) {
            const key = tr.querySelector('.td-nome input').value; let val = tr.querySelector('.td-value input').value;
            els.jsonTitle.textContent = "Value: " + key;
            let json = parseDeepJSON(val); let displayVal = (typeof json === 'object') ? syntaxHighlight(JSON.stringify(json, null, 4)) : htmlEscape(val);
            els.jsonCode.innerHTML = displayVal; els.jsonModal.style.display = 'flex';
        } else if (icon.classList.contains('save-new')) saveNewRow(); else if (icon.classList.contains('cancel-new')) renderTable();
    });

    els.btn.closeJson.addEventListener('click', () => { els.jsonModal.style.display = 'none'; });

    const manifest = chrome.runtime.getManifest(); els.appVersion.textContent = manifest.version;
    getActiveTab(() => { updateUIState(); renderTable(); });

})(window, document, chrome);