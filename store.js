/* ============================================================
   TALLY — CLOUD DATA STORE (Firebase Firestore)
   Real-time sync across all devices. Offline-first.
   ============================================================ */

const firebaseConfig = {
    apiKey: "AIzaSyBMrb7LkNoprRPptYyDDEqQb7Oa8gWQ0s0",
    authDomain: "tallyapp-443d6.firebaseapp.com",
    projectId: "tallyapp-443d6",
    storageBucket: "tallyapp-443d6.firebasestorage.app",
    messagingSenderId: "748694291905",
    appId: "1:748694291905:web:820cf69db2933fbfbf9b40",
    measurementId: "G-2XESCFD51Z"
};

const TallyStore = (() => {
    let db = null;

    const COLS = {
        customers: 'customers',
        suppliers: 'suppliers',
        transactions: 'transactions',
        inventory: 'inventory',
        voiceLogs: 'voiceLogs',
    };

    // ---- ID Generator ----
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    // ---- Init Firebase ----
    async function init() {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();

        // Enable offline persistence (data works without internet)
        try {
            await db.enablePersistence({ synchronizeTabs: true });
            console.log('✅ Firebase offline persistence enabled');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Multiple tabs open — only one tab has offline support.');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ This browser does not support offline persistence.');
            }
        }

        console.log('🔥 Firebase Firestore connected!');
    }

    // ---- Generic CRUD Helpers ----
    async function getAll(col) {
        const snapshot = await db.collection(col).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function add(col, data) {
        if (!data.id) data.id = generateId();
        data.createdAt = data.createdAt || new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        await db.collection(col).doc(data.id).set(data);
        return data;
    }

    async function put(col, data) {
        data.updatedAt = new Date().toISOString();
        await db.collection(col).doc(data.id).set(data, { merge: true });
        return data;
    }

    async function remove(col, id) {
        await db.collection(col).doc(id).delete();
        return id;
    }

    // ---- Customers ----
    async function getCustomers() { return getAll(COLS.customers); }
    function subscribeCustomers(callback) {
        if (!db) return () => { };
        return db.collection(COLS.customers).onSnapshot(snapshot => {
            const arr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(arr);
        });
    }
    async function addCustomer(c) { return add(COLS.customers, c); }
    async function updateCustomer(c) { return put(COLS.customers, c); }
    async function deleteCustomer(id) { return remove(COLS.customers, id); }

    // ---- Suppliers ----
    async function getSuppliers() { return getAll(COLS.suppliers); }
    async function addSupplier(s) { return add(COLS.suppliers, s); }
    async function updateSupplier(s) { return put(COLS.suppliers, s); }
    async function deleteSupplier(id) { return remove(COLS.suppliers, id); }

    // ---- Transactions ----
    async function getTransactions() { return getAll(COLS.transactions); }
    async function addTransaction(t) { return add(COLS.transactions, t); }
    async function updateTransaction(t) { return put(COLS.transactions, t); }
    async function deleteTransaction(id) { return remove(COLS.transactions, id); }

    // ---- Inventory ----
    async function getInventory() { return getAll(COLS.inventory); }
    async function addProduct(p) { return add(COLS.inventory, p); }
    async function updateProduct(p) { return put(COLS.inventory, p); }
    async function deleteProduct(id) { return remove(COLS.inventory, id); }

    // ---- Voice Logs ----
    async function addVoiceLog(v) { return add(COLS.voiceLogs, v); }
    async function getVoiceLogs() { return getAll(COLS.voiceLogs); }

    // ---- Find or Create Entity ----
    async function findOrCreateCustomer(name) {
        const all = await getCustomers();
        const match = all.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (match) return match;
        return addCustomer({ name, phone: '', address: '', due: 0, notes: '' });
    }

    async function findOrCreateSupplier(name) {
        const all = await getSuppliers();
        const match = all.find(s => s.name.toLowerCase() === name.toLowerCase());
        if (match) return match;
        return addSupplier({ name, phone: '', address: '', due: 0, notes: '' });
    }

    // ---- Computed Summaries ----
    async function getDashboardSummary() {
        const txns = await getTransactions();
        const now = new Date();
        let totalSales = 0, totalCommission = 0, totalExpenses = 0, totalPaymentIn = 0, totalPaymentOut = 0;

        txns.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            const comm = parseFloat(t.commission) || 0;
            switch (t.type) {
                case 'service': totalSales += amt; break;
                case 'mfs_in': totalCommission += comm; break;
                case 'mfs_out': totalCommission += comm; break;
                case 'expense': totalExpenses += amt; break;
                case 'payment_in': totalPaymentIn += amt; break;
                case 'payment_out': totalPaymentOut += amt; break;
            }
        });

        const customers = await getCustomers();
        const totalReceivable = customers.reduce((s, c) => s + (parseFloat(c.due) || 0), 0);
        const suppliers = await getSuppliers();
        const totalPayable = suppliers.reduce((s, sup) => s + (parseFloat(sup.due) || 0), 0);

        let cashInHand = totalSales + totalPaymentIn - totalExpenses - totalPaymentOut;
        txns.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (t.type === 'mfs_in') cashInHand -= amt;
            if (t.type === 'mfs_out') cashInHand += amt;
        });

        return {
            totalSales, totalCommission, totalExpenses,
            totalReceivable, totalPayable, cashInHand,
            recentTxns: txns.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8),
            allTxns: txns,
        };
    }

    async function getLast7DaysCashFlow() {
        const txns = await getTransactions();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en', { weekday: 'short' });
            let inflow = 0, outflow = 0;
            txns.forEach(t => {
                if (t.date && t.date.startsWith(key)) {
                    const amt = parseFloat(t.amount) || 0;
                    if (['service', 'payment_in', 'mfs_out'].includes(t.type)) inflow += amt;
                    else outflow += amt;
                }
            });
            days.push({ label, inflow, outflow });
        }
        return days;
    }

    // ---- Seed Demo Data (only if Firestore is empty) ----
    async function seedDemoData() {
        const customers = await getCustomers();
        if (customers.length > 0) return; // Already has data — skip

        await addCustomer({ name: 'Korim Chacha', phone: '01711122233', address: 'Nearby Bazar', due: 150, notes: 'Pays weekly' });
        await addCustomer({ name: 'Hasan (Student)', phone: '01822233344', address: 'Hostel A', due: 45, notes: 'Printing assignment' });
        await addSupplier({ name: 'Poly Paper Agency', phone: '01611111111', address: 'Dhaka', due: 1200, notes: 'A4 Paper Supplier' });
        await addProduct({ name: 'A4 Paper (80gsm)', purchasePrice: 450, salePrice: 600, stock: 15, minStock: 2 });
        await addProduct({ name: 'Ink Bottle (Black)', purchasePrice: 850, salePrice: 1100, stock: 4, minStock: 1 });

        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            dates.push(d.toISOString());
        }

        await addTransaction({ type: 'service', category: 'Photocopy', amount: 150, qty: 30, paymentMethod: 'cash', date: dates[0] });
        await addTransaction({ type: 'mfs_in', entityName: '01712345678', amount: 5000, commission: 20, paymentMethod: 'bkash', date: dates[1] });
        await addTransaction({ type: 'service', category: 'Color Print', amount: 450, qty: 15, paymentMethod: 'cash', date: dates[2] });
        await addTransaction({ type: 'mfs_out', entityName: '01999888777', amount: 2000, commission: 36, paymentMethod: 'nagad', date: dates[3] });
        await addTransaction({ type: 'expense', category: 'Shop Rent', amount: 5000, paymentMethod: 'cash', date: dates[4] });
        await addTransaction({ type: 'service', category: 'Lamination', amount: 80, qty: 2, paymentMethod: 'cash', date: dates[5] });
        await addTransaction({ type: 'payment_in', entityName: 'Korim Chacha', amount: 100, paymentMethod: 'cash', date: dates[6] });
    }

    // ---- Export all data as JSON (Backup) ----
    async function exportAllData() {
        const [customers, suppliers, transactions, inventory] = await Promise.all([
            getCustomers(), getSuppliers(), getTransactions(), getInventory()
        ]);
        const blob = new Blob([JSON.stringify({ customers, suppliers, transactions, inventory }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `TallyBackup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    return {
        init, generateId,
        // Customers
        getCustomers, subscribeCustomers, addCustomer, updateCustomer, deleteCustomer, findOrCreateCustomer,
        // Suppliers
        getSuppliers, addSupplier, updateSupplier, deleteSupplier, findOrCreateSupplier,
        // Transactions
        getTransactions, addTransaction, updateTransaction, deleteTransaction,
        // Inventory
        getInventory, addProduct, updateProduct, deleteProduct,
        // Voice
        addVoiceLog, getVoiceLogs,
        // Summaries
        getDashboardSummary, getLast7DaysCashFlow,
        // Demo & Backup
        seedDemoData, exportAllData,
    };
})();
