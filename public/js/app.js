const PAGE_FILES = [
    "home",
    "inventory",
    "lists",
    "player",
    "tools",
    "pets",
    "characters",
    "world",
    "collections",
    "other",
    "raw",
    "grid"
];

async function loadPageFragments() {
    const mount = document.getElementById("pageMount");

    const fragments = await Promise.all(
        PAGE_FILES.map(async page => {
            const response = await fetch(`/pages/${page}.html`, { cache: "no-cache" });

            if (!response.ok) {
                throw new Error(`Failed to load page: ${page}.html (${response.status})`);
            }

            return response.text();
        })
    );

    mount.innerHTML = fragments.join("\n");
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadPageFragments();

        const KNOWN_IDS = {};
            const KNOWN_IDS_READY = fetch('/known-ids.json', {cache: 'no-cache'})
                .then(r => {
                    if (!r.ok) throw new Error(`Failed to load known-ids.json (${r.status})`);
                    return r.json()
                })
                .then(data => {
                    Object.assign(KNOWN_IDS, data);
                    return KNOWN_IDS
                })
                .catch(err => {
                    console.error(err);
                    setStatus('Failed to load known-ids.json', 'danger');
                    throw err
                });

            function nameOf(id) {
                return KNOWN_IDS[String(id)] || 'Unknown item'
            }

            const $ = id => document.getElementById(id);
            let idLookupTarget = null, idLookupFilter = null, idLookupAfter = null;

            function openIdLookup(target, opts = {}) {
                idLookupTarget = target || null;
                idLookupFilter = opts.filter || null;
                idLookupAfter = opts.after || null;
                $('idLookupTitle').textContent = opts.title || 'Find Item / ID';
                $('idLookupSearch').value = target?.value || '';
                $('idLookupModal').classList.add('open');
                renderIdLookupResults();
                setTimeout(() => $('idLookupSearch').focus(), 0)
            }

            function lookupEntries() {
                let rows = Object.entries(KNOWN_IDS);
                if (idLookupFilter) rows = rows.filter(([id, name]) => idLookupFilter(id, name));
                return rows
            }

            function renderIdLookupResults() {
                const q = $('idLookupSearch').value.trim().toLowerCase();
                let rows = lookupEntries();
                if (q) rows = rows.filter(([id, n]) => id.includes(q) || String(n).toLowerCase().includes(q));
                rows = rows.sort((a, b) => a[1].localeCompare(b[1]) || Number(a[0]) - Number(b[0])).slice(0, 150);
                $('idLookupResults').innerHTML = rows.length ? rows.map(([id, n]) => `<button class="lookup-result" data-pick-id="${esc(id)}"><strong>${esc(n)}</strong><div class="lookup-id">${esc(id)}</div></button>`).join('') : '<div class="muted" style="padding:12px">No matching IDs found.</div>';
                $('idLookupResults').querySelectorAll('[data-pick-id]').forEach(b => b.onclick = () => pickLookupId(b.dataset.pickId))
            }

            function pickLookupId(id) {
                if (idLookupTarget) {
                    idLookupTarget.value = id;
                    idLookupTarget.dispatchEvent(new Event('input', {bubbles: true}));
                    idLookupTarget.dispatchEvent(new Event('change', {bubbles: true}))
                }
                const cb = idLookupAfter;
                closeIdLookup();
                if (cb) cb(Number(id), nameOf(id))
            }

            function closeIdLookup() {
                $('idLookupModal').classList.remove('open');
                idLookupTarget = null;
                idLookupFilter = null;
                idLookupAfter = null
            }

            function pathFromEncoded(el, attr) {
                try {
                    return JSON.parse(decodeURIComponent(el.getAttribute(attr) || ''))
                } catch {
                    return []
                }
            }

            function looksLikeLookupInput(el) {
                if (!(el instanceof HTMLInputElement) || el.type !== 'number') return false;
                if (el.dataset.lookupId === '1') return true;
                if (el.dataset.k === 'ItemID' || el.dataset.lfield === 'ItemID') return true;
                if (el.hasAttribute('data-sedit')) {
                    const p = pathFromEncoded(el, 'data-sedit'), k = String(p.at(-1) || '');
                    return /id$/i.test(k) || Object.prototype.hasOwnProperty.call(KNOWN_IDS, String(el.value))
                }
                if (el.hasAttribute('data-edit')) {
                    const p = pathFromEncoded(el, 'data-edit'), k = String(p.at(-1) || '');
                    return /id$/i.test(k) || Object.prototype.hasOwnProperty.call(KNOWN_IDS, String(el.value))
                }
                const field = el.closest('.field,.state-field,.row');
                const txt = (field?.querySelector('label,code,.path')?.textContent || '');
                return /(^|\b)(item)?id\b/i.test(txt) || /id$/i.test(txt.trim()) || Object.prototype.hasOwnProperty.call(KNOWN_IDS, String(el.value))
            }

            function enhanceIdLookups(root = document) {
                const inputs = [];
                if (root.matches?.('input[type="number"]')) inputs.push(root);
                root.querySelectorAll?.('input[type="number"]').forEach(x => inputs.push(x));
                inputs.forEach(inp => {
                    if (inp.dataset.lookupEnhanced || !looksLikeLookupInput(inp)) return;
                    inp.dataset.lookupEnhanced = '1';
                    const parent = inp.parentElement;
                    if (parent?.classList.contains('id-lookup-wrap')) return;
                    const wrap = document.createElement('div');
                    wrap.className = 'id-lookup-wrap';
                    parent.insertBefore(wrap, inp);
                    wrap.appendChild(inp);
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'id-lookup-btn';
                    b.textContent = '🔎 Lookup';
                    b.title = 'Search Item ID or name';
                    b.onclick = e => {
                        e.preventDefault();
                        openIdLookup(inp)
                    };
                    wrap.appendChild(b)
                })
            }

            $('idLookupSearch').oninput = renderIdLookupResults;
            $('idLookupClose').onclick = closeIdLookup;
            $('idLookupModal').addEventListener('click', e => {
                if (e.target === $('idLookupModal')) closeIdLookup()
            });
            const idLookupObserver = new MutationObserver(ms => {
                for (const m of ms) m.addedNodes.forEach(n => {
                    if (n.nodeType === 1) enhanceIdLookups(n.matches?.('input') ? n : n)
                })
            });
            idLookupObserver.observe(document.body, {childList: true, subtree: true});

            function esc(value) {
                return String(value ?? '').replace(/[&<>\"']/g, ch => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '\"': '&quot;',
                    "'": '&#39;'
                }[ch]))
            }

            let profile = null;
            const clone = o => JSON.parse(JSON.stringify(o));

            function setStatus(s, c = 'muted') {
                $('status').textContent = s;
                $('status').className = c
            }

            const appShell = document.getElementById('appShell');
            const menuToggle = document.getElementById('menuToggle');

            function setMenuHidden(hidden) {
                appShell.classList.toggle('menu-hidden', hidden);
                menuToggle.textContent = hidden ? '☰ Show Menu' : '☰ Hide Menu';
                menuToggle.title = hidden ? 'Show navigation menu' : 'Hide navigation menu';
                menuToggle.setAttribute('aria-expanded', String(!hidden));
                try {
                    localStorage.setItem('dreamlight-menu-hidden', hidden ? '1' : '0')
                } catch (e) {
                }
            }

            try {
                setMenuHidden(localStorage.getItem('dreamlight-menu-hidden') === '1')
            } catch (e) {
                setMenuHidden(false)
            }
            menuToggle.addEventListener('click', () => setMenuHidden(!appShell.classList.contains('menu-hidden')));

            function nav(id) {
                document.querySelectorAll('.page').forEach(x => x.classList.toggle('active', x.id === id));
                document.querySelectorAll('nav button[data-page]').forEach(b => {
                    const active = b.dataset.page === id;
                    b.classList.toggle('active', active);
                    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current')
                });
                if (profile) render(id)
            }

            document.querySelectorAll('nav button[data-page]').forEach(b => b.onclick = () => nav(b.dataset.page));
            nav(document.querySelector('.page.active')?.id || 'home');
            const PROFILE_AES_KEY_HEX =
                '62357168683873614a38556c444a557a545a5864325467366d626f3857386e35';

            function uint8ArrayToCryptoJsWordArray(bytes) {
                const words = [];

                for (let i = 0; i < bytes.length; i++) {
                    words[i >>> 2] =
                        (words[i >>> 2] || 0) |
                        (bytes[i] << (24 - (i % 4) * 8));
                }

                return CryptoJS.lib.WordArray.create(words, bytes.length);
            }

            function cryptoJsWordArrayToUint8Array(wordArray) {
                const bytes = new Uint8Array(wordArray.sigBytes);
                const words = wordArray.words;

                for (let i = 0; i < wordArray.sigBytes; i++) {
                    bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                }

                return bytes;
            }

            function removeTrailingZeroBytes(bytes) {
                let end = bytes.length;

                while (end > 0 && bytes[end - 1] === 0) {
                    end--;
                }

                return bytes.subarray(0, end);
            }

            function decryptProfileBytes(encryptedBytes) {
                if (!window.CryptoJS) {
                    throw new Error(
                        'CryptoJS could not be loaded. Check your internet connection and reload the page.'
                    );
                }

                if (encryptedBytes.length === 0) {
                    throw new Error('The selected profile file is empty.');
                }

                if (encryptedBytes.length % 16 !== 0) {
                    throw new Error(
                        `Invalid encrypted profile length: ${encryptedBytes.length}. ` +
                        'AES-256-ECB ciphertext must be a multiple of 16 bytes.'
                    );
                }

                const ciphertext = uint8ArrayToCryptoJsWordArray(encryptedBytes);
                const key = CryptoJS.enc.Hex.parse(PROFILE_AES_KEY_HEX);

                const decrypted = CryptoJS.AES.decrypt(
                    { ciphertext },
                    key,
                    {
                        mode: CryptoJS.mode.ECB,
                        padding: CryptoJS.pad.NoPadding
                    }
                );

                return removeTrailingZeroBytes(
                    cryptoJsWordArrayToUint8Array(decrypted)
                );
            }

            async function extractProfileJsonFromZip(zipBytes) {
                if (!window.JSZip) {
                    throw new Error(
                        'JSZip could not be loaded. Check your internet connection and reload the page.'
                    );
                }

                const zip = await JSZip.loadAsync(zipBytes);
                const entries = Object.values(zip.files).filter(entry => !entry.dir);

                const profileEntry =
                    entries.find(entry => entry.name === 'profile') ||
                    entries.find(entry => entry.name === 'profile.json') ||
                    entries.find(entry => entry.name.split('/').pop() === 'profile') ||
                    entries.find(entry => entry.name.split('/').pop() === 'profile.json');

                if (!profileEntry) {
                    throw new Error(
                        'The decrypted archive does not contain a profile or profile.json file.'
                    );
                }

                const profileText = await profileEntry.async('string');

                try {
                    return JSON.parse(profileText);
                } catch (error) {
                    throw new Error(
                        `The decrypted profile is not valid JSON: ${error.message}`
                    );
                }
            }

            async function decryptProfileInBrowser(file) {
                const encryptedBytes = new Uint8Array(await file.arrayBuffer());
                const zipBytes = decryptProfileBytes(encryptedBytes);

                if (
                    zipBytes.length < 4 ||
                    zipBytes[0] !== 0x50 ||
                    zipBytes[1] !== 0x4b
                ) {
                    throw new Error(
                        'Decryption completed, but the result is not a valid ZIP archive. ' +
                        'Make sure you selected the encrypted Dreamlight Valley profile.json file.'
                    );
                }

                return extractProfileJsonFromZip(zipBytes);
            }

            $('loadEncrypted').onclick = () => $('encrypted').click();

            $('encrypted').onchange = async event => {
                const file = event.target.files?.[0];

                if (!file) {
                    return;
                }

                try {
                    setStatus('Decrypting locally in your browser...');

                    profile = await decryptProfileInBrowser(file);

                    await loaded();
                } catch (error) {
                    console.error(error);
                    setStatus('Decrypt failed', 'danger');
                    alert(error.message);
                } finally {
                    event.target.value = '';
                }
            };

            async function loaded() {
                try {
                    await KNOWN_IDS_READY
                } catch (e) {
                    alert('The Item ID database could not be loaded. Check known-ids.json.');
                    return
                }
                $('download').disabled = false;
                setStatus('Encrypted profile decrypted and loaded', 'good');
                render('home');
                sendProfileToGrid()
            }

            function sendProfileToGrid() {
                const f = $('gridFrame');
                if (profile && f?.contentWindow) f.contentWindow.postMessage({
                    type: 'dreamlight-profile-load',
                    profile: clone(profile)
                }, '*')
            }

            window.addEventListener('message', e => {
                const frame = $('gridFrame');
                if (!e.data || e.source !== frame?.contentWindow) return;
                if (e.data.type === 'dreamlight-grid-ready') sendProfileToGrid();
                else if (e.data.type === 'dreamlight-grid-update' && e.data.profile) {
                    profile = e.data.profile;
                    setStatus('Grid changes synchronized', 'good');
                }
            });
        $('gridFrame').addEventListener('load', sendProfileToGrid);
            $('download').onclick = () => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], {type: 'application/json'}));
                a.download = 'output-modified.json';
                a.click();
                URL.revokeObjectURL(a.href)
            };

            function render(id) {
                ({
                    home: renderHome,
                    inventory: renderInventory,
                    lists: renderLists,
                    player: renderPlayer,
                    tools: renderTools,
                    pets: renderPets,
                    characters: renderCharacters,
                    world: renderWorld,
                    collections: renderProgress,
                    other: renderAll,
                    raw: renderRaw
                }[id] || (() => {
                }))()
            }

            function renderHome() {
                const p = profile.Player || {}, w = profile.World || {};
                $('cards').innerHTML = [['Player', p.Name ?? '?'], ['Level', p.Level ?? '?'], ['XP', p.Xp ?? '?'], ['Containers', Object.keys(p.ContainerInventories || {}).length], ['Characters', (w.Characters || []).length], ['Grid groups', Object.keys(w.GridCollection || {}).length], ['Collections', (p.CollectionSets || []).length], ['Achievements', (p.AchievementsData || []).length]].map(x => `<div class=card><div class=muted>${x[0]}</div><h2>${x[1]}</h2></div>`).join('')
            }

            function scalarInput(parent, key, val, onchange) {
                let i;
                if (typeof val === 'boolean') {
                    i = document.createElement('select');
                    i.innerHTML = '<option value=true>true</option><option value=false>false</option>';
                    i.value = String(val)
                } else {
                    i = document.createElement('input');
                    i.value = val ?? '';
                    i.type = typeof val === 'number' ? 'number' : 'text'
                }
                i.onchange = () => {
                    let v = i.value;
                    if (typeof val === 'number') v = Number(v);
                    if (typeof val === 'boolean') v = v === 'true';
                    if (val === null && v === '') v = null;
                    parent[key] = v;
                    onchange && onchange()
                };
                return i
            }

            function scalarTable(root, filter = '', limit = 2000) {
                const box = document.createElement('div');
                box.className = 'tree';
                let n = 0;

                function walk(o, path) {
                    if (n >= limit) return;
                    if (Array.isArray(o)) {
                        o.forEach((v, k) => visit(o, k, v, `${path}[${k}]`))
                    } else if (o && typeof o === 'object') {
                        Object.keys(o).forEach(k => visit(o, k, o[k], path ? `${path}.${k}` : k))
                    }
                }

                function visit(par, k, v, p) {
                    if (v && typeof v === 'object') {
                        walk(v, p);
                        return
                    }
                    const txt = (p + ' ' + String(v)).toLowerCase();
                    if (filter && !txt.includes(filter.toLowerCase())) return;
                    n++;
                    const r = document.createElement('div');
                    r.className = 'row';
                    const a = document.createElement('div');
                    a.className = 'path';
                    a.textContent = p;
                    const b = document.createElement('div');
                    b.appendChild(scalarInput(par, k, v));
                    r.append(a, b);
                    box.appendChild(r)
                }

                walk(root, '');
                if (!n) box.innerHTML = '<p class=muted>No matching editable scalar fields.</p>';
                return box
            }

            function inventoryContainers() {
                const cs = profile?.Player?.ContainerInventories || {};
                const only = $('onlyPlayerContainers').checked;
                return Object.entries(cs).filter(([, c]) => !only || c?.BelongsToPlayer === true);
            }

            function renderInventory() {
                const cs = profile.Player?.ContainerInventories || {}, entries = inventoryContainers(), sel = $('containerSel'),
                    prev = sel.value;
                sel.innerHTML = '';
                entries.forEach(([id, c]) => {
                    const o = document.createElement('option');
                    o.value = id;
                    const parentName = nameOf(c.ParentItemID);
                    o.textContent = `Container ${id} • ${c.Inventory?.length || 0}/${c.Size ?? '?'} • ${c.BelongsToPlayer ? 'Player' : 'World'} • Parent ${parentName} (${c.ParentItemID ?? '?'})`;
                    sel.appendChild(o)
                });
                if (entries.some(([id]) => id === prev)) sel.value = prev;
                if (!sel.options.length) {
                    $('invTable').innerHTML = '<div class="panel muted">No containers match this filter.</div>';
                    return
                }
                const c = cs[sel.value];
                if (!c) return;
                const q = $('invSearch').value.toLowerCase();
                let html = `<div class="panel"><b>Container ${esc(sel.value)}</b> &nbsp; <span class="pill">BelongsToPlayer: ${c.BelongsToPlayer === true ? 'true' : 'false'}</span> &nbsp; Size ${c.Size ?? '?'} &nbsp; Parent ${esc(nameOf(c.ParentItemID))} (${c.ParentItemID ?? '?'})</div>`;
                html += '<table><thead><tr><th>#</th><th>ItemID</th><th>Item Name</th><th>Amount</th><th>State</th><th></th></tr></thead><tbody>';
                (c.Inventory || []).forEach((it, i) => {
                    const itemName = nameOf(it.ItemID);
                    if (q && !String(it.ItemID).includes(q) && !itemName.toLowerCase().includes(q)) return;
                    const st = it.State == null ? 'No State' : (Object.keys(it.State || {}).join(', ') || 'Empty State');
                    html += `<tr><td>${i}</td><td><input data-i=${i} data-k=ItemID type=number value="${it.ItemID}"></td><td><strong data-inv-name="${i}">${esc(itemName)}</strong></td><td><input data-i=${i} data-k=Amount type=number value="${it.Amount}"></td><td><button data-state=${i}>Edit State</button><div class="muted" style="font-size:11px;margin-top:4px">${esc(st)}</div></td><td><button data-del=${i}>Delete</button></td></tr>`
                });
                html += '</tbody></table>';
                $('invTable').innerHTML = html;
                $('invTable').querySelectorAll('input').forEach(x => {
                    if (x.dataset.k === 'ItemID') x.oninput = () => {
                        const n = $('invTable').querySelector(`[data-inv-name=\"${x.dataset.i}\"]`);
                        if (n) n.textContent = nameOf(x.value)
                    };
                    x.onchange = () => {
                        c.Inventory[+x.dataset.i][x.dataset.k] = Number(x.value);
                        renderInventory()
                    }
                });
                $('invTable').querySelectorAll('[data-del]').forEach(x => x.onclick = () => {
                    c.Inventory.splice(+x.dataset.del, 1);
                    renderInventory()
                });
                $('invTable').querySelectorAll('[data-state]').forEach(x => x.onclick = () => openInventoryStateEditor(c, +x.dataset.state));
            }

            $('containerSel').onchange = renderInventory;
            $('invSearch').oninput = renderInventory;
            $('onlyPlayerContainers').onchange = renderInventory;
            $('addInv').onclick = () => {
                const c = profile.Player.ContainerInventories[$('containerSel').value];
                if (!c) return;
                openIdLookup(null, {
                    title: 'Add Inventory Item', after: (id) => {
                        const amount = Number(prompt('Amount:', '1'));
                        c.Inventory.push({ItemID: id, Amount: Number.isFinite(amount) ? amount : 1, State: null});
                        renderInventory()
                    }
                })
            };


            function renderLists() {
                const lists = profile.Player?.ListInventories || {}, sel = $('listSel'), prev = sel.value;
                sel.innerHTML = '';
                Object.entries(lists).forEach(([id, l]) => {
                    const o = document.createElement('option');
                    o.value = id;
                    o.textContent = `List ${id} • ${Object.keys(l?.Inventory || {}).length} items`;
                    sel.appendChild(o)
                });
                if (prev && lists[prev]) sel.value = prev;
                if (!sel.value && sel.options.length) sel.selectedIndex = 0;
                const l = lists[sel.value];
                if (!l) {
                    $('listTable').innerHTML = '<div class="panel muted">No ListInventories found.</div>';
                    return
                }
                const q = $('listSearch').value.trim().toLowerCase();
                let html = `<div class="panel"><b>List ${esc(String(sel.value))}</b> <span class="muted">ID ${esc(String(l.ID ?? sel.value))} • ${Object.keys(l.Inventory || {}).length} entries</span></div><table><thead><tr><th>ItemID</th><th>Item Name</th><th>Amount</th><th>Marker</th><th></th></tr></thead><tbody>`;
                Object.entries(l.Inventory || {}).forEach(([itemId, it]) => {
                    const nm = nameOf(itemId), marker = String(it?.Marker ?? '');
                    if (q && !itemId.toLowerCase().includes(q) && !nm.toLowerCase().includes(q) && !marker.toLowerCase().includes(q)) return;
                    html += `<tr data-list-row="${esc(itemId)}"><td><input data-lid="${esc(itemId)}" data-lfield="ItemID" type="number" value="${esc(itemId)}"></td><td><strong data-list-name="${esc(itemId)}">${esc(nm)}</strong></td><td><input data-lid="${esc(itemId)}" data-lfield="Amount" type="number" value="${Number(it?.Amount ?? 0)}"></td><td><input data-lid="${esc(itemId)}" data-lfield="Marker" value="${esc(marker)}"></td><td><button data-ldel="${esc(itemId)}">Delete</button></td></tr>`
                });
                html += '</tbody></table>';
                $('listTable').innerHTML = html;
                $('listTable').querySelectorAll('[data-lfield="Amount"]').forEach(x => x.onchange = () => {
                    l.Inventory[x.dataset.lid].Amount = Number(x.value);
                    renderLists()
                });
                $('listTable').querySelectorAll('[data-lfield="Marker"]').forEach(x => x.onchange = () => {
                    l.Inventory[x.dataset.lid].Marker = x.value;
                    renderLists()
                });
                $('listTable').querySelectorAll('[data-lfield="ItemID"]').forEach(x => {
                    x.oninput = () => {
                        const n = $('listTable').querySelector(`[data-list-name=\"${x.dataset.lid}\"]`);
                        if (n) n.textContent = nameOf(x.value)
                    };
                    x.onchange = () => {
                        const old = x.dataset.lid, newId = String(Number(x.value));
                        if (!newId || newId === 'NaN') return renderLists();
                        if (newId !== old && Object.prototype.hasOwnProperty.call(l.Inventory, newId)) {
                            alert('That ItemID already exists in this list.');
                            return renderLists()
                        }
                        const val = l.Inventory[old];
                        delete l.Inventory[old];
                        l.Inventory[newId] = val;
                        renderLists()
                    }
                });
                $('listTable').querySelectorAll('[data-ldel]').forEach(x => x.onclick = () => {
                    delete l.Inventory[x.dataset.ldel];
                    renderLists()
                });
            }

            $('listSel').onchange = renderLists;
            $('listSearch').oninput = renderLists;
            $('addListItem').onclick = () => {
                const l = profile.Player?.ListInventories?.[$('listSel').value];
                if (!l) return;
                openIdLookup(null, {
                    title: 'Add List Item', after: (id) => {
                        const key = String(id);
                        if (Object.prototype.hasOwnProperty.call(l.Inventory, key)) {
                            alert('That ItemID already exists in this list.');
                            return
                        }
                        const amount = Number(prompt('Amount:', '1'));
                        const marker = prompt('Marker:', 'ItemMarker_None');
                        l.Inventory[key] = {Amount: Number.isFinite(amount) ? amount : 1, Marker: marker || 'ItemMarker_None'};
                        renderLists()
                    }
                })
            };

            let invStateContainer = null, invStateIndex = -1, invStateDraft = null;
            const cloneState = v => v === undefined ? null : JSON.parse(JSON.stringify(v));

            function openInventoryStateEditor(c, i) {
                invStateContainer = c;
                invStateIndex = i;
                const it = c.Inventory[i];
                invStateDraft = cloneState(it.State);
                $('invStateTitle').textContent = `Edit Inventory State — ${nameOf(it.ItemID)}`;
                $('invStateInfo').textContent = `ItemID ${it.ItemID} • Amount ${it.Amount} • Container ${$('containerSel').value}`;
                $('invStateJson').value = JSON.stringify(invStateDraft, null, 2);
                switchInvStateTab('form', false);
                renderInvStateForm();
                $('invStateModal').classList.add('open')
            }

            function stateType(v) {
                return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
            }

            function stateValueInput(v, path) {
                const t = stateType(v), enc = encodeURIComponent(JSON.stringify(path)), field = String(path.at(-1) ?? ''),
                    parentField = String(path.at(-2) ?? ''),
                    looksLikeId = Number.isFinite(+v) && Object.prototype.hasOwnProperty.call(KNOWN_IDS, String(v));
                let html;
                if (t === 'boolean') html = `<select data-sedit="${enc}" data-stype="boolean"><option value="true" ${v ? 'selected' : ''}>true</option><option value="false" ${!v ? 'selected' : ''}>false</option></select>`; else if (t === 'number') html = `<input data-sedit="${enc}" data-stype="number" type="number" step="any" value="${v}">`; else if (t === 'null') html = `<select data-sedit="${enc}" data-stype="null"><option value="null">null</option><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option><option value="object">object</option><option value="array">array</option></select>`; else html = `<input data-sedit="${enc}" data-stype="string" value="${esc(String(v))}">`;
                if (looksLikeId && Number.isFinite(+v)) {
                    const n = nameOf(v);
                    html += `<div class="muted" data-live-id-name="1" style="font-size:12px;margin-top:4px"><b style="color:#a5d6ff">${esc(n)}</b> <span>— ${esc(String(v))}</span></div>`
                }
                return html
            }

            function getStateAt(path) {
                let x = invStateDraft;
                for (const k of path) x = x[k];
                return x
            }

            function setStateAt(path, v) {
                if (!path.length) {
                    invStateDraft = v;
                    return
                }
                let x = invStateDraft;
                for (let i = 0; i < path.length - 1; i++) x = x[path[i]];
                x[path[path.length - 1]] = v
            }

            function delStateAt(path) {
                if (!path.length) {
                    invStateDraft = null;
                    return
                }
                let x = invStateDraft;
                for (let i = 0; i < path.length - 1; i++) x = x[path[i]];
                Array.isArray(x) ? x.splice(+path.at(-1), 1) : delete x[path.at(-1)]
            }

            function stateNode(v, path, name) {
                const t = stateType(v), enc = encodeURIComponent(JSON.stringify(path));
                if (t === 'object' || t === 'array') {
                    let children = '';
                    Object.entries(v || {}).forEach(([k, val]) => children += stateNode(val, path.concat(Array.isArray(v) ? +k : k), k));
                    return `<details class="state-group" open><summary>${esc(String(name))} <span class="muted">(${t}${t === 'array' ? ', ' + v.length : ''})</span></summary><div class="toolbar" style="margin:7px 0"><button data-sadd="${enc}">Add ${t === 'array' ? 'item' : 'field'}</button>${path.length ? `<button data-sdel="${enc}">Delete</button>` : ''}</div>${children || '<div class="muted">Empty</div>'}</details>`
                }
                return `<div class="state-field"><code>${esc(String(name))}</code><div>${stateValueInput(v, path)}</div><button data-sdel="${enc}">Delete</button></div>`
            }

            function renderInvStateForm() {
                const box = $('invStateForm');
                if (invStateDraft === null) {
                    box.innerHTML = '<div class="panel muted">State is null. Use “Add root field” to create a State object.</div>';
                    bindInvStateForm();
                    return
                }
                box.innerHTML = stateNode(invStateDraft, [], 'State');
                bindInvStateForm()
            }

            function addStateChild(path) {
                if (invStateDraft === null && !path.length) invStateDraft = {};
                let target = path.length ? getStateAt(path) : invStateDraft;
                if (target === null || typeof target !== 'object') {
                    alert('This value cannot contain child fields.');
                    return
                }
                if (Array.isArray(target)) {
                    target.push('');
                    renderInvStateForm();
                    return
                }
                const key = prompt('New field name:');
                if (!key) return;
                if (Object.prototype.hasOwnProperty.call(target, key)) {
                    alert('That field already exists.');
                    return
                }
                const type = (prompt('Type: string, number, boolean, object, array, null', 'object') || 'string').toLowerCase();
                target[key] = type === 'number' ? 0 : type === 'boolean' ? false : type === 'object' ? {} : type === 'array' ? [] : type === 'null' ? null : '';
                renderInvStateForm()
            }

            function bindInvStateForm() {
                $('invStateForm').querySelectorAll('[data-sedit]').forEach(el => {
                    if (el.dataset.stype === 'number') el.oninput = () => {
                        const n = el.parentElement.querySelector('[data-live-id-name]');
                        if (n) n.innerHTML = `<b style=\"color:#a5d6ff\">${esc(nameOf(el.value))}</b> <span>— ${esc(el.value)}</span>`
                    };
                    el.onchange = () => {
                        const path = JSON.parse(decodeURIComponent(el.dataset.sedit)), t = el.dataset.stype;
                        let v = el.value;
                        if (t === 'number') v = Number(v); else if (t === 'boolean') v = v === 'true'; else if (t === 'null') v = v === 'null' ? null : v === 'number' ? 0 : v === 'boolean' ? false : v === 'object' ? {} : v === 'array' ? [] : '';
                        setStateAt(path, v);
                        renderInvStateForm()
                    }
                });
                $('invStateForm').querySelectorAll('[data-sdel]').forEach(b => b.onclick = () => {
                    delStateAt(JSON.parse(decodeURIComponent(b.dataset.sdel)));
                    renderInvStateForm()
                });
                $('invStateForm').querySelectorAll('[data-sadd]').forEach(b => b.onclick = () => addStateChild(JSON.parse(decodeURIComponent(b.dataset.sadd))))
            }

            function switchInvStateTab(which, sync = true) {
                if (which === 'json') {
                    if (sync) $('invStateJson').value = JSON.stringify(invStateDraft, null, 2);
                    $('invStateFormTab').classList.remove('active');
                    $('invStateFormPane').classList.remove('active');
                    $('invStateJsonTab').classList.add('active');
                    $('invStateJsonPane').classList.add('active')
                } else {
                    if (sync && $('invStateJsonPane').classList.contains('active')) {
                        try {
                            invStateDraft = JSON.parse($('invStateJson').value)
                        } catch (e) {
                            alert('Invalid State JSON: ' + e.message);
                            return
                        }
                    }
                    $('invStateJsonTab').classList.remove('active');
                    $('invStateJsonPane').classList.remove('active');
                    $('invStateFormTab').classList.add('active');
                    $('invStateFormPane').classList.add('active');
                    renderInvStateForm()
                }
            }

            $('invStateFormTab').onclick = () => switchInvStateTab('form');
            $('invStateJsonTab').onclick = () => switchInvStateTab('json');
            $('invStateAddRoot').onclick = () => {
                if (invStateDraft === null) invStateDraft = {};
                addStateChild([])
            };
            $('invStateClear').onclick = () => {
                invStateDraft = null;
                renderInvStateForm()
            };
            $('invStateCancel').onclick = () => {
                $('invStateModal').classList.remove('open')
            };
            $('invStateApply').onclick = () => {
                if ($('invStateJsonPane').classList.contains('active')) {
                    try {
                        invStateDraft = JSON.parse($('invStateJson').value)
                    } catch (e) {
                        alert('Invalid State JSON: ' + e.message);
                        return
                    }
                }
                if (!invStateContainer || invStateIndex < 0) return;
                invStateContainer.Inventory[invStateIndex].State = cloneState(invStateDraft);
                $('invStateModal').classList.remove('open');
                renderInventory();
                setStatus('Inventory State updated', 'good')
            };
            $('invStateModal').addEventListener('click', e => {
                if (e.target === $('invStateModal')) $('invStateModal').classList.remove('open')
            });

            function currencyChoices() {
                // Dreamlight Valley currency records in the bundled ID database use the 80xxxxxx range.
                return Object.entries(KNOWN_IDS)
                    .filter(([id]) => /^80\d{6}$/.test(id))
                    .sort((a, b) => a[1].localeCompare(b[1]) || Number(a[0]) - Number(b[0]));
            }

            function addCurrency() {
                const currencies = profile.Player.CurrencyAmounts || (profile.Player.CurrencyAmounts = {});
                const available = currencyChoices().filter(([id]) => !Object.prototype.hasOwnProperty.call(currencies, id));
                if (!available.length) {
                    alert('All known currency IDs are already present in CurrencyAmounts.');
                    return
                }
                const modal = document.createElement('div');
                modal.className = 'modal-bg open';
                const panel = document.createElement('div');
                panel.className = 'modal-card';
                panel.style.width = 'min(560px,92vw)';
                panel.style.maxHeight = '85vh';
                panel.style.overflow = 'auto';
                panel.innerHTML = `<h3>Add Currency</h3><p class="muted">Only IDs in the known 80xxxxxx currency range are shown.</p><div class="row"><div class="path">Currency</div><select id="addCurrencySelect" style="width:100%"></select></div><div class="row"><div class="path">Amount</div><input id="addCurrencyAmount" type="number" step="1" value="0" style="width:100%"></div><div class="toolbar" style="justify-content:flex-end;margin-top:14px"><button id="cancelAddCurrency">Cancel</button><button id="confirmAddCurrency">Add Currency</button></div>`;
                modal.appendChild(panel);
                document.body.appendChild(modal);
                const sel = panel.querySelector('#addCurrencySelect');
                available.forEach(([id, name]) => {
                    const o = document.createElement('option');
                    o.value = id;
                    o.textContent = `${name} — ${id}`;
                    sel.appendChild(o)
                });
                const close = () => modal.remove();
                panel.querySelector('#cancelAddCurrency').onclick = close;
                modal.onclick = e => {
                    if (e.target === modal) close()
                };
                panel.querySelector('#confirmAddCurrency').onclick = () => {
                    const id = sel.value, amount = Number(panel.querySelector('#addCurrencyAmount').value);
                    if (!id) return;
                    if (Object.prototype.hasOwnProperty.call(currencies, id)) {
                        alert('That currency already exists.');
                        return
                    }
                    currencies[id] = Number.isFinite(amount) ? amount : 0;
                    close();
                    renderPlayer();
                    setStatus(`${nameOf(id)} added to CurrencyAmounts`, 'good')
                };
            }

            function renderCurrencyAmounts() {
                const currencies = profile.Player.CurrencyAmounts || {};
                const wrap = document.createElement('div');
                wrap.className = 'tree';
                const entries = Object.entries(currencies);
                if (!entries.length) {
                    wrap.innerHTML = '<p class=muted>No CurrencyAmounts found. Use Add Currency to create one.</p>';
                    return wrap
                }
                entries.forEach(([id, amount]) => {
                    const card = document.createElement('div');
                    card.className = 'state-group';
                    card.style.marginBottom = '10px';
                    const name = nameOf(id);
                    card.innerHTML = `<div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) auto;gap:12px;align-items:center;padding:10px"><div><div class="path">Currency ID</div><div><code>${esc(id)}</code></div><div class="muted" style="margin-top:4px"><b style="color:#a5d6ff">${esc(name)}</b> — ${esc(id)}</div></div><div><div class="path">Amount</div><div class="currency-amount-slot"></div></div><div><button class="currency-delete" title="Remove this currency entry">Delete</button></div></div>`;
                    card.querySelector('.currency-amount-slot').appendChild(scalarInput(currencies, id, amount));
                    card.querySelector('.currency-delete').onclick = () => {
                        if (confirm(`Remove ${name} (${id}) from CurrencyAmounts?`)) {
                            delete currencies[id];
                            renderPlayer();
                            setStatus(`${name} removed from CurrencyAmounts`, 'good')
                        }
                    };
                    wrap.appendChild(card);
                });
                return wrap;
            }

            function renderPlayer() {
                const box = $('playerFields');
                box.innerHTML = '';
                const safe = {
                    Name: profile.Player.Name,
                    Level: profile.Player.Level,
                    Xp: profile.Player.Xp,
                    Mana: profile.Player.Mana,
                    TimePlayedInMinutes: profile.Player.TimePlayedInMinutes,
                    BoardGameRankingPoints: profile.Player.BoardGameRankingPoints,
                    NumberOfBoardGameWins: profile.Player.NumberOfBoardGameWins
                };
                const p = document.createElement('div');
                p.className = 'panel';
                Object.keys(safe).forEach(k => {
                    const r = document.createElement('div');
                    r.className = 'row';
                    r.innerHTML = `<div class=path>Player.${k}</div>`;
                    const b = document.createElement('div');
                    b.appendChild(scalarInput(profile.Player, k, profile.Player[k]));
                    r.appendChild(b);
                    p.appendChild(r)
                });
                box.appendChild(p);
                const cur = document.createElement('div');
                cur.className = 'panel';
                cur.innerHTML = '<div class="toolbar" style="justify-content:space-between"><div><h3 style="margin:0">CurrencyAmounts</h3><p class="muted" style="margin:5px 0 0">Currency IDs are resolved to their related names. Add Currency only lists known IDs in the 80xxxxxx range.</p></div><button id="addCurrencyBtn">Add Currency</button></div>';
                cur.appendChild(renderCurrencyAmounts());
                box.appendChild(cur);
                $('addCurrencyBtn').onclick = addCurrency
            }

            function toolIdFilter(id, name) {
                return /^110\d{6}$/.test(String(id)) || /tool|pickaxe|shovel|watering|fishing|hourglass|camera|phone/i.test(String(name))
            }

            function petIdFilter(id, name) {
                return /^120\d{6}$/.test(String(id)) || /pet|companion|critter/i.test(String(name))
            }

            function addTool() {
                const tools = profile.Player.Tools || (profile.Player.Tools = []);
                openIdLookup(null, {
                    title: 'Add Tool', filter: toolIdFilter, after: (id, name) => {
                        tools.push({ToolItemID: id, CurrentOfType: false});
                        renderTools();
                        setStatus(`${name} added to Player.Tools`, 'good')
                    }
                })
            }

            function renderTools() {
                const host = $('toolsFields'), tools = profile.Player?.Tools || [], q = $('toolsSearch').value || '';
                richRootCards(host, tools, 'Player.Tools', q, renderTools);
                [...host.querySelectorAll(':scope > details.card')].forEach((card, visibleIndex) => {
                    const cards = [...host.querySelectorAll(':scope > details.card')];
                    const summary = card.querySelector('summary');
                    const idInput = card.querySelector('input[type="number"]');
                    if (idInput) {
                        idInput.dataset.lookupId = '1';
                    }
                    const bar = document.createElement('div');
                    bar.className = 'toolbar';
                    bar.style.marginTop = '10px';
                    const del = document.createElement('button');
                    del.className = 'danger';
                    del.textContent = 'Delete Tool';
                    del.onclick = () => {
                        const id = Number(idInput?.value);
                        const idx = tools.findIndex(x => x === tools[Number(summary?.textContent?.match(/Index:\s*(\d+)/)?.[1])]) >= 0 ? Number(summary.textContent.match(/Index:\s*(\d+)/)?.[1]) : tools.findIndex(x => x.ToolItemID === id);
                        if (idx >= 0 && confirm(`Delete ${nameOf(tools[idx]?.ToolItemID)}?`)) {
                            tools.splice(idx, 1);
                            renderTools()
                        }
                    };
                    bar.appendChild(del);
                    card.appendChild(bar);
                });
                enhanceIdLookups(host);
            }

            function addPet() {
                const sec = $('petsSection').value;
                openIdLookup(null, {
                    title: sec === 'AssignedPets' ? 'Assign Pet' : 'Add Pet', filter: petIdFilter, after: (id, name) => {
                        if (sec === 'AssignedPets') {
                            const a = profile.Player.AssignedPets || (profile.Player.AssignedPets = []);
                            if (a.includes(id)) {
                                alert('That pet is already assigned.');
                                return
                            }
                            a.push(id);
                        } else {
                            const pets = profile.Player.Pets || (profile.Player.Pets = []);
                            if (pets.some(x => Number(x?.PetItemID) === id)) {
                                alert('That pet already exists in Player.Pets.');
                                return
                            }
                            pets.push({
                                PetItemID: id,
                                FriendshipLevel: 1,
                                FriendshipXp: 0,
                                LastSelfieDate: null,
                                LastPettedDate: null,
                                GrantedInventorySlots: 0,
                                CustomName: '',
                                PendingHangoutRewards: []
                            });
                        }
                        renderPets();
                        setStatus(`${name} added to Player.${sec}`, 'good');
                    }
                })
            }

            function renderPets() {
                const sec = $('petsSection').value, obj = profile.Player?.[sec] || [], q = $('petsSearch').value || '',
                    host = $('petsFields');
                richRootCards(host, obj, `Player.${sec}`, q, renderPets);
                [...host.querySelectorAll(':scope > details.card')].forEach(card => {
                    const text = card.querySelector('summary')?.textContent || '';
                    const m = text.match(/Index:\s*(\d+)/);
                    if (!m) return;
                    const idx = Number(m[1]);
                    const inputs = card.querySelectorAll('input[type="number"]');
                    inputs.forEach(inp => {
                        if (inp.value && petIdFilter(inp.value, nameOf(inp.value))) inp.dataset.lookupId = '1'
                    });
                    const bar = document.createElement('div');
                    bar.className = 'toolbar';
                    bar.style.marginTop = '10px';
                    const del = document.createElement('button');
                    del.className = 'danger';
                    del.textContent = sec === 'AssignedPets' ? 'Unassign Pet' : 'Delete Pet';
                    del.onclick = () => {
                        const current = profile.Player[sec]?.[idx];
                        const id = sec === 'AssignedPets' ? current : current?.PetItemID;
                        if (confirm(`${del.textContent}: ${nameOf(id)} (${id})?`)) {
                            profile.Player[sec].splice(idx, 1);
                            renderPets()
                        }
                    };
                    bar.appendChild(del);
                    card.appendChild(bar);
                });
                enhanceIdLookups(host);
            }

            $('toolsSearch').oninput = () => profile && renderTools();
            $('addToolBtn').onclick = () => profile && addTool();
            $('petsSection').onchange = () => profile && renderPets();
            $('petsSearch').oninput = () => profile && renderPets();
            $('addPetBtn').onclick = () => profile && addPet();

            function characterIdName(v) {
                if (v === null || v === undefined || v === '') return '';
                const key = String(v);
                return KNOWN_IDS[key] || '';
            }

            function characterValueLooksLikeId(key, value, path) {
                if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) return false;
                const k = String(key || '').toLowerCase();
                const p = String(path || '').toLowerCase();
                return k === 'id' || k.endsWith('id') || k.endsWith('itemid') || k.includes('professionid') || k.includes('skinid') || k.includes('pet') || p.includes('preferreditemstatus');
            }

            function characterTree(obj, path = 'Characters', filter = '') {
                const wrap = document.createElement('div');
                const q = (filter || '').trim().toLowerCase();

                function add(node, key, parent, pth) {
                    const full = pth ? pth + '.' + key : String(key);
                    if (node !== null && typeof node === 'object') {
                        const det = document.createElement('details');
                        det.open = true;
                        const sum = document.createElement('summary');
                        sum.textContent = Array.isArray(node) ? `${key} [${node.length}]` : String(key);
                        det.appendChild(sum);
                        const body = document.createElement('div');
                        body.style.paddingLeft = '14px';
                        det.appendChild(body);
                        Object.entries(node).forEach(([k, v]) => add(v, k, body, full));
                        parent.appendChild(det);
                        return;
                    }
                    const name = characterValueLooksLikeId(key, node, full) ? characterIdName(node) : '';
                    if (q && !(`${full} ${node ?? ''} ${name}`.toLowerCase().includes(q))) return;
                    const row = document.createElement('div');
                    row.className = 'field';
                    const lab = document.createElement('label');
                    lab.textContent = key;
                    row.appendChild(lab);
                    let inp;
                    if (typeof node === 'boolean') {
                        inp = document.createElement('select');
                        ['true', 'false'].forEach(x => {
                            let o = document.createElement('option');
                            o.value = x;
                            o.textContent = x;
                            inp.appendChild(o)
                        });
                        inp.value = String(node)
                    } else {
                        inp = document.createElement('input');
                        inp.type = typeof node === 'number' ? 'number' : 'text';
                        inp.value = node ?? '';
                    }
                    if (characterValueLooksLikeId(key, node, full)) inp.oninput = () => {
                        let n = row.querySelector('[data-character-id-name]');
                        if (!n) {
                            n = document.createElement('div');
                            n.className = 'muted';
                            n.style.marginTop = '3px';
                            n.dataset.characterIdName = '1';
                            row.appendChild(n)
                        }
                        n.textContent = `${characterIdName(inp.value) || 'Unknown ID'} — ${inp.value}`
                    };
                    inp.onchange = () => {
                        let v = inp.value;
                        if (typeof node === 'number') v = Number(v); else if (typeof node === 'boolean') v = v === 'true';
                        setPath(profile, full.replace(/^Characters\./, 'World.Characters.'), v);
                        renderCharacters()
                    };
                    row.appendChild(inp);
                    if (name) {
                        const n = document.createElement('div');
                        n.className = 'muted';
                        n.style.marginTop = '3px';
                        n.dataset.characterIdName = '1';
                        n.textContent = `${name} — ${node}`;
                        row.appendChild(n)
                    }
                    parent.appendChild(row);
                }

                Object.entries(obj || {}).forEach(([k, v]) => add(v, k, wrap, path));
                return wrap;
            }

            function renderCharacters() {
                const host = $('characterFields');
                host.innerHTML = '';
                const chars = profile.World?.Characters || [];
                const q = $('charSearch').value || '';
                chars.forEach((ch, i) => {
                    const id = ch?.Base?.id;
                    const name = characterIdName(id) || 'Unknown Character';
                    const text = (JSON.stringify(ch) + ' ' + id + ' ' + name).toLowerCase();
                    if (q && !text.includes(q.toLowerCase())) return;
                    const group = document.createElement('details');
                    group.open = false;
                    group.className = 'card';
                    const sum = document.createElement('summary');
                    sum.innerHTML = `<strong>${esc(name)}</strong> <span class="muted">Base.id: ${esc(id)}</span>`;
                    group.appendChild(sum);
                    const body = document.createElement('div');
                    body.style.marginTop = '10px';
                    body.appendChild(characterTree(ch, `Characters.${i}`, ''));
                    group.appendChild(body);
                    host.appendChild(group);
                });
                if (!host.children.length) host.innerHTML = '<div class="muted">No matching characters.</div>';
            }

            $('charSearch').oninput = renderCharacters;

            function richIdName(v) {
                if (v === null || v === undefined || v === '') return '';
                return KNOWN_IDS[String(v)] || ''
            }

            function richLooksLikeId(key, value, path) {
                if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) return false;
                const k = String(key || '').toLowerCase(), p = String(path || '').toLowerCase();
                return !!richIdName(value) || k === 'id' || k.endsWith('id') || k.endsWith('itemid') || p.includes('itemid') || p.includes('professionid') || p.includes('skinid') || p.includes('petitemid');
            }

            function richTree(obj, basePath, filter, rerender) {
                const wrap = document.createElement('div'), q = (filter || '').trim().toLowerCase();

                function add(node, key, parent, pth) {
                    const full = pth ? pth + '.' + key : String(key);
                    if (node !== null && typeof node === 'object') {
                        // GroupsCollectionItems is an object whose numeric KEYS are ItemIDs and values are booleans.
                        // Render those keys as editable/searchable ItemID fields instead of hiding them as object labels.
                        if (String(key) === 'GroupsCollectionItems' && !Array.isArray(node)) {
                            const det = document.createElement('details');
                            det.open = true;
                            const sum = document.createElement('summary');
                            sum.textContent = `GroupsCollectionItems (${Object.keys(node).length})`;
                            det.appendChild(sum);
                            const body = document.createElement('div');
                            body.style.paddingLeft = '14px';
                            det.appendChild(body);
                            Object.entries(node).forEach(([itemId, collected]) => {
                                const itemName = richIdName(itemId) || 'Unknown ID';
                                if (q && !(`${full} ${itemId} ${itemName} ${collected}`.toLowerCase().includes(q))) return;
                                const row = document.createElement('div');
                                row.className = 'field';
                                const lab = document.createElement('label');
                                lab.innerHTML = `${esc(itemName)}<div class="muted" style="font-weight:normal;margin-top:4px">Item ID</div>`;
                                row.appendChild(lab);
                                const controls = document.createElement('div');
                                const idInp = document.createElement('input');
                                idInp.type = 'number';
                                idInp.value = itemId;
                                idInp.dataset.lookupId = '1';
                                const name = document.createElement('div');
                                name.className = 'muted';
                                name.dataset.richIdName = '1';
                                name.textContent = `${itemName} — ${itemId}`;
                                idInp.oninput = () => {
                                    name.textContent = `${richIdName(idInp.value) || 'Unknown ID'} — ${idInp.value}`
                                };
                                idInp.onchange = () => {
                                    const newId = String(Number(idInp.value));
                                    if (!newId || newId === 'NaN') {
                                        idInp.value = itemId;
                                        return
                                    }
                                    if (newId !== itemId && Object.prototype.hasOwnProperty.call(node, newId)) {
                                        alert('That ItemID already exists in GroupsCollectionItems.');
                                        idInp.value = itemId;
                                        name.textContent = `${itemName} — ${itemId}`;
                                        return
                                    }
                                    if (newId !== itemId) {
                                        node[newId] = node[itemId];
                                        delete node[itemId];
                                        rerender()
                                    }
                                };
                                controls.appendChild(idInp);
                                controls.appendChild(name);
                                const state = document.createElement('select');
                                ['true', 'false'].forEach(x => {
                                    const o = document.createElement('option');
                                    o.value = x;
                                    o.textContent = x === 'true' ? 'Collected / Unlocked' : 'Not Collected';
                                    state.appendChild(o)
                                });
                                state.value = String(!!collected);
                                state.style.marginTop = '7px';
                                state.onchange = () => {
                                    node[itemId] = state.value === 'true'
                                };
                                controls.appendChild(state);
                                row.appendChild(controls);
                                body.appendChild(row);
                            });
                            parent.appendChild(det);
                            return;
                        }
                        const det = document.createElement('details');
                        det.open = true;
                        const sum = document.createElement('summary');
                        const keyName = /^\d+$/.test(String(key)) ? richIdName(key) : '';
                        sum.innerHTML = `${esc(Array.isArray(node) ? `${key} [${node.length}]` : key)}${keyName ? ` <span class="muted">— ${esc(keyName)}</span>` : ''}`;
                        det.appendChild(sum);
                        const body = document.createElement('div');
                        body.style.paddingLeft = '14px';
                        det.appendChild(body);
                        Object.entries(node).forEach(([k, v]) => add(v, k, body, full));
                        parent.appendChild(det);
                        return;
                    }
                    const name = richLooksLikeId(key, node, full) ? richIdName(node) : '';
                    if (q && !(`${full} ${node ?? ''} ${name}`.toLowerCase().includes(q))) return;
                    const row = document.createElement('div');
                    row.className = 'field';
                    const lab = document.createElement('label');
                    lab.textContent = key;
                    row.appendChild(lab);
                    let inp;
                    if (typeof node === 'boolean') {
                        inp = document.createElement('select');
                        ['true', 'false'].forEach(x => {
                            const o = document.createElement('option');
                            o.value = x;
                            o.textContent = x;
                            inp.appendChild(o)
                        });
                        inp.value = String(node)
                    } else {
                        inp = document.createElement('input');
                        inp.type = typeof node === 'number' ? 'number' : 'text';
                        inp.value = node ?? ''
                    }
                    if (richLooksLikeId(key, node, full)) {
                        inp.dataset.lookupId = '1';
                    }
                    inp.oninput = () => {
                        let n = row.querySelector('[data-rich-id-name]');
                        if (!n) {
                            n = document.createElement('div');
                            n.className = 'muted';
                            n.dataset.richIdName = '1';
                            row.appendChild(n)
                        }
                        n.textContent = `${richIdName(inp.value) || 'Unknown ID'} — ${inp.value}`
                    };
                    inp.onchange = () => {
                        let v = inp.value;
                        if (typeof node === 'number') v = Number(v); else if (typeof node === 'boolean') v = v === 'true';
                        setPath(profile, full, v);
                        rerender()
                    };
                    row.appendChild(inp);
                    if (name) {
                        const n = document.createElement('div');
                        n.className = 'muted';
                        n.dataset.richIdName = '1';
                        n.textContent = `${name} — ${node}`;
                        row.appendChild(n)
                    }
                    parent.appendChild(row);
                }

                Object.entries(obj || {}).forEach(([k, v]) => add(v, k, wrap, basePath));
                return wrap;
            }

            function richRootCards(host, obj, basePath, q, rerender) {
                host.innerHTML = '';
                const entries = Array.isArray(obj) ? obj.map((v, i) => [String(i), v]) : Object.entries(obj || {});
                entries.forEach(([k, v]) => {
                    const ids = [];
                    const scan = x => {
                        if (x && typeof x === 'object') Object.entries(x).forEach(([kk, vv]) => {
                            if (vv !== null && typeof vv === 'object') scan(vv); else if (richLooksLikeId(kk, vv, '')) {
                                const n = richIdName(vv);
                                if (n) ids.push(`${vv} ${n}`)
                            }
                        })
                    };
                    scan(v);
                    const keyName = /^\d+$/.test(k) ? richIdName(k) : '';
                    const hay = (`${k} ${keyName} ${JSON.stringify(v)} ${ids.join(' ')}`).toLowerCase();
                    if (q && !hay.includes(q.toLowerCase())) return;
                    const card = document.createElement('details');
                    card.className = 'card';
                    card.open = false;
                    const primitive = v === null || typeof v !== 'object';
                    const valueName = primitive ? richIdName(v) : '';
                    const displayName = valueName || keyName || k;
                    const sum = document.createElement('summary');
                    sum.innerHTML = `<strong>${esc(displayName)}</strong> <span class="muted">${primitive && valueName ? `ID: ${esc(v)} · Index: ${esc(k)}` : keyName ? `ID: ${esc(k)}` : `${Array.isArray(obj) ? 'Index' : 'Key'}: ${esc(k)}`}</span>`;
                    card.appendChild(sum);
                    const body = document.createElement('div');
                    body.style.marginTop = '10px';
                    if (primitive) {
                        const row = document.createElement('div');
                        row.className = 'field';
                        const lab = document.createElement('label');
                        lab.textContent = Array.isArray(obj) ? 'ID' : k;
                        row.appendChild(lab);
                        const inp = document.createElement('input');
                        inp.type = typeof v === 'number' ? 'number' : 'text';
                        inp.value = v ?? '';
                        if (valueName) inp.dataset.lookupId = '1';
                        inp.oninput = () => {
                            let n = row.querySelector('[data-rich-id-name]');
                            if (!n) {
                                n = document.createElement('div');
                                n.className = 'muted';
                                n.dataset.richIdName = '1';
                                row.appendChild(n)
                            }
                            n.textContent = `${richIdName(inp.value) || 'Unknown ID'} — ${inp.value}`
                        };
                        inp.onchange = () => {
                            let nv = inp.value;
                            if (typeof v === 'number') nv = Number(nv);
                            setPath(profile, `${basePath}.${k}`, nv);
                            rerender()
                        };
                        row.appendChild(inp);
                        if (valueName) {
                            const n = document.createElement('div');
                            n.className = 'muted';
                            n.dataset.richIdName = '1';
                            n.textContent = `${valueName} — ${v}`;
                            row.appendChild(n)
                        }
                        body.appendChild(row);
                    } else body.appendChild(richTree(v, `${basePath}.${k}`, '', rerender));
                    card.appendChild(body);
                    host.appendChild(card)
                });
                if (!host.children.length) host.innerHTML = '<div class="muted">No matching records.</div>';
            }

            function renderWorld() {
                const sec = $('worldSection').value, obj = profile.World?.[sec] ?? {};
                richRootCards($('worldFields'), obj, `World.${sec}`, $('worldSearch').value || '', renderWorld)
            }

            $('worldSection').onchange = renderWorld;
            $('worldSearch').oninput = () => profile && renderWorld();

            function renderProgress() {
                const sec = $('progressSection').value, obj = profile.Player?.[sec] ?? {};
                richRootCards($('progressFields'), obj, `Player.${sec}`, $('progressSearch').value || '', renderProgress)
            }

            $('progressSection').onchange = renderProgress;
            $('progressSearch').oninput = () => profile && renderProgress();

            function renderAll() {
                $('allFields').innerHTML = '';
                $('allFields').appendChild(scalarTable(profile, $('allSearch').value, 4000))
            }

            $('allSearch').oninput = () => profile && renderAll();

            function renderRaw() {
                $('rawText').value = JSON.stringify(profile, null, 2)
            }

            $('formatRaw').onclick = () => {
                try {
                    $('rawText').value = JSON.stringify(JSON.parse($('rawText').value), null, 2)
                } catch (e) {
                    alert(e.message)
                }
            };
            $('applyRaw').onclick = () => {
                try {
                    profile = JSON.parse($('rawText').value);
                    setStatus('Raw JSON applied', 'good')
                } catch (e) {
                    alert(e.message)
                }
            };
    } catch (error) {
        console.error(error);

        const status = document.getElementById("status");
        if (status) {
            status.textContent = `Application startup failed: ${error.message || error}`;
            status.className = "danger";
        }
    }
});

