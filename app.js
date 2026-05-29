/* TALLY — Main Application Controller */
const App = (() => {
    // i18n translations
    const i18n = {
        en: { nav_dashboard: 'Due Tracker', nav_customers: 'Customers', btn_new_entry: 'New Entry', search_placeholder: 'Search name...', kpi_total_due: 'Total Due', dashboard_subtitle_simple: 'Track who owes you and who you owe.', btn_save: 'Save', btn_cancel: 'Cancel' },
        bn: { nav_dashboard: 'বাকিখাতা', nav_customers: 'কাস্টমার', btn_new_entry: 'নতুন এন্ট্রি', search_placeholder: 'নাম খুঁজুন...', kpi_total_due: 'মোট পাওনা', dashboard_subtitle_simple: 'কার কাছে কত পাওনা তার হিসাব রাখুন সহজে।', btn_save: 'সেভ করুন', btn_cancel: 'বাতিল' }
    };
    let lang = 'en';

    function t(key) { return (i18n[lang] && i18n[lang][key]) || (i18n.en[key]) || key; }
    function fmt(n) { return '৳ ' + (parseFloat(n) || 0).toLocaleString('en-IN'); }

    // ---- Routing ----
    let currentPage = 'dashboard';
    function navigateTo(page) {
        currentPage = page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const el = document.getElementById('page-' + page);
        if (el) el.classList.add('active');
        const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (nav) nav.classList.add('active');
        closeSidebar();
        refreshPage(page);
    }

    // ---- Sidebar ----
    function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').style.display = 'block'; }
    function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').style.display = 'none'; }

    // ---- Theme ----
    function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        document.getElementById('themeToggleBtn').innerHTML = isDark ? '<i class="ph ph-moon"></i>' : '<i class="ph ph-sun"></i>';
        localStorage.setItem('tally_theme', isDark ? 'light' : 'dark');
    }

    // ---- Language ----
    function toggleLang() {
        lang = lang === 'en' ? 'bn' : 'en';
        document.getElementById('langToggleBtn').querySelector('.lang-label').textContent = lang === 'en' ? 'EN' : 'বাং';
        document.documentElement.setAttribute('data-lang', lang);
        applyI18n();
        localStorage.setItem('tally_lang', lang);
        refreshPage(currentPage);
    }
    function applyI18n() {
        document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.getAttribute('data-i18n'); if (t(k) !== k) el.textContent = t(k); });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const k = el.getAttribute('data-i18n-placeholder'); if (t(k) !== k) el.placeholder = t(k); });
    }

    // ---- Toast ----
    function toast(msg, type = 'success') {
        const c = document.getElementById('toastContainer');
        const icons = { success: 'ph-check-circle', error: 'ph-warning-circle', info: 'ph-info' };
        const el = document.createElement('div'); el.className = 'toast';
        el.innerHTML = `<span class="toast-icon ${type}"><i class="ph ${icons[type] || icons.info}"></i></span><div class="toast-body"><strong>${msg}</strong></div>`;
        c.appendChild(el);
        setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 3500);
    }

    // ---- Modal ----
    function openModal(title, bodyHTML, onSave, footerExtra, isReadOnly = false) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHTML;
        document.getElementById('modalOverlay').classList.add('active');
        const saveBtn = document.getElementById('modalSaveBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');

        saveBtn.classList.toggle('hidden', isReadOnly);
        cancelBtn.textContent = isReadOnly ? (lang === 'bn' ? 'বন্ধ করুন' : 'Close') : t('btn_cancel');

        const newSave = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(newSave, saveBtn);
        newSave.id = 'modalSaveBtn'; newSave.textContent = t('btn_save');
        if (onSave) newSave.addEventListener('click', onSave);

        const footExtra = document.getElementById('modalFooterExtra');
        if (footExtra) footExtra.innerHTML = '';
        if (footerExtra && !isReadOnly) {
            const extra = document.createElement('button'); extra.className = 'btn btn-danger btn-sm';
            extra.textContent = t('btn_delete'); extra.style.marginRight = 'auto';
            extra.addEventListener('click', footerExtra);
            footExtra.appendChild(extra);
        }
    }
    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        const footExtra = document.getElementById('modalFooterExtra');
        if (footExtra) footExtra.innerHTML = '';
    }

    // ---- Chart Rendering (Canvas) ----
    function drawCashFlowChart(data) {
        const canvas = document.getElementById('cashFlowChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * dpr; canvas.height = 280 * dpr;
        canvas.style.width = rect.width + 'px'; canvas.style.height = '280px';
        ctx.scale(dpr, dpr);
        const W = rect.width, H = 280, pad = { t: 20, r: 20, b: 40, l: 60 };
        const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
        ctx.clearRect(0, 0, W, H);
        const maxVal = Math.max(1, ...data.map(d => Math.max(d.inflow, d.outflow)));
        const barW = Math.min(30, cW / data.length / 3);
        const gap = cW / data.length;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? '#94A3B8' : '#94A3B8'; ctx.font = '12px Inter'; ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) { const y = pad.t + cH - (cH / 4) * i; const v = Math.round(maxVal / 4 * i); ctx.fillText(fmt(v), pad.l - 10, y + 4); ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(226,232,240,0.8)'; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke(); }
        data.forEach((d, i) => {
            const x = pad.l + gap * i + gap / 2;
            const hIn = (d.inflow / maxVal) * cH, hOut = (d.outflow / maxVal) * cH;
            ctx.fillStyle = '#10B981'; roundRect(ctx, x - barW - 2, pad.t + cH - hIn, barW, hIn, 4);
            ctx.fillStyle = '#3B82F6'; roundRect(ctx, x + 2, pad.t + cH - hOut, barW, hOut, 4);
            ctx.fillStyle = isDark ? '#CBD5E1' : '#64748B'; ctx.textAlign = 'center'; ctx.font = '12px Inter';
            ctx.fillText(d.label, x, H - pad.b + 20);
        });
        // Legend
        ctx.fillStyle = '#10B981'; roundRect(ctx, pad.l, H - 14, 10, 10, 2); ctx.fillStyle = isDark ? '#CBD5E1' : '#475569'; ctx.textAlign = 'left'; ctx.font = '11px Inter'; ctx.fillText('Income', pad.l + 14, H - 5);
        ctx.fillStyle = '#3B82F6'; roundRect(ctx, pad.l + 80, H - 14, 10, 10, 2); ctx.fillStyle = isDark ? '#CBD5E1' : '#475569'; ctx.fillText('Expense', pad.l + 94, H - 5);
    }
    function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.fill(); }

    // ---- Refresh Pages ----
    async function refreshPage(page) {
        if (page === 'dashboard') await refreshDashboard();
        else if (page === 'customers') await refreshCustomers();
        else if (page === 'suppliers') await refreshSuppliers();
        else if (page === 'services') await refreshServices();
        else if (page === 'bkash') await refreshBkash();
        else if (page === 'expenses') await refreshExpenses();
        else if (page === 'inventory') await refreshInventory();
        else if (page === 'ledger') await refreshLedger();
    }

    async function refreshDashboard(filter = null) {
        let customers = await TallyStore.getCustomers();
        let searchVal = filter;
        if (searchVal === null) {
            const input = document.getElementById('customerSearchMain');
            searchVal = input ? input.value : '';
        }
        const f = String(searchVal || '').toLowerCase().trim();
        if (f) {
            customers = customers.filter(c =>
                (c.name && c.name.toLowerCase().includes(f)) ||
                (c.phone && c.phone.includes(f))
            );
        }

        const list = document.getElementById('dashboardCustomerList');
        if (!list) return;
        list.innerHTML = '';

        if (!customers.length) {
            list.innerHTML = `<div class="empty-state" style="padding:40px; text-align:center; opacity:0.7;">
                <i class="ph ph-magnifying-glass" style="font-size:3rem; display:block; margin-bottom:10px;"></i>
                <p>${f ? (lang === 'bn' ? 'কোনো মিল পাওয়া যায়নি।' : 'No matches found.') : (lang === 'bn' ? 'কোনো কাস্টমার নেই।' : 'No customers yet.')}</p>
                ${f ? `<button class="btn btn-primary" style="margin-top:20px;" onclick="App.quickAddCustomer('${f}')">
                    <i class="ph ph-plus"></i> ${lang === 'bn' ? 'নতুন এন্ট্রি: ' : 'Add New: '} "${f}"
                </button>` : ''}
            </div>`;
            return;
        }

        customers.sort((a, b) => Math.abs(b.due || 0) - Math.abs(a.due || 0)).forEach(c => {
            const card = document.createElement('div');
            card.className = 'entity-card';
            card.onclick = () => openCustomerHistoryModal(c);
            card.innerHTML = `
                <div class="entity-avatar">${c.name.charAt(0)}</div>
                <div class="entity-info">
                    <h4>${c.name}</h4>
                    <p>${c.phone || ''}</p>
                </div>
                <div class="entity-due">
                    <span class="due-label">${lang === 'bn' ? 'বাকি' : 'Due'}</span>
                    <span class="due-amount ${c.due >= 0 ? 'receivable' : 'payable'}">৳ ${Math.abs(c.due || 0)}</span>
                </div>
            `;
            list.appendChild(card);
        });
    }

    async function openCustomerHistoryModal(customer) {
        // Reload fresh customer data
        const allCustomers = await TallyStore.getCustomers();
        const freshCustomer = allCustomers.find(c => c.id === customer.id) || customer;

        const txns = (await TallyStore.getTransactions())
            .filter(t => t.entityName === freshCustomer.name)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first

        // Build history rows
        let historyRowsHTML = '';
        if (txns.length === 0) {
            historyRowsHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; opacity:0.6;">${lang === 'bn' ? 'কোনো ইতিহাস নেই' : 'No history yet'}</td></tr>`;
        } else {
            txns.forEach(t => {
                const isGave = ['sale', 'service', 'given'].includes(t.type);
                const amt = parseFloat(t.amount) || 0;
                const d = new Date(t.date);
                const dateStr = d.toLocaleDateString('en', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
                historyRowsHTML += `
                <tr>
                    <td style="padding:8px 6px; font-size:0.8rem; color:var(--text-secondary); white-space:nowrap;">${dateStr}</td>
                    <td style="padding:8px 6px; font-size:0.85rem;">${t.category || t.description || '—'}</td>
                    <td style="padding:8px 6px; font-weight:bold; text-align:right; color:${isGave ? 'var(--danger)' : 'var(--success)'}; white-space:nowrap;">
                        ${isGave ? '− ' : '+ '}৳${amt.toLocaleString('en-IN')}
                    </td>
                    <td style="padding:8px 6px; text-align:center;">
                        <button class="btn btn-secondary btn-sm" title="${lang === 'bn' ? 'এডিট' : 'Edit'}"
                            onclick="App.editTransaction('${t.id}', '${freshCustomer.id}')"
                            style="padding:4px 8px; font-size:0.75rem;">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                    </td>
                </tr>`;
            });
        }

        const historyHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:var(--bg-secondary); padding:10px; border-radius:8px;">
                <div>
                    <h3 style="margin:0;">${freshCustomer.name}</h3>
                    <small style="font-weight:600; color:${(freshCustomer.due || 0) >= 0 ? 'var(--danger)' : 'var(--success)'};">
                        ${lang === 'bn' ? 'মোট বাকি: ' : 'Total Due: '} ৳${Math.abs(freshCustomer.due || 0)}
                    </small>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-secondary btn-sm" onclick="App.generateCustomerStatement('${freshCustomer.name}')" title="${lang === 'bn' ? 'রিপোর্ট' : 'Report'}">
                        <i class="ph ph-file-text"></i> ${lang === 'bn' ? 'স্টেটমেন্ট' : 'Statement'}
                    </button>
                    <div class="dropdown">
                        <button class="btn btn-secondary btn-sm" onclick="this.nextElementSibling.classList.toggle('show')">
                            <i class="ph ph-dots-three-vertical"></i>
                        </button>
                        <div class="dropdown-content" style="right:0; min-width:150px;">
                            <a href="#" style="color:var(--danger);" onclick="App.confirmDeleteCustomer('${freshCustomer.id}', '${freshCustomer.name}')">
                                <i class="ph ph-trash"></i> ${lang === 'bn' ? 'কাস্টমার ডিলিট' : 'Delete Customer'}
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="entry-form" style="background:var(--bg-page); padding:15px; border-radius:12px; margin-bottom:16px; border:1px solid var(--border-color);">
                <div style="font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary); margin-bottom:10px;">
                    ${lang === 'bn' ? '➕ নতুন এন্ট্রি' : '➕ New Entry'}
                </div>
                <div class="form-row" style="display:flex; gap:10px; margin-bottom:10px;">
                    <div class="form-group" style="flex:1;"><label><strong>${lang === 'bn' ? 'আমি দিলাম' : 'I Gave'}</strong></label>
                    <input type="number" id="f_pay_gave" placeholder="0.00" style="color:var(--danger); font-weight:bold;"></div>
                    <div class="form-group" style="flex:1;"><label><strong>${lang === 'bn' ? 'সে দিল' : 'He Gave'}</strong></label>
                    <input type="number" id="f_pay_recv" placeholder="0.00" style="color:var(--success); font-weight:bold;"></div>
                </div>
                <div class="form-group"><label>${lang === 'bn' ? 'বিবরণ' : 'Note'}</label>
                <input type="text" id="f_pay_desc" placeholder="${lang === 'bn' ? 'বিবরণ লিখুন' : 'Enter details'}"></div>
            </div>

            <div style="font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary); margin-bottom:8px;">
                <i class="ph ph-clock-counter-clockwise"></i> ${lang === 'bn' ? 'লেনদেনের ইতিহাস' : 'Transaction History'}
            </div>
            <div style="max-height:260px; overflow-y:auto; border:1px solid var(--border-color); border-radius:10px;">
                <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                    <thead style="background:var(--bg-secondary); position:sticky; top:0;">
                        <tr>
                            <th style="padding:8px 6px; text-align:left; font-weight:600; font-size:0.75rem;">${lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                            <th style="padding:8px 6px; text-align:left; font-weight:600; font-size:0.75rem;">${lang === 'bn' ? 'বিবরণ' : 'Detail'}</th>
                            <th style="padding:8px 6px; text-align:right; font-weight:600; font-size:0.75rem;">${lang === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                            <th style="padding:8px 6px; text-align:center; font-weight:600; font-size:0.75rem;">${lang === 'bn' ? 'এডিট' : 'Edit'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyRowsHTML}
                    </tbody>
                </table>
            </div>`;

        openModal(freshCustomer.name, historyHTML, async () => {
            const gave = parseFloat(document.getElementById('f_pay_gave').value) || 0;
            const recv = parseFloat(document.getElementById('f_pay_recv').value) || 0;
            const desc = document.getElementById('f_pay_desc').value.trim();

            if (gave === 0 && recv === 0) return;

            if (gave > 0) {
                await TallyStore.addTransaction({ type: 'sale', entityName: freshCustomer.name, amount: gave, category: desc || (lang === 'bn' ? 'বাকি এন্ট্রি' : 'Due'), date: new Date().toISOString() });
            }
            if (recv > 0) {
                await TallyStore.addTransaction({ type: 'payment_in', entityName: freshCustomer.name, amount: recv, category: desc || (lang === 'bn' ? 'টাকা ফেরত' : 'Payment'), date: new Date().toISOString() });
            }

            freshCustomer.due = (parseFloat(freshCustomer.due) || 0) + (gave - recv);
            await TallyStore.updateCustomer(freshCustomer);

            toast(lang === 'bn' ? 'হিসাব আপডেট হয়েছে' : 'Due updated!');
            closeModal();
            refreshDashboard();
        });
    }

    async function editTransaction(txId, customerId) {
        const txns = await TallyStore.getTransactions();
        const tx = txns.find(t => t.id === txId);
        if (!tx) return;

        const isSale = tx.type === 'sale';
        openModal(lang === 'bn' ? 'এন্ট্রি এডিট' : 'Edit Entry',
            `<div class="form-group"><label>${lang === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</label>
            <input id="f_ed_amt" type="number" value="${tx.amount}" style="font-weight:bold; color:${isSale ? 'var(--danger)' : 'var(--success)'}; font-size:1.2rem;"></div>
            <div class="form-group"><label>${lang === 'bn' ? 'বিবরণ' : 'Description'}</label>
            <input id="f_ed_desc" value="${tx.category || tx.description || ''}" placeholder="Photocopy, Printing etc."></div>`,
            async () => {
                const newAmt = parseFloat(document.getElementById('f_ed_amt').value) || 0;
                const newDesc = document.getElementById('f_ed_desc').value.trim();

                if (newAmt <= 0) { toast('Invalid amount', 'error'); return; }

                const oldDiff = isSale ? tx.amount : -tx.amount;
                const newDiff = isSale ? newAmt : -newAmt;
                const adjust = newDiff - oldDiff;

                tx.amount = newAmt;
                tx.category = newDesc;
                await TallyStore.updateTransaction(tx);

                const customers = await TallyStore.getCustomers();
                const c = customers.find(x => x.id === customerId);
                if (c) {
                    c.due = (parseFloat(c.due) || 0) + adjust;
                    await TallyStore.updateCustomer(c);
                }

                toast(lang === 'bn' ? 'এডিট করা হয়েছে' : 'Updated successfully');
                closeModal();
                refreshDashboard();
            },
            async () => {
                if (confirm(lang === 'bn' ? 'এই এন্ট্রিটি কি ডিলিট করতে চান?' : 'Delete this entry?')) {
                    const diff = isSale ? -tx.amount : tx.amount;
                    await TallyStore.deleteTransaction(tx.id);

                    const customers = await TallyStore.getCustomers();
                    const c = customers.find(x => x.id === customerId);
                    if (c) {
                        c.due = (parseFloat(c.due) || 0) + diff;
                        await TallyStore.updateCustomer(c);
                    }

                    toast(lang === 'bn' ? 'ডিলিট করা হয়েছে' : 'Deleted');
                    closeModal();
                    refreshDashboard();
                }
            }
        );
    }

    function makeTxItem(tx) {
        const li = document.createElement('li'); li.className = 'tx-item';
        const icons = { sale: 'ph-storefront', purchase: 'ph-shopping-cart', expense: 'ph-receipt', payment_in: 'ph-arrow-down-left', payment_out: 'ph-arrow-up-right' };
        const isCredit = ['sale', 'payment_in'].includes(tx.type);
        const d = new Date(tx.date);
        const dateStr = d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
        li.innerHTML = `<div class="tx-dot ${tx.type}"> <i class="ph ${icons[tx.type] || 'ph-coin'}"></i></div>
            <div class="tx-info"><h4>${tx.description || tx.type}</h4><small>${dateStr} • ${tx.paymentMethod || 'cash'}</small></div>
            <div class="tx-amount ${isCredit ? 'credit' : 'debit'}">${isCredit ? '+' : '−'} ${fmt(tx.amount)}</div>`;
        return li;
    }

    // ---- CUSTOMERS ----
    async function confirmDeleteCustomer(id, name) {
        if (confirm(lang === 'bn' ? `আপনি কি নিশ্চিতভাবে "${name}" কে ডিলিট করতে চান ? ` : `Are you sure you want to delete "${name}" ? `)) {
            await TallyStore.deleteCustomer(id);
            toast(lang === 'bn' ? 'কাস্টমার ডিলিট করা হয়েছে' : 'Customer deleted');
            closeModal();
            refreshDashboard();
        }
    }

    async function refreshCustomers(filter = '') {
        let data = await TallyStore.getCustomers();
        if (filter) data = data.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
        const el = document.getElementById('customerList'); el.innerHTML = '';
        if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="ph ph-users-three"></i><p>No customers found.</p></div>'; return; }
        data.forEach(c => {
            const colors = ['#F97316', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#EC4899'];
            const color = colors[c.name.charCodeAt(0) % colors.length];
            const card = document.createElement('div'); card.className = 'entity-card'; card.onclick = () => openCustomerModal(c);
            card.innerHTML = `<div class="entity-avatar" style="background:${color}"> ${c.name.charAt(0)}</div>
                <div class="entity-info"><h4>${c.name}</h4><p>${c.phone || 'No phone'}</p></div>
                <div class="entity-due"><span class="due-label">Due</span><span class="due-amount receivable">${fmt(c.due || 0)}</span></div>`;
            el.appendChild(card);
        });
    }
    function openCustomerModal(existing) {
        const isEdit = !!existing;
        openModal(isEdit ? 'Edit Customer' : 'Add Customer',
            `<div class="form-group"><label>Name</label><input id="f_cname" value="${isEdit ? existing.name : ''}"></div>
            <div class="form-row"><div class="form-group"><label>Phone</label><input id="f_cphone" value="${isEdit ? existing.phone : ''}"></div>
            <div class="form-group"><label>Due Amount (৳)</label><input id="f_cdue" type="number" value="${isEdit ? (existing.due || 0) : '0'}"></div></div>
            <div class="form-group"><label>Address</label><input id="f_caddr" value="${isEdit ? existing.address : ''}"></div>
            <div class="form-group"><label>Notes</label><textarea id="f_cnotes" rows="2">${isEdit ? existing.notes : ''}</textarea></div>`,
            async () => {
                const obj = { name: document.getElementById('f_cname').value.trim(), phone: document.getElementById('f_cphone').value.trim(), due: parseFloat(document.getElementById('f_cdue').value) || 0, address: document.getElementById('f_caddr').value.trim(), notes: document.getElementById('f_cnotes').value.trim() };
                if (!obj.name) { toast('Name is required', 'error'); return; }
                if (isEdit) { Object.assign(existing, obj); await TallyStore.updateCustomer(existing); toast('Customer updated!'); }
                else { await TallyStore.addCustomer(obj); toast('Customer added!'); }
                closeModal(); refreshCustomers();
            },
            isEdit ? async () => { await TallyStore.deleteCustomer(existing.id); toast('Customer deleted'); closeModal(); refreshCustomers(); } : null
        );
    }

    // ---- SUPPLIERS (mirrors customers) ----
    async function refreshSuppliers(filter = '') {
        let data = await TallyStore.getSuppliers();
        if (filter) data = data.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
        const el = document.getElementById('supplierList'); el.innerHTML = '';
        if (!data.length) { el.innerHTML = '<div class="empty-state"><i class="ph ph-truck"></i><p>No suppliers found.</p></div>'; return; }
        data.forEach(s => {
            const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F97316', '#EF4444'];
            const color = colors[s.name.charCodeAt(0) % colors.length];
            const card = document.createElement('div'); card.className = 'entity-card'; card.onclick = () => openSupplierModal(s);
            card.innerHTML = `<div class="entity-avatar" style="background:${color}"> ${s.name.charAt(0)}</div><div class="entity-info"><h4>${s.name}</h4><p>${s.phone || 'No phone'}</p></div><div class="entity-due"><span class="due-label">Payable</span><span class="due-amount payable">${fmt(s.due || 0)}</span></div>`;
            el.appendChild(card);
        });
    }
    function openSupplierModal(existing) {
        const isEdit = !!existing;
        openModal(isEdit ? 'Edit Supplier' : 'Add Supplier',
            `<div class="form-group"><label>Name</label><input id="f_sname" value="${isEdit ? existing.name : ''}"></div>
            <div class="form-row"><div class="form-group"><label>Phone</label><input id="f_sphone" value="${isEdit ? existing.phone : ''}"></div><div class="form-group"><label>Payable (৳)</label><input id="f_sdue" type="number" value="${isEdit ? (existing.due || 0) : '0'}"></div></div>
            <div class="form-group"><label>Address</label><input id="f_saddr" value="${isEdit ? existing.address : ''}"></div>
            <div class="form-group"><label>Notes</label><textarea id="f_snotes" rows="2">${isEdit ? existing.notes : ''}</textarea></div>`,
            async () => { const o = { name: document.getElementById('f_sname').value.trim(), phone: document.getElementById('f_sphone').value.trim(), due: parseFloat(document.getElementById('f_sdue').value) || 0, address: document.getElementById('f_saddr').value.trim(), notes: document.getElementById('f_snotes').value.trim() }; if (!o.name) { toast('Name required', 'error'); return; } if (isEdit) { Object.assign(existing, o); await TallyStore.updateSupplier(existing); toast('Supplier updated!'); } else { await TallyStore.addSupplier(o); toast('Supplier added!'); } closeModal(); refreshSuppliers(); },
            isEdit ? async () => { await TallyStore.deleteSupplier(existing.id); toast('Supplier deleted'); closeModal(); refreshSuppliers(); } : null
        );
    }

    // ---- SERVICES (Photocopy/Printing) ----
    async function refreshServices() {
        const txns = (await TallyStore.getTransactions()).filter(t => t.type === 'service').sort((a, b) => new Date(b.date) - new Date(a.date));
        const body = document.getElementById('servicesTableBody'); body.innerHTML = '';
        document.getElementById('servicesEmpty').classList.toggle('hidden', txns.length > 0);
        document.getElementById('servicesTable').classList.toggle('hidden', txns.length === 0);
        txns.forEach((tx, i) => {
            body.innerHTML += `<tr><td>${i + 1}</td><td>${new Date(tx.date).toLocaleDateString()}</td><td>${tx.category || 'Photocopy'}</td><td>${tx.qty || 1}</td><td>${fmt(tx.amount)}</td><td><span class="status-badge paid">paid</span></td></tr> `;
        });
    }

    // ---- bKash / Nagad ----
    async function refreshBkash() {
        const txns = (await TallyStore.getTransactions()).filter(t => ['mfs_in', 'mfs_out'].includes(t.type)).sort((a, b) => new Date(b.date) - new Date(a.date));
        const body = document.getElementById('bkashTableBody'); body.innerHTML = '';
        document.getElementById('bkashEmpty').classList.toggle('hidden', txns.length > 0);
        document.getElementById('bkashTable').classList.toggle('hidden', txns.length === 0);
        txns.forEach((tx, i) => {
            const typeLabel = tx.type === 'mfs_in' ? 'Cash In' : 'Cash Out';
            body.innerHTML += `<tr><td>${i + 1}</td><td>${new Date(tx.date).toLocaleDateString()}</td><td>${typeLabel}</td><td>${tx.entityName || '—'}</td><td>${tx.paymentMethod}</td><td>${fmt(tx.amount)}</td><td style="color:var(--success)">+ ${fmt(tx.commission || 0)}</td></tr> `;
        });
    }

    // ---- EXPENSES ----
    async function refreshExpenses() {
        const txns = (await TallyStore.getTransactions()).filter(t => t.type === 'expense').sort((a, b) => new Date(b.date) - new Date(a.date));
        const body = document.getElementById('expensesTableBody'); body.innerHTML = '';
        document.getElementById('expensesEmpty').classList.toggle('hidden', txns.length > 0);
        document.getElementById('expensesTable').classList.toggle('hidden', txns.length === 0);
        const now = new Date(), todayS = now.toISOString().split('T')[0];
        let eTod = 0, eWeek = 0, eMonth = 0;
        txns.forEach((tx, i) => {
            const d = new Date(tx.date), ds = d.toISOString().split('T')[0], amt = parseFloat(tx.amount) || 0;
            if (ds === todayS) eTod += amt; const diffD = (now - d) / (864e5); if (diffD <= 7) eWeek += amt; if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) eMonth += amt;
            body.innerHTML += `<tr><td>${i + 1}</td><td>${d.toLocaleDateString()}</td><td>${tx.category || 'Others'}</td><td>${tx.description || ''}</td><td>${fmt(amt)}</td></tr> `;
        });
        document.getElementById('expToday').textContent = fmt(eTod);
        document.getElementById('expWeek').textContent = fmt(eWeek);
        document.getElementById('expMonth').textContent = fmt(eMonth);
    }

    // ---- INVENTORY ----
    async function refreshInventory() {
        const inv = await TallyStore.getInventory();
        const el = document.getElementById('inventoryList'); el.innerHTML = '';
        if (!inv.length) { el.innerHTML = '<div class="empty-state"><i class="ph ph-package"></i><p>No products.</p></div>'; return; }
        inv.forEach(p => {
            const low = p.stock <= (p.minStock || 5);
            const card = document.createElement('div'); card.className = 'product-card'; card.onclick = () => openProductModal(p);
            card.innerHTML = `< h4 > ${p.name}</h4 ><div class="product-prices"><span>Buy: ${fmt(p.purchasePrice)}</span><span>Sell: ${fmt(p.salePrice)}</span></div><p class="product-stock ${low ? 'low' : ''}"><i class="ph ph-cube"></i> Stock: ${p.stock} ${low ? '⚠️ Low' : ''}</p>`;
            el.appendChild(card);
        });
    }
    function openProductModal(existing) {
        const e = !!existing;
        openModal(e ? 'Edit Product' : 'Add Product',
            `<div class="form-group"><label>Product Name</label><input id="f_pname" value="${e ? existing.name : ''}"></div>
            <div class="form-row"><div class="form-group"><label>Purchase Price</label><input id="f_pprice" type="number" value="${e ? existing.purchasePrice : ''}"></div><div class="form-group"><label>Sale Price</label><input id="f_sprice" type="number" value="${e ? existing.salePrice : ''}"></div></div>
            <div class="form-row"><div class="form-group"><label>Stock Qty</label><input id="f_pstock" type="number" value="${e ? existing.stock : ''}"></div><div class="form-group"><label>Min Stock Alert</label><input id="f_pmin" type="number" value="${e ? (existing.minStock || 5) : '5'}"></div></div>`,
            async () => { const o = { name: document.getElementById('f_pname').value.trim(), purchasePrice: parseFloat(document.getElementById('f_pprice').value) || 0, salePrice: parseFloat(document.getElementById('f_sprice').value) || 0, stock: parseInt(document.getElementById('f_pstock').value) || 0, minStock: parseInt(document.getElementById('f_pmin').value) || 5 }; if (!o.name) { toast('Name required', 'error'); return; } if (e) { Object.assign(existing, o); await TallyStore.updateProduct(existing); toast('Product updated!'); } else { await TallyStore.addProduct(o); toast('Product added!'); } closeModal(); refreshInventory(); },
            e ? async () => { await TallyStore.deleteProduct(existing.id); toast('Deleted'); closeModal(); refreshInventory(); } : null
        );
    }

    // ---- LEDGER ----
    async function refreshLedger() {
        const txns = (await TallyStore.getTransactions()).sort((a, b) => new Date(a.date) - new Date(b.date));
        const body = document.getElementById('ledgerTableBody'); body.innerHTML = '';
        document.getElementById('ledgerEmpty').classList.toggle('hidden', txns.length > 0);
        document.getElementById('ledgerTable').classList.toggle('hidden', txns.length === 0);
        let balance = 0;
        // Populate entity filter
        const sel = document.getElementById('ledgerEntityFilter');
        const entities = [...new Set(txns.map(t => t.entityName).filter(Boolean))];
        sel.innerHTML = '<option value="all">All</option>' + entities.map(e => `<option value="${e}"> ${e}</option> `).join('');
        const filterEntity = sel.value;
        const fromDate = document.getElementById('ledgerDateFrom').value;
        const toDate = document.getElementById('ledgerDateTo').value;
        txns.forEach(tx => {
            if (filterEntity !== 'all' && tx.entityName !== filterEntity) return;
            const ds = tx.date ? tx.date.split('T')[0] : '';
            if (fromDate && ds < fromDate) return; if (toDate && ds > toDate) return;
            const amt = parseFloat(tx.amount) || 0;
            const isDebit = ['purchase', 'expense', 'payment_out'].includes(tx.type);
            if (isDebit) balance -= amt; else balance += amt;
            body.innerHTML += `<tr><td>${new Date(tx.date).toLocaleDateString()}</td><td>${tx.description || tx.type}</td><td>${tx.entityName || '—'}</td><td>${isDebit ? fmt(amt) : ''}</td><td>${!isDebit ? fmt(amt) : ''}</td><td style="font-weight:700;color:${balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt(balance)}</td></tr> `;
        });
    }

    // ---- SIMPLE NEW ENTRY MODAL ----
    function openNewTransactionModal() {
        openModal(lang === 'bn' ? 'নতুন এন্ট্রি' : 'New Due Entry',
            `<div class="form-group"><label>${lang === 'bn' ? 'কাস্টমারের নাম' : 'Customer Name'}</label>
            <input id="f_tname" placeholder="${lang === 'bn' ? 'কাস্টমারের নাম' : 'Name'}"></div>
            <div class="form-row">
                <div class="form-group"><label>${lang === 'bn' ? 'আমি দিলাম (দিলাম)' : 'I Gave (Gave)'}</label>
                <input id="f_tgave" type="number" placeholder="0.00" style="color:var(--danger); font-weight:bold;"></div>
                <div class="form-group"><label>${lang === 'bn' ? 'সে দিল (পেলাম)' : 'He Gave (Recv)'}</label>
                <input id="f_trecv" type="number" placeholder="0.00" style="color:var(--success); font-weight:bold;"></div>
            </div>
            <div class="form-group"><label>${lang === 'bn' ? 'বিবরণ (কিসের জন্য)' : 'Description (For what?)'}</label>
            <input id="f_tdesc" placeholder="${lang === 'bn' ? 'ফটোকপি, প্রিন্টিং ইত্যাদি' : 'e.g. Photocopy'}"></div>`,
            async () => {
                const name = document.getElementById('f_tname').value.trim();
                const gave = parseFloat(document.getElementById('f_tgave').value) || 0;
                const recv = parseFloat(document.getElementById('f_trecv').value) || 0;
                const desc = document.getElementById('f_tdesc').value.trim();

                if (!name || (gave === 0 && recv === 0)) {
                    toast(lang === 'bn' ? 'নাম ও অন্তত একটি পরিমাণ দিন' : 'Name and amount required', 'error');
                    return;
                }

                if (gave > 0) {
                    const txGave = { type: 'sale', entityName: name, amount: gave, category: desc, date: new Date().toISOString() };
                    await TallyStore.addTransaction(txGave);
                }
                if (recv > 0) {
                    const txRecv = { type: 'payment_in', entityName: name, amount: recv, category: desc || (lang === 'bn' ? 'টাকা ফেরত' : 'Payment'), date: new Date().toISOString() };
                    await TallyStore.addTransaction(txRecv);
                }

                // Update customer total due
                const customer = await TallyStore.findOrCreateCustomer(name);
                customer.due = (parseFloat(customer.due) || 0) + (gave - recv);
                await TallyStore.updateCustomer(customer);

                toast(lang === 'bn' ? 'এন্ট্রি সেভ হয়েছে' : 'Entry saved!');
                closeModal();
                refreshDashboard();
            }
        );
    }

    function quickAddCustomer(name) {
        openNewTransactionModal();
        setTimeout(() => {
            const input = document.getElementById('f_tname');
            if (input) {
                input.value = name;
                document.getElementById('f_tgave').focus();
            }
        }, 300);
    }

    // ---- REPORTS ----
    function generateReport(type) {
        document.getElementById('reportOutput').classList.remove('hidden');
        document.getElementById('reportTitle').textContent = type.charAt(0).toUpperCase() + type.slice(1) + ' Report';
        TallyStore.getTransactions().then(txns => {
            const content = document.getElementById('reportContent');
            const now = new Date();
            let filtered = txns;
            if (type === 'daily') filtered = txns.filter(t => t.date && t.date.split('T')[0] === now.toISOString().split('T')[0]);
            else if (type === 'weekly') filtered = txns.filter(t => (now - new Date(t.date)) / (864e5) <= 7);
            else if (type === 'monthly') filtered = txns.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
            else if (type === 'expense') filtered = txns.filter(t => t.type === 'expense');
            else if (type === 'due') filtered = txns.filter(t => t.due > 0);
            let totalIn = 0, totalOut = 0;
            filtered.forEach(t => { const a = parseFloat(t.amount) || 0; if (['sale', 'payment_in'].includes(t.type)) totalIn += a; else totalOut += a; });
            let html = `<div class="expense-summary-row"><div class="mini-kpi"><span class="mini-kpi-label">Income</span><span class="mini-kpi-val" style="color:var(--success)">${fmt(totalIn)}</span></div><div class="mini-kpi"><span class="mini-kpi-label">Expense</span><span class="mini-kpi-val" style="color:var(--danger)">${fmt(totalOut)}</span></div><div class="mini-kpi"><span class="mini-kpi-label">Net</span><span class="mini-kpi-val">${fmt(totalIn - totalOut)}</span></div></div> `;
            html += `<table class="tx-table"><thead><tr><th>Date</th><th>Type</th><th>Entity</th><th>Amount</th></tr></thead><tbody>`;
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => { html += `<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.type}</td><td>${t.entityName || '—'}</td><td>${fmt(t.amount)}</td></tr>`; });
            html += `</tbody></table> `;
            content.innerHTML = html;
        });
    }

    async function generateCustomerStatement(customerName) {
        const txns = (await TallyStore.getTransactions()).filter(t => t.entityName === customerName).sort((a, b) => new Date(a.date) - new Date(b.date));

        let totalGave = 0, totalRecv = 0;
        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0;">${customerName}</h3>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-secondary btn-sm" onclick="App.downloadCustomerStatement('${customerName}')" title="Download CSV"><i class="ph ph-download-simple"></i></button>
                    <button class="btn btn-secondary btn-sm" onclick="App.shareCustomerStatement('${customerName}')" title="Share"><i class="ph ph-share-network"></i></button>
                </div>
            </div> `;

        html += `<table class="tx-table" style="width:100%; font-size:0.9rem; border-collapse:collapse;">
            <thead><tr style="background:var(--bg-secondary);">
                <th style="padding:8px; border:1px solid var(--border-color);">${lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                <th style="padding:8px; border:1px solid var(--border-color);">${lang === 'bn' ? 'বিবরণ' : 'Detail'}</th>
                <th style="padding:8px; border:1px solid var(--border-color);">${lang === 'bn' ? 'দিলাম' : 'Gave'}</th>
                <th style="padding:8px; border:1px solid var(--border-color);">${lang === 'bn' ? 'পেলাম' : 'Recv'}</th>
            </tr></thead><tbody>`;

        txns.forEach(t => {
            const isGave = ['sale', 'service', 'given'].includes(t.type);
            const amt = parseFloat(t.amount) || 0;
            if (isGave) totalGave += amt; else totalRecv += amt;

            html += `<tr>
                <td style="padding:8px; border:1px solid var(--border-color);">${new Date(t.date).toLocaleDateString()}</td>
                <td style="padding:8px; border:1px solid var(--border-color);">${t.category || t.description || '—'}</td>
                <td style="padding:8px; border:1px solid var(--border-color); color:var(--danger); font-weight:bold;">${isGave ? fmt(amt) : ''}</td>
                <td style="padding:8px; border:1px solid var(--border-color); color:var(--success); font-weight:bold;">${!isGave ? fmt(amt) : ''}</td>
            </tr>`;
        });

        html += `</tbody><tfoot><tr style="background:var(--bg-secondary); font-weight:bold;">
            <td colspan="2" style="padding:8px; border:1px solid var(--border-color); text-align:right;">${lang === 'bn' ? 'মোট:' : 'Total:'}</td>
            <td style="padding:8px; border:1px solid var(--border-color); color:var(--danger);">${fmt(totalGave)}</td>
            <td style="padding:8px; border:1px solid var(--border-color); color:var(--success);">${fmt(totalRecv)}</td>
        </tr></tfoot></table> `;

        const net = totalGave - totalRecv;
        html += `<div style="margin-top:15px; text-align:right; font-size:1.1rem; font-weight:bold;">
    ${lang === 'bn' ? 'মোট পাওনা:' : 'Balance Due:'} <span style="color:${net >= 0 ? 'var(--danger)' : 'var(--success)'}">৳ ${Math.abs(net)}</span>
        </div> `;

        openModal(lang === 'bn' ? 'স্টেটমেন্ট' : 'Statement',
            `<div style="max-height:450px; overflow-y:auto; padding:5px;"> ${html}</div> `,
            null,
            null,
            true
        );
    }

    async function downloadCustomerStatement(customerName) {
        const txns = (await TallyStore.getTransactions()).filter(t => t.entityName === customerName).sort((a, b) => new Date(a.date) - new Date(b.date));
        let csv = '\uFEFF'; // UTF-8 BOM for Excel
        csv += `${lang === 'bn' ? 'তারিখ,বিবরণ,আমি দিয়েছি,আমি পেলাম' : 'Date,Description,I Gave,I Received'} \n`;
        txns.forEach(t => {
            const isGave = ['sale', 'service', 'given'].includes(t.type);
            csv += `${new Date(t.date).toLocaleDateString()},${(t.category || t.description || '').replace(/,/g, ' ')},${isGave ? t.amount : 0},${!isGave ? t.amount : 0} \n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${customerName} _Statement.csv`; a.click();
    }

    async function shareCustomerStatement(customerName) {
        const customer = (await TallyStore.getCustomers()).find(c => c.name === customerName);
        const text = lang === 'bn'
            ? `${customerName} -এর পাওনা হিসাব: \nমোট বাকি: ৳${customer.due || 0} \nধন্যবাদ!`
            : `Due Statement for ${customerName}: \nTotal Due: ৳${customer.due || 0} \nThank you!`;

        if (navigator.share) {
            navigator.share({ title: 'Tally Statement', text: text }).catch(() => { });
        } else {
            navigator.clipboard.writeText(text); toast(lang === 'bn' ? 'তথ্য কপি হয়েছে' : 'Copied to clipboard');
        }
    }

    // ---- VOICE ASSISTANT ORCHESTRATION ----
    function openVoiceAssistant() {
        const overlay = document.getElementById('voiceOverlay');
        overlay.classList.add('active', 'listening');
        document.getElementById('voiceResult').classList.add('hidden');
        document.getElementById('voiceTranscript').textContent = '';
        document.getElementById('voiceStatus').textContent = lang === 'bn' ? 'শুনছি...' : 'Listening...';
        TallyVoice.speak(lang === 'bn' ? 'বলুন' : 'Yes, tell me.', () => {
            const started = TallyVoice.startListening({
                lang: lang === 'bn' ? 'bn-BD' : 'en-US',
                onInterim: (txt) => { document.getElementById('voiceTranscript').textContent = txt; },
                onResult: (txt) => { processVoiceResult(txt); },
                onStatus: (s) => { if (s === 'no-speech' || s === 'ended') { if (!document.getElementById('voiceResult').classList.contains('hidden')) return; document.getElementById('voiceStatus').textContent = lang === 'bn' ? 'কিছু শুনতে পাইনি, আবার চেষ্টা করুন।' : "Didn't catch that. Try again."; overlay.classList.remove('listening'); } }
            });
            if (!started) { document.getElementById('voiceStatus').textContent = "Speech recognition not supported in this browser. Use Chrome for best results."; overlay.classList.remove('listening'); }
        });
    }

    async function processVoiceResult(text) {
        const overlay = document.getElementById('voiceOverlay');
        overlay.classList.remove('listening');
        document.getElementById('voiceTranscript').textContent = `"${text}"`;
        document.getElementById('voiceStatus').textContent = lang === 'bn' ? 'প্রসেস হচ্ছে...' : 'Processing...';

        const parsed = TallyVoice.parseVoiceCommand(text);
        if (!parsed.type || !parsed.amount) {
            const msg = lang === 'bn' ? 'বুঝতে পারিনি, আবার বলুন।' : "Couldn't understand, please try again.";
            TallyVoice.speak(msg);
            document.getElementById('voiceStatus').textContent = msg;
            return;
        }

        // Voice commands now either add to due or subtract from due
        const isPayment = ['payment_in', 'mfs_out'].includes(parsed.type);
        const txType = isPayment ? 'payment_in' : 'sale';

        const tx = {
            type: txType,
            entityName: parsed.entityName || (lang === 'bn' ? 'অজানা' : 'Unknown'),
            amount: parsed.amount,
            category: parsed.category || parsed.description,
            date: new Date().toISOString()
        };

        await TallyStore.addTransaction(tx);
        const customer = await TallyStore.findOrCreateCustomer(tx.entityName);
        customer.due = (parseFloat(customer.due) || 0) + (txType === 'sale' ? tx.amount : -tx.amount);
        await TallyStore.updateCustomer(customer);

        const confirmMsg = lang === 'bn'
            ? `${tx.entityName} এর হিসাবে ৳${tx.amount} ${txType === 'sale' ? 'বাকি' : 'জমা'} করা হয়েছে।`
            : `Recorded ৳${tx.amount} ${txType === 'sale' ? 'due' : 'payment'} for ${tx.entityName}.`;

        showVoiceSuccess('✅', confirmMsg, {
            [lang === 'bn' ? 'ব্যক্তি' : 'Person']: tx.entityName,
            [lang === 'bn' ? 'পরিমাণ' : 'Amount']: fmt(tx.amount)
        });

        TallyVoice.speak(confirmMsg, () => {
            setTimeout(() => { closeVoiceOverlay(); refreshDashboard(); }, 2500);
        });
    }

    function showVoiceSuccess(icon, title, details) {
        document.getElementById('voiceResult').classList.remove('hidden');
        document.getElementById('voiceResultTitle').textContent = title;
        let html = '';
        for (const [k, v] of Object.entries(details)) { html += `<p > <strong>${k}:</strong> ${v}</p> `; }
        document.getElementById('voiceResultDetails').innerHTML = html;
        document.getElementById('voiceStatus').textContent = '';
    }

    function closeVoiceOverlay() {
        document.getElementById('voiceOverlay').classList.remove('active', 'listening');
        TallyVoice.stopListening(); TallyVoice.stopSpeaking();
    }

    // ---- SEARCH ----
    async function globalSearch(query) {
        if (!query.trim()) { navigateTo('dashboard'); return; }
        const q = query.toLowerCase();
        const customers = await TallyStore.getCustomers();
        const match = customers.find(c => c.name.toLowerCase().includes(q));
        if (match) { navigateTo('customers'); setTimeout(() => refreshCustomers(q), 100); return; }
        const suppliers = await TallyStore.getSuppliers();
        const smatch = suppliers.find(s => s.name.toLowerCase().includes(q));
        if (smatch) { navigateTo('suppliers'); setTimeout(() => refreshSuppliers(q), 100); return; }
        toast('No results found', 'info');
    }

    // ---- Sync Status Indicator ----
    function setSyncStatus(state) {
        const el = document.getElementById('syncStatus');
        if (!el) return;
        const icons = {
            connecting: '<i class="ph ph-cloud" style="font-size:1.1rem; color:#94A3B8;"></i>',
            synced: '<i class="ph ph-cloud-check" style="font-size:1.1rem; color:#10B981;"></i>',
            offline: '<i class="ph ph-cloud-slash" style="font-size:1.1rem; color:#F59E0B;"></i>',
            error: '<i class="ph ph-cloud-warning" style="font-size:1.1rem; color:#EF4444;"></i>',
        };
        el.innerHTML = icons[state] || icons.connecting;
        el.title = { connecting: 'Connecting...', synced: 'Cloud Synced ✅', offline: 'Offline Mode ⚠️', error: 'Sync Error ❌' }[state];
    }

    // ---- INIT ----
    async function init() {
        // Restore preferences
        const savedTheme = localStorage.getItem('tally_theme');
        if (savedTheme) { document.documentElement.setAttribute('data-theme', savedTheme); document.getElementById('themeToggleBtn').innerHTML = savedTheme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>'; }
        const savedLang = localStorage.getItem('tally_lang');
        if (savedLang) { lang = savedLang; document.getElementById('langToggleBtn').querySelector('.lang-label').textContent = lang === 'en' ? 'EN' : 'বাং'; }

        // Show connecting status
        setSyncStatus('connecting');

        try {
            await TallyStore.init();
            setSyncStatus('synced');
        } catch (err) {
            console.error('Firebase init error:', err);
            setSyncStatus('error');
            toast('Cloud sync failed. Check internet.', 'error');
        }

        // Monitor online/offline
        window.addEventListener('online', () => { setSyncStatus('synced'); toast(lang === 'bn' ? 'ইন্টারনেট সংযোগ হয়েছে ✅' : 'Back online ✅', 'success'); });
        window.addEventListener('offline', () => { setSyncStatus('offline'); toast(lang === 'bn' ? 'অফলাইন মোড — ডেটা পরে sync হবে' : 'Offline mode — data will sync later', 'info'); });

        await TallyStore.seedDemoData();
        applyI18n();

        // Events
        document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', e => { e.preventDefault(); navigateTo(n.dataset.page); }));
        document.getElementById('hamburgerBtn').addEventListener('click', openSidebar);
        document.getElementById('sidebarCloseBtn').addEventListener('click', closeSidebar);
        document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
        document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
        document.getElementById('langToggleBtn').addEventListener('click', toggleLang);
        document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
        document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
        document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
        document.getElementById('fabVoice').addEventListener('click', openVoiceAssistant);
        document.getElementById('voiceCloseBtn').addEventListener('click', closeVoiceOverlay);
        document.getElementById('voiceOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeVoiceOverlay(); });
        document.getElementById('newTxBtnTop').addEventListener('click', () => openNewTransactionModal());
        document.getElementById('customerSearchMain').addEventListener('input', e => refreshDashboard(e.target.value));
        document.getElementById('addCustomerBtn').addEventListener('click', () => openCustomerModal(null));
        document.getElementById('addSupplierBtn').addEventListener('click', () => openSupplierModal(null));
        document.getElementById('addServiceBtn').addEventListener('click', () => openNewTransactionModal({ type: 'service' }));
        document.getElementById('addBkashBtn').addEventListener('click', () => openNewTransactionModal({ type: 'mfs_in' }));
        document.getElementById('addExpenseBtn').addEventListener('click', () => openNewTransactionModal({ type: 'expense' }));
        document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));
        document.getElementById('viewAllTxBtn') && document.getElementById('viewAllTxBtn').addEventListener('click', () => navigateTo('ledger'));
        document.getElementById('customerSearch').addEventListener('input', e => refreshCustomers(e.target.value));
        document.getElementById('supplierSearch').addEventListener('input', e => refreshSuppliers(e.target.value));
        document.getElementById('ledgerEntityFilter').addEventListener('change', () => refreshLedger());
        document.getElementById('ledgerDateFrom').addEventListener('change', () => refreshLedger());
        document.getElementById('ledgerDateTo').addEventListener('change', () => refreshLedger());
        document.getElementById('globalSearch').addEventListener('keydown', e => { if (e.key === 'Enter') globalSearch(e.target.value); });
        document.querySelectorAll('.report-card').forEach(c => c.addEventListener('click', () => generateReport(c.dataset.report)));
        const expBtn = document.getElementById('exportReportBtn');
        if (expBtn) expBtn.addEventListener('click', exportCSV);

        // Hash routing
        const hash = location.hash.replace('#', ''); if (hash) navigateTo(hash);
        window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (h) navigateTo(h); });

        // Chart resize
        window.addEventListener('resize', () => { if (currentPage === 'dashboard') TallyStore.getLast7DaysCashFlow().then(drawCashFlowChart); });

        // Initial render
        setTimeout(() => navigateTo(currentPage), 300);
    }

    document.addEventListener('DOMContentLoaded', init);
    return { navigateTo, toast, openNewTransactionModal, generateCustomerStatement, downloadCustomerStatement, shareCustomerStatement, quickAddCustomer, confirmDeleteCustomer, editTransaction, exportBackup: () => TallyStore.exportAllData() };
})();
