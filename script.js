    
        // --- DATA & STATE MANAGEMENT ---
        const APP_KEY = 'finanzas360_data';
        let appData = {
            transactions: [],
            riskProfile: null,
            settings: {
                currency: 'USD'
            }
        };

        const categories = {
            expense: ['Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Entretenimiento', 'Servicios', 'Otros'],
            income: ['Salario', 'Freelance', 'Inversiones', 'Regalos', 'Otros']
        };

        const riskProfiles = {
            conservative: {
                name: 'Conservador',
                allocation: { 'Bonos Gub.': 60, 'Efectivo/Cetes': 20, 'Acciones (ETFs)': 20 },
                returnRate: 5.5,
                color: '#3B82F6',
                desc: '80% Renta Fija / 20% Renta Variable'
            },
            moderate: {
                name: 'Moderado',
                allocation: { 'Bonos': 40, 'Acciones Globales': 40, 'Bienes Raíces (FIBRAs)': 20 },
                returnRate: 7.5,
                color: '#EAB308',
                desc: '40% Renta Fija / 60% Renta Variable'
            },
            aggressive: {
                name: 'Agresivo',
                allocation: { 'Acciones Globales': 60, 'Acciones Emergentes': 20, 'Bonos Corp.': 20 },
                returnRate: 9.5,
                color: '#F97316',
                desc: '20% Renta Fija / 80% Renta Variable'
            },
            very_aggressive: {
                name: 'Muy Agresivo',
                allocation: { 'Acciones Tech': 40, 'Criptoactivos': 10, 'Acciones Globales': 45, 'Efectivo': 5 },
                returnRate: 11.0,
                color: '#EF4444',
                desc: '5% Renta Fija / 95% Renta Variable'
            }
        };

        // Charts instances
        let chartInstances = {};

        // --- INITIALIZATION ---
        window.onload = function() {
            loadData();
            updateDate();
            
            // Default View
            navigate('dashboard');
            
            // Check first time
            if (appData.transactions.length === 0 && !appData.riskProfile) {
                document.getElementById('welcome-modal').classList.remove('hidden');
            }
            
            renderTransactions();
            updateDashboard();
            updateCategoryOptions('expense');
            
            // Setup listener for years slider
            const slider = document.getElementById('proj-years');
            slider.oninput = function() {
                document.getElementById('proj-years-val').textContent = this.value + " años";
            }
        };

        function closeModal() {
            document.getElementById('welcome-modal').classList.add('hidden');
        }

        function updateDate() {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', options);
            document.getElementById('tx-date').valueAsDate = new Date();
        }

        // --- NAVIGATION ---
        function navigate(viewId) {
            // Hide all views
            ['dashboard', 'transactions', 'portfolio', 'projection', 'education'].forEach(id => {
                document.getElementById('view-' + id).classList.add('hidden');
                document.getElementById('nav-' + id).classList.remove('active', 'bg-gray-100', 'border-l-4', 'border-blue-600');
                // Reset sidebar styles
                const navItem = document.getElementById('nav-' + id);
                if(navItem) navItem.classList.remove('active');
            });

            // Show selected
            document.getElementById('view-' + viewId).classList.remove('hidden');
            document.getElementById('nav-' + viewId).classList.add('active');

            // Trigger specific view logic
            if (viewId === 'dashboard') updateDashboard();
            if (viewId === 'portfolio') renderRiskProfile();
            if (viewId === 'projection') setupProjection();
        }

        function toggleMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('hidden');
        }

        // --- DATA PERSISTENCE ---
        function saveData() {
            localStorage.setItem(APP_KEY, JSON.stringify(appData));
            updateDashboard();
        }

        function loadData() {
            const saved = localStorage.getItem(APP_KEY);
            if (saved) {
                appData = JSON.parse(saved);
            }
        }

        function clearData() {
            if(confirm('¿Estás seguro? Esto borrará todos tus datos.')) {
                localStorage.removeItem(APP_KEY);
                location.reload();
            }
        }

        // --- TRANSACTIONS MODULE ---
        function setTxType(type) {
            document.getElementById('tx-type').value = type;
            const btnExpense = document.getElementById('btn-expense');
            const btnIncome = document.getElementById('btn-income');

            if (type === 'expense') {
                btnExpense.classList.add('bg-red-500', 'text-white', 'border-red-500');
                btnExpense.classList.remove('text-gray-600', 'bg-white', 'border-gray-300');
                
                btnIncome.classList.remove('bg-green-500', 'text-white', 'border-green-500');
                btnIncome.classList.add('text-gray-600', 'bg-white', 'border-gray-300');
            } else {
                btnIncome.classList.add('bg-green-500', 'text-white', 'border-green-500');
                btnIncome.classList.remove('text-gray-600', 'bg-white', 'border-gray-300');

                btnExpense.classList.remove('bg-red-500', 'text-white', 'border-red-500');
                btnExpense.classList.add('text-gray-600', 'bg-white', 'border-gray-300');
            }
            updateCategoryOptions(type);
        }

        function updateCategoryOptions(type) {
            const select = document.getElementById('tx-category');
            select.innerHTML = '';
            categories[type].forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                select.appendChild(opt);
            });
        }

        function addTransaction(e) {
            e.preventDefault();
            const type = document.getElementById('tx-type').value;
            const amount = parseFloat(document.getElementById('tx-amount').value);
            const category = document.getElementById('tx-category').value;
            const date = document.getElementById('tx-date').value;
            const desc = document.getElementById('tx-desc').value;

            const tx = {
                id: Date.now(),
                type,
                amount,
                category,
                date,
                desc
            };

            appData.transactions.unshift(tx); // Add to beginning
            saveData();
            renderTransactions();
            document.getElementById('transaction-form').reset();
            updateDate(); // Reset date to today
            setTxType('expense'); // Reset type
        }

        function deleteTransaction(id) {
            appData.transactions = appData.transactions.filter(t => t.id !== id);
            saveData();
            renderTransactions();
        }

        function renderTransactions() {
            const tbody = document.getElementById('tx-list');
            tbody.innerHTML = '';

            if(appData.transactions.length === 0) {
                document.getElementById('empty-tx-state').classList.remove('hidden');
            } else {
                document.getElementById('empty-tx-state').classList.add('hidden');
                
                // Show last 20
                appData.transactions.slice(0, 20).forEach(tx => {
                    const row = document.createElement('tr');
                    const isExp = tx.type === 'expense';
                    const colorClass = isExp ? 'text-red-600' : 'text-green-600';
                    const sign = isExp ? '-' : '+';

                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tx.date}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${tx.category}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">${tx.desc}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${colorClass}">${sign}$${tx.amount.toFixed(2)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <button onclick="deleteTransaction(${tx.id})" class="text-red-600 hover:text-red-900"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }

        function exportCSV() {
            let csvContent = "data:text/csv;charset=utf-8,Fecha,Tipo,Categoria,Monto,Descripcion\n";
            appData.transactions.forEach(row => {
                csvContent += `${row.date},${row.type},${row.category},${row.amount},${row.desc}\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "finanzas_export.csv");
            document.body.appendChild(link);
            link.click();
        }

        // --- DASHBOARD LOGIC ---
        function updateDashboard() {
            // Calculate Totals for current month
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            let income = 0;
            let expense = 0;
            let totalBalance = 0;
            
            // Expense Categories for Chart
            let expenseCats = {};

            appData.transactions.forEach(tx => {
                if (tx.type === 'income') {
                    totalBalance += tx.amount;
                    if (tx.date.startsWith(currentMonth)) income += tx.amount;
                } else {
                    totalBalance -= tx.amount;
                    if (tx.date.startsWith(currentMonth)) {
                        expense += tx.amount;
                        expenseCats[tx.category] = (expenseCats[tx.category] || 0) + tx.amount;
                    }
                }
            });

            // Update KPI
            document.getElementById('kpi-income').textContent = `$${income.toFixed(2)}`;
            document.getElementById('kpi-expense').textContent = `$${expense.toFixed(2)}`;
            
            const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
            document.getElementById('kpi-savings').textContent = `${savingsRate.toFixed(1)}%`;

            // Health Tips
            const tipsContainer = document.getElementById('health-tips');
            tipsContainer.innerHTML = '';
            
            let tips = [];
            if (savingsRate < 10 && income > 0) tips.push('<div class="bg-blue-800 p-3 rounded">⚠️ <strong>Ahorro Bajo:</strong> Intenta aplicar la regla 50/30/20.</div>');
            if (savingsRate > 20) tips.push('<div class="bg-blue-800 p-3 rounded">✅ <strong>Buen Ahorro:</strong> Estás en camino correcto para invertir.</div>');
            if (expense > income && income > 0) tips.push('<div class="bg-blue-800 p-3 rounded">🚨 <strong>Déficit:</strong> Estás gastando más de lo que ganas. Revisa gastos hormiga.</div>');
            if (tips.length === 0) tips.push('<div class="bg-blue-800 p-3 rounded">ℹ️ Registra más transacciones para recibir consejos.</div>');
            
            tips.forEach(t => tipsContainer.innerHTML += t);

            // Render Charts
            renderExpenseChart(expenseCats);
            renderNetWorthChart(totalBalance);
        }

        function renderExpenseChart(dataObj) {
            const ctx = document.getElementById('chart-expenses-summary');
            
            if (Object.keys(dataObj).length === 0) {
                document.getElementById('no-expenses-msg').classList.remove('hidden');
                ctx.classList.add('hidden');
                return;
            } else {
                document.getElementById('no-expenses-msg').classList.add('hidden');
                ctx.classList.remove('hidden');
            }

            if (chartInstances.expenses) chartInstances.expenses.destroy();

            chartInstances.expenses = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(dataObj),
                    datasets: [{
                        data: Object.values(dataObj),
                        backgroundColor: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }

        function renderNetWorthChart(currentBalance) {
            const ctx = document.getElementById('chart-networth');
            if (chartInstances.networth) chartInstances.networth.destroy();

            // Mock historical data (in a real app, calculate from tx history daily)
            const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Actual'];
            const data = [
                currentBalance * 0.8, 
                currentBalance * 0.85, 
                currentBalance * 0.7, 
                currentBalance * 0.9, 
                currentBalance * 0.95, 
                currentBalance
            ];

            chartInstances.networth = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Patrimonio Neto',
                        data: data,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: false } }
                }
            });
        }

        // --- PORTFOLIO MODULE ---
        function setRiskProfile(profileKey) {
            appData.riskProfile = profileKey;
            saveData();
            
            // UI Selection State
            document.querySelectorAll('.risk-btn').forEach(btn => {
                if(btn.dataset.profile === profileKey) {
                    btn.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
                } else {
                    btn.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
                }
            });

            renderRiskProfile();
        }

        function renderRiskProfile() {
            if (!appData.riskProfile) return;

            const profile = riskProfiles[appData.riskProfile];
            const detailsSection = document.getElementById('portfolio-details');
            
            // Update Header Badge
            const badge = document.getElementById('current-risk-badge');
            badge.textContent = profile.name;
            badge.className = "mt-2 md:mt-0 px-3 py-1 rounded-full text-sm font-semibold text-white";
            badge.style.backgroundColor = profile.color;

            // Show details
            detailsSection.classList.remove('hidden');
            
            // Update Text Data
            document.getElementById('expected-return').textContent = profile.returnRate + "% Anual Promedio";
            
            const compList = document.getElementById('portfolio-composition-list');
            compList.innerHTML = '';
            for (const [asset, pct] of Object.entries(profile.allocation)) {
                compList.innerHTML += `
                    <div class="flex justify-between items-center">
                        <span class="text-gray-700">${asset}</span>
                        <div class="flex items-center w-1/2">
                            <div class="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${pct}%"></div>
                            </div>
                            <span class="text-sm font-bold text-gray-700">${pct}%</span>
                        </div>
                    </div>
                `;
            }

            // Allocation Chart
            const ctx = document.getElementById('chart-allocation');
            if (chartInstances.allocation) chartInstances.allocation.destroy();

            chartInstances.allocation = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(profile.allocation),
                    datasets: [{
                        data: Object.values(profile.allocation),
                        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // --- PROJECTION MODULE ---
        function setupProjection() {
            if (appData.riskProfile) {
                document.getElementById('proj-rate').value = riskProfiles[appData.riskProfile].returnRate;
            } else {
                document.getElementById('proj-rate').value = 5.0; // Default
            }
            calculateProjection();
        }

        function calculateProjection() {
            const P = parseFloat(document.getElementById('proj-initial').value);
            const PMT = parseFloat(document.getElementById('proj-contribution').value);
            const years = parseInt(document.getElementById('proj-years').value);
            const r = parseFloat(document.getElementById('proj-rate').value) / 100;
            
            let currentBalance = P;
            let totalPrincipal = P;
            
            const yearlyLabels = [];
            const yearlyData = [];
            
            for (let i = 0; i <= years; i++) {
                yearlyLabels.push('Año ' + i);
                yearlyData.push(currentBalance);
                
                // FV Calculation for next year: Balance * (1+r) + 12 monthly payments * growth approx
                // Using simple iterative loop for clarity on yearly breakdown
                if (i < years) {
                    currentBalance = (currentBalance + (PMT * 12)) * (1 + r);
                    totalPrincipal += (PMT * 12);
                }
            }

            document.getElementById('res-total-principal').textContent = '$' + Math.round(totalPrincipal).toLocaleString();
            document.getElementById('res-future-value').textContent = '$' + Math.round(currentBalance).toLocaleString();

            const ctx = document.getElementById('chart-projection');
            if (chartInstances.projection) chartInstances.projection.destroy();

            chartInstances.projection = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: yearlyLabels,
                    datasets: [{
                        label: 'Crecimiento Proyectado',
                        data: yearlyData,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            ticks: {
                                callback: function(value) { return '$' + value / 1000 + 'k'; }
                            }
                        }
                    }
                }
            });
        }
  