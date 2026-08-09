document.addEventListener('DOMContentLoaded', () => {
    // --- State Management & Seed Orders ---
    let orders = JSON.parse(localStorage.getItem('bikefix_orders')) || [];
    
    // Seed default demo orders if localStorage is empty
    if (orders.length === 0) {
        orders = [
            {
                id: 'ord_tomek',
                clientCode: 'TOMEK123',
                clientName: 'Tomek Kowalski',
                bikeModel: 'Trek Marlin 7 (Górski 29")',
                clientPhone: '+48 600 100 200',
                date: new Date().toISOString().split('T')[0],
                status: 'W trakcie',
                tasks: [
                    { name: 'Diagnoza napędu i układu hamulcowego', price: 50, done: true },
                    { name: 'Wymiana łańcucha Shimano Deore 10s', price: 95, done: true },
                    { name: 'Centrowanie tylnego koła 29"', price: 45, done: false },
                    { name: 'Regulacja i smarowanie przerzutek', price: 35, done: false }
                ]
            },
            {
                id: 'ord_kasia',
                clientCode: 'KASIA99',
                clientName: 'Katarzyna Nowak',
                bikeModel: 'Specialized Sirrus (Cross)',
                clientPhone: '+48 501 300 400',
                date: new Date().toISOString().split('T')[0],
                status: 'Gotowe',
                tasks: [
                    { name: 'Przegląd posezonowy', price: 150, done: true },
                    { name: 'Wymiana klocków hamulcowych V-Brake', price: 40, done: true }
                ]
            }
        ];
        localStorage.setItem('bikefix_orders', JSON.stringify(orders));
    }

    const MECHANIC_CODE = 'nowostandardowy19.18wis';
    let currentEditingOrderId = null;
    let newOrderTasks = []; 
    let tempOrder = null; 


    
    // To identify if current view is Customer or Mechanic
    let activeCustomerOrderCode = null;
    let isMechanicView = false;
    let currentMechanicTab = 'active'; // 'active' or 'archive'

    // --- DOM Elements ---
    const loginForm = document.getElementById('login-form');
    const accessCodeInput = document.getElementById('access-code');
    const errorMsg = document.getElementById('error-msg');
    
    const viewLogin = document.getElementById('view-login');
    const viewCustomer = document.getElementById('view-customer');
    const viewMechanic = document.getElementById('view-mechanic');

    const modalAddOrder = document.getElementById('modal-add-order');
    const modalManageOrder = document.getElementById('modal-manage-order');
    const formAddOrder = document.getElementById('form-add-order');

    // --- Cryptographically Secure Random Code Generator ---
    function generateSecureCode() {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let sampleCode = '';
        let existsInOrders = true;
        let attempts = 0;
        
        while (existsInOrders && attempts < 100) {
            attempts++;
            sampleCode = '';
            const randomBytes = new Uint8Array(6);
            if (window.crypto && window.crypto.getRandomValues) {
                window.crypto.getRandomValues(randomBytes);
                for (let i = 0; i < 6; i++) {
                    sampleCode += chars.charAt(randomBytes[i] % chars.length);
                }
            } else {
                for (let i = 0; i < 6; i++) {
                    sampleCode += chars.charAt(Math.floor(Math.random() * chars.length));
                }
            }
            const isRealOrder = orders.some(o => o.clientCode && o.clientCode.toUpperCase() === sampleCode.toUpperCase());
            const isAdminCode = (sampleCode.toUpperCase() === MECHANIC_CODE.toUpperCase());
            if (!isRealOrder && !isAdminCode) {
                existsInOrders = false;
            }
        }
        return sampleCode;
    }

    // --- Dynamic Random Placeholder for Order Code ---
    function setRandomPlaceholder() {
        if (!accessCodeInput) return;
        const sampleCode = generateSecureCode();
        accessCodeInput.placeholder = `Wprowadź kod zlecenia (np. ${sampleCode})`;
    }
    setRandomPlaceholder();

    // --- Real-time Updates (Listen to other tabs) ---
    window.addEventListener('storage', (e) => {
        if (e.key === 'bikefix_orders') {
            orders = JSON.parse(e.newValue) || [];
            
            if (isMechanicView) {
                renderMechanicOrders();
            }
            
            if (activeCustomerOrderCode) {
                const updatedOrder = orders.find(o => o.clientCode === activeCustomerOrderCode);
                if (updatedOrder) {
                    renderCustomerView(updatedOrder);
                }
            }
        }
    });

    // --- Authentication ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = accessCodeInput.value.trim().toUpperCase();
        
        if (code.toUpperCase() === MECHANIC_CODE.toUpperCase()) {
            hideAllViews();
            isMechanicView = true;
            renderMechanicOrders();
            viewMechanic.classList.remove('hidden');
            triggerAnimations(viewMechanic);
        } else {
            const order = orders.find(o => o.clientCode === code);
            if (order) {
                order.viewCount = (order.viewCount || 0) + 1;
                saveOrders();

                hideAllViews();
                activeCustomerOrderCode = code;
                renderCustomerView(order);
                viewCustomer.classList.remove('hidden');
                triggerAnimations(viewCustomer);
            } else {
                showError();
            }
        }
    });

    function showError() {
        errorMsg.classList.remove('hidden');
        accessCodeInput.style.borderColor = '#ff3333';
        setTimeout(() => {
            errorMsg.classList.add('hidden');
            accessCodeInput.style.borderColor = '';
        }, 3000);
    }

    // --- Common Functions ---
    function hideAllViews() {
        viewLogin.classList.add('hidden');
        viewCustomer.classList.add('hidden');
        viewMechanic.classList.add('hidden');
        errorMsg.classList.add('hidden');
        accessCodeInput.value = '';
        accessCodeInput.style.borderColor = '';
        activeCustomerOrderCode = null;
        isMechanicView = false;
    }

    function triggerAnimations(container) {
        const elements = container.querySelectorAll('.reveal');
        elements.forEach(el => {
            el.style.animation = 'none';
            el.offsetHeight; 
            el.style.animation = null; 
        });
    }

    window.logout = function() {
        hideAllViews();
        setRandomPlaceholder();
        viewLogin.classList.remove('hidden');
        triggerAnimations(viewLogin);
    };

    window.closeModals = function() {
        modalAddOrder.classList.add('hidden');
        modalManageOrder.classList.add('hidden');
        tempOrder = null; 
    };

    function saveOrders() {
        localStorage.setItem('bikefix_orders', JSON.stringify(orders));
    }

    // --- Customer View Logic ---
    function renderCustomerView(order) {
        document.getElementById('customer-order-id').innerText = order.clientCode;
        document.getElementById('customer-bike').innerText = order.bikeModel;
        document.getElementById('customer-date').innerText = order.date;
        
        const allDone = order.tasks.length > 0 && order.tasks.every(t => t.done);
        const customerStatusDot = document.getElementById('customer-status-dot');
        const customerStatusText = document.getElementById('customer-status-text');
        const customerStatusDesc = document.getElementById('customer-status-desc');

        if (allDone || order.status === 'Gotowe') {
            customerStatusDot.classList.remove('pulse');
            customerStatusDot.classList.add('stopped');
            customerStatusText.innerText = 'Rower gotowy do odbioru!';
            customerStatusDesc.innerText = 'Wszystkie prace zostały zakończone. Możesz odebrać swój rower lub czekać na transport powrotny.';
        } else {
            customerStatusDot.classList.add('pulse');
            customerStatusDot.classList.remove('stopped');
            customerStatusText.innerText = 'W trakcie naprawy';
            customerStatusDesc.innerText = 'Nasz serwisant Łukasz pracuje nad Twoim rowerem. Poniżej widzisz aktualny postęp prac.';
        }

        // Calculate progress percentage based on completed tasks
        const totalTasks = order.tasks ? order.tasks.length : 0;
        const doneTasks = order.tasks ? order.tasks.filter(t => t.done).length : 0;
        const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        const percentEl = document.getElementById('customer-progress-percent');
        const countEl = document.getElementById('customer-progress-count');
        const barEl = document.getElementById('customer-progress-bar');
        
        if (percentEl) percentEl.innerText = `${percent}%`;
        if (countEl) countEl.innerText = `${doneTasks} z ${totalTasks} usług`;
        if (barEl) barEl.style.width = `${percent}%`;

        const taskListContainer = document.getElementById('customer-task-list');
        taskListContainer.innerHTML = '';

        order.tasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = `task-item ${task.done ? 'done' : ''}`;
            taskEl.innerHTML = `
                <div class="task-info">
                    <div class="customer-check"></div>
                    <span class="task-name">${task.name}</span>
                </div>
                <span class="task-price">${task.price} zł</span>
            `;
            taskListContainer.appendChild(taskEl);
        });
        
        let calculatedSum = order.tasks.reduce((sum, t) => sum + Number(t.price), 0);
        let displayPrice = order.customPrice !== undefined ? order.customPrice : calculatedSum;
        document.getElementById('customer-total-price').innerText = `${displayPrice} zł`;
    }

    // --- Mechanic View Logic ---
    window.switchMechanicTab = function(tab) {
        currentMechanicTab = tab;
        document.getElementById('tab-active').classList.toggle('active', tab === 'active');
        document.getElementById('tab-archive').classList.toggle('active', tab === 'archive');
        
        renderMechanicOrders();
    };

    window.renderMechanicOrders = function() {
        const grid = document.getElementById('mechanic-orders-grid');
        grid.innerHTML = '';
        const searchInput = document.getElementById('main-search-input');
        const searchVal = searchInput ? searchInput.value.toUpperCase().trim() : '';

        // Automatically update order statuses based on tasks before filtering
        orders.forEach(order => {
            const allDone = order.tasks.length > 0 && order.tasks.every(t => t.done);
            if (allDone && order.status !== 'Gotowe' && order.status !== 'Odebrane') {
                order.status = 'Gotowe';
                saveOrders();
            } else if (!allDone && order.status === 'Gotowe') {
                order.status = 'W trakcie';
                saveOrders();
            }
        });

        // Filter orders based on active tab and multi-field search (code, name, bike, phone)
        let filteredOrders = orders.filter(order => {
            const matchesTab = currentMechanicTab === 'active' ? order.status !== 'Odebrane' : order.status === 'Odebrane';
            if (!matchesTab) return false;

            if (searchVal) {
                const codeMatch = (order.clientCode || '').toUpperCase().includes(searchVal);
                const nameMatch = (order.clientName || '').toUpperCase().includes(searchVal);
                const bikeMatch = (order.bikeModel || '').toUpperCase().includes(searchVal);
                const phoneMatch = (order.phone || '').toUpperCase().includes(searchVal);
                return codeMatch || nameMatch || bikeMatch || phoneMatch;
            }
            return true;
        });

        // Show/hide and update Archive Accounting Summary
        const archiveSummaryBox = document.getElementById('archive-summary-box');
        if (currentMechanicTab === 'archive') {
            // Sort completed orders chronologically by handover timestamp
            filteredOrders.sort((a, b) => (a.pickedUpTimestamp || 0) - (b.pickedUpTimestamp || 0));

            const totalRevenue = filteredOrders.reduce((sum, o) => {
                let calcSum = o.tasks ? o.tasks.reduce((s, t) => s + Number(t.price), 0) : 0;
                let price = o.customPrice !== undefined ? Number(o.customPrice) : calcSum;
                return sum + price;
            }, 0);

            if (archiveSummaryBox) {
                archiveSummaryBox.classList.remove('hidden');
                document.getElementById('archive-count').innerText = filteredOrders.length;
                document.getElementById('archive-total-revenue').innerText = `${totalRevenue} zł`;
            }
        } else {
            if (archiveSummaryBox) {
                archiveSummaryBox.classList.add('hidden');
            }
        }

        // Render Cards
        filteredOrders.forEach((order, idx) => {
            let badgeClass = 'badge-progress';
            if (order.status === 'Gotowe') badgeClass = 'badge-done';
            if (order.status === 'Odebrane') badgeClass = 'badge-done';

            let calculatedSum = order.tasks ? order.tasks.reduce((sum, t) => sum + Number(t.price), 0) : 0;
            let displayPrice = order.customPrice !== undefined ? order.customPrice : calculatedSum;
            
            let actionHtml = `<button class="btn btn--outline btn--small" onclick="openManageOrder('${order.id}')">${order.status === 'Odebrane' ? 'Podejrzyj / Edytuj' : 'Zarządzaj'}</button>`;
            
            if (order.status === 'Gotowe') {
                actionHtml += `<button class="btn btn--primary btn--small" style="margin-top: 0.5rem; border-color: var(--accent);" onclick="markOrderPickedUp(event, '${order.id}')">Rower Wydany</button>`;
            }

            if (order.status === 'Odebrane') {
                actionHtml += `<button class="btn btn--outline btn--small" style="margin-top: 0.5rem; border-color: var(--red); color: var(--red);" onclick="revertOrderPickedUp(event, '${order.id}')">Cofnij Wydanie</button>`;
            }

            // Delete order button
            actionHtml += `<button class="btn btn--danger btn--small" style="margin-top: 0.5rem; border-color: var(--red); color: var(--red);" onclick="deleteOrder(event, '${order.id}')">Usuń</button>`;

            // Accounting Badge & Date info for Archived orders
            let archiveHeaderHtml = '';
            if (order.status === 'Odebrane') {
                archiveHeaderHtml = `
                    <div style="background: rgba(21, 255, 0, 0.06); border: 1px dashed rgba(21, 255, 0, 0.3); padding: 0.5rem 0.8rem; border-radius: 6px; margin: 0.6rem 0; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                        <span style="font-weight: bold; color: var(--accent);">Lp. #${idx + 1}</span>
                        <span style="color: var(--text-muted);">Wydano: <strong style="color: var(--white);">${order.pickedUpDate || 'bd.'}</strong></span>
                        <span style="font-weight: bold; color: var(--accent); font-size: 0.95rem;">${displayPrice} zł</span>
                    </div>
                `;
            }

            // Task preview html (Zielony = Zrobione, Czerwony = Do zrobienia)
            let tasksPreviewHtml = '';
            if (order.tasks && order.tasks.length > 0) {
                tasksPreviewHtml = `<div class="card-tasks-preview" style="margin: 0.8rem 0; display: flex; flex-direction: column; gap: 0.35rem; background: var(--bg-alt); padding: 0.6rem; border-radius: 6px; border: 1px solid var(--border);">`;
                order.tasks.forEach((task, tIdx) => {
                    const isDone = task.done;
                    const color = isDone ? 'var(--accent)' : 'var(--red)';
                    const bgBadge = isDone ? 'rgba(21, 255, 0, 0.08)' : 'rgba(255, 51, 51, 0.08)';
                    tasksPreviewHtml += `
                        <div onclick="toggleTaskFromCard(event, '${order.id}', ${tIdx})" title="Kliknij, aby zmienić status" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; padding: 0.3rem 0.5rem; border-radius: 4px; background: ${bgBadge}; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                            <span style="color: var(--white); ${isDone ? 'opacity: 0.7; text-decoration: line-through;' : 'font-weight: 500;'}">${task.name}</span>
                            <span style="color: ${color}; font-weight: bold; font-size: 0.75rem; display: flex; align-items: center; gap: 0.35rem;">
                                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; box-shadow: 0 0 6px ${color};"></span>
                                ${isDone ? 'ZROBIONE' : 'DO ZROBIENIA'}
                            </span>
                        </div>
                    `;
                });
                tasksPreviewHtml += `</div>`;
            } else {
                tasksPreviewHtml = `<div style="margin: 0.8rem 0; font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Brak zadań</div>`;
            }
            
            // Section for Opinion / Notes in Archived Orders
            let reviewHtml = '';
            
            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `
                <div class="order-head" style="margin-bottom: 0.8rem;">
                    <span class="order-status ${badgeClass}">${order.status}</span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem 1rem; margin-bottom: 1rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 6px; border: 1px solid var(--border);">
                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.2rem;">Kod zlecenia</span>
                        <span style="cursor: pointer; user-select: none; font-family: var(--font-display); font-size: 1.3rem; color: var(--white); display: inline-flex; align-items: center; gap: 0.3rem;" onclick="copyOrderCode(event, '${order.clientCode}')" title="Kliknij, aby skopiować kod zlecenia do schowka">
                            <span class="code-text" style="color: var(--white);">${order.clientCode}</span>
                            <span style="font-size: 0.85rem; opacity: 0.8;">📋</span>
                            <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);" title="Liczba wejść klienta na zlecenie">👁️ ${order.viewCount || 0}</span>
                        </span>
                    </div>

                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.2rem;">Rower</span>
                        <span style="font-weight: 500; font-size: 1.05rem; color: var(--white);">${order.bikeModel}</span>
                    </div>

                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.2rem;">Klient</span>
                        <span style="font-weight: 600; font-size: 1.05rem; color: var(--white);">${order.clientName || 'Brak imienia'}</span>
                    </div>

                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.2rem;">Numer telefonu</span>
                        <span style="cursor: pointer; user-select: none; font-size: 0.95rem; color: var(--white);" onclick="copyPhoneNumber(event, '${order.phone || ''}')" title="Kliknij, aby skopiować numer telefonu do schowka">
                            <span class="phone-text" style="text-decoration: underline; font-weight: 500; color: var(--white);">${order.phone || 'Brak telefonu'}</span>
                            <span style="font-size: 0.85rem; opacity: 0.8; margin-left: 0.2rem;">📋</span>
                        </span>
                    </div>
                </div>

                ${archiveHeaderHtml}
                ${tasksPreviewHtml}
                ${reviewHtml}
                <div style="display:flex; flex-direction:column; gap:0.3rem; margin-top: 0.6rem;">
                    ${actionHtml}
                </div>
            `;
            grid.appendChild(card);
        });

        // Add "New Order" card only in active tab
        if (currentMechanicTab === 'active') {
            const addNewCard = document.createElement('div');
            addNewCard.className = 'order-card new-order';
            addNewCard.onclick = openAddOrderModal;
            addNewCard.innerHTML = `
                <div class="add-icon">+</div>
                <h3>Dodaj nowe zlecenie</h3>
            `;
            grid.appendChild(addNewCard);
        } else if (filteredOrders.length === 0) {
            grid.innerHTML = '<p class="sub-text" style="grid-column: 1/-1;">Brak zleceń pasujących do kryteriów.</p>';
        }
    };

    window.markOrderPickedUp = function(event, orderId) {
        event.stopPropagation();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = 'Odebrane';
            if (!order.pickedUpDate) {
                const now = new Date();
                order.pickedUpDate = now.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
                order.pickedUpTimestamp = now.getTime();
            }

            saveOrders();
            renderMechanicOrders();
        }
    };

    window.revertOrderPickedUp = function(event, orderId) {
        event.stopPropagation();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = 'Gotowe';
            delete order.pickedUpDate;
            delete order.pickedUpTimestamp;
            saveOrders();
            renderMechanicOrders();
        }
    };

    window.toggleTaskFromCard = function(event, orderId, taskIndex) {
        event.stopPropagation();
        const order = orders.find(o => o.id === orderId);
        if (order && order.tasks[taskIndex]) {
            order.tasks[taskIndex].done = !order.tasks[taskIndex].done;
            const allDone = order.tasks.length > 0 && order.tasks.every(t => t.done);
            if (allDone && order.status !== 'Odebrane') {
                order.status = 'Gotowe';
            } else if (!allDone && order.status === 'Gotowe') {
                order.status = 'W trakcie';
            }
            saveOrders();
            renderMechanicOrders();
        }
    };

    window.toggleReviewBox = function(event, orderId) {
    event.stopPropagation();
    const box = document.getElementById(`review-box-${orderId}`);
    if (box) {
        box.classList.toggle('hidden');
        if (!box.classList.contains('hidden')) {
            const input = document.getElementById(`review-input-${orderId}`);
            if (input) {
                if (!input.value.trim()) {
                    const intro = getRandomIntro();
                    const opinions = generateThreeUniqueOpinions();
                    input.value = `${intro}\n${GOOGLE_REVIEW_LINK}\n${opinions.join('\n')}`;
                }
                input.focus();
            }
        }
    }
};

    window.saveOrderReview = function(event, orderId) {
        event.stopPropagation();
        const order = orders.find(o => o.id === orderId);
        const textarea = document.getElementById(`review-input-${orderId}`);
        if (order && textarea) {
            order.review = textarea.value.trim();
            saveOrders();
            renderMechanicOrders();
        }
    };



    window.copyPhoneNumber = function(event, phone) {
        event.stopPropagation();
        if (!phone || phone === 'Brak telefonu') return;
        
        const cleanPhone = phone.trim();
        const target = event.currentTarget;
        const phoneSpan = target.querySelector('.phone-text') || target;
        const originalHtml = phoneSpan.innerHTML;

        const showSuccess = () => {
            phoneSpan.innerHTML = `<span style="color: var(--accent); font-weight: bold;">✓ Skopiowano numer! (${cleanPhone})</span>`;
            setTimeout(() => {
                phoneSpan.innerHTML = originalHtml;
            }, 1800);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(cleanPhone).then(showSuccess).catch(() => {
                const tempInput = document.createElement('input');
                tempInput.value = cleanPhone;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                showSuccess();
            });
        } else {
            const tempInput = document.createElement('input');
            tempInput.value = cleanPhone;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            showSuccess();
        }
    };

    window.copyOrderCode = function(event, code) {
        event.stopPropagation();
        if (!code) return;
        
        const cleanCode = code.trim();
        const target = event.currentTarget;
        const codeSpan = target.querySelector('.code-text') || target;
        const originalText = codeSpan.innerText;

        const showSuccess = () => {
            codeSpan.innerText = `✓ Skopiowano kod!`;
            codeSpan.style.color = 'var(--accent)';
            setTimeout(() => {
                codeSpan.innerText = originalText;
                codeSpan.style.color = 'var(--white)';
            }, 1800);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(cleanCode).then(showSuccess).catch(() => {
                const tempInput = document.createElement('input');
                tempInput.value = cleanCode;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                showSuccess();
            });
        } else {
            const tempInput = document.createElement('input');
            tempInput.value = cleanCode;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            showSuccess();
        }
    };



    // Delete order function
window.deleteOrder = function(event, orderId) {
    event.stopPropagation();
    const index = orders.findIndex(o => o.id === orderId);
    if (index > -1) {
        orders.splice(index, 1);
        saveOrders();
        renderMechanicOrders();
    }
};

// Copy review function
window.copyReview = function(event, orderId) {
    event.stopPropagation();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const text = order.review || '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Skopiowano opinię!');
        }).catch(() => {
            const temp = document.createElement('input');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            alert('Skopiowano opinię!');
        });
    } else {
        const temp = document.createElement('input');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        alert('Skopiowano opinię!');
    }
};

// ----- Opinion generation helpers -----
const GOOGLE_REVIEW_LINK = 'https://g.page/r/Cd9LpVw85KyHEBM/review';
// Store used opinions to avoid repeats across orders
function getUsedOpinions(){
    const data = localStorage.getItem('bikefix_used_opinions');
    return data ? JSON.parse(data) : [];
}
function addUsedOpinions(opinions){
    const used = getUsedOpinions();
    const merged = used.concat(opinions);
    localStorage.setItem('bikefix_used_opinions', JSON.stringify(merged));
}
function generateUniqueOpinion(){
    const fragments = [
        'Serwis BikeFix bardzo pomocny, szybka obsługa i przystępne ceny.',
        'Profesjonalny zespół, który naprawdę zna się na rowerach.',
        'Miałem przyjemność skorzystać z usług – efekt przekroczył moje oczekiwania.',
        'Obsługa przyjazna, a naprawa została wykonana terminowo.',
        'Cenne wskazówki dotyczące konserwacji po wizycie w warsztacie.',
        'Rower po przeglądzie jeździ płynnie i cicho.',
        'Wysokiej jakości części zamienne użyte podczas naprawy.',
        'Przejrzyste wyceny i brak ukrytych kosztów.',
        'Doskonałe podejście do klienta i szczegółowe wyjaśnienia.',
        'Miejsce czyste, a prace wykonywane z dbałością o szczegóły.'
    ];
    // Randomly pick a fragment that hasn't been used yet
    const used = getUsedOpinions();
    const available = fragments.filter(f => !used.includes(f));
    if (available.length === 0) {
        // all used – reset pool
        localStorage.removeItem('bikefix_used_opinions');
        return fragments[Math.floor(Math.random()*fragments.length)];
    }
    const opinion = available[Math.floor(Math.random()*available.length)];
    addUsedOpinions([opinion]);
    return opinion;
}

// ----- Intro pool for review request -----
const introPool = [
    "Cześć! Twoja opinia jest dziś jednym z najważniejszych budulców zaufania – dzięki niej pomagasz innym znaleźć solidny serwis, a nam pozwalasz rozwijać BikeFix.",
    "Hej! Współczesny klient wybiera warsztat po przeczytaniu recenzji – podziel się swoją, aby inni mogli trafić właśnie do nas.",
    "Dzień dobry! Każda krótka recenzja to krok w kierunku lepszej widoczności BikeFix w internecie – pomóż nam rosnąć, oceniając naszą pracę.",
    "Witaj! Dzięki Twojej opinii nasz serwis staje się bardziej widoczny dla rowerzystów, a my możemy oferować jeszcze lepsze usługi – prosimy, oceń nas w Google.",
    "Cześć! Twoje doświadczenie jest dla nas dowodem jakości – podziel się nim, aby kolejne osoby mogły łatwo trafić na BikeFix.",
    "Hej! Recenzje kształtują reputację serwisów – Twoja pomoże nam w budowaniu marki, a innym ułatwi wybór naszego warsztatu.",
    "Dzień dobry! Twoja opinia to nasz najcenniejszy sygnał jakości w sieci – prosimy, poświęć chwilę i napisz krótką recenzję.",
    "Witaj! Dzięki Twojemu komentarzowi BikeFix będzie lepiej widoczny w wyszukiwaniach, a my będziemy mogli wprowadzać jeszcze lepsze rozwiązania.",
    "Cześć! Opinie klientów dziś decydują o tym, kto zostaje wybrany – pomóż nam być tym wyborem, oceniając nas w Google.",
    "Hej! Twoja recenzja to nie tylko podziękowanie dla nas, ale także wskazówka dla innych rowerzystów, że warto nam zaufać.",
    "Dzień dobry! Jeśli nasz serwis spełnił Twoje oczekiwania, podziel się wrażeniami w krótkiej recenzji – to naprawdę pomaga nam rosnąć.",
    "Witaj! Twoja opinia to kluczowy element naszej historii sukcesu – oceń nas, aby inni mogli skorzystać z naszych usług.",
    "Cześć! Dzięki Twojej recenzji BikeFix będzie łatwiej znaleźć w Google, a my będziemy mogli dalej podnosić standardy serwisu.",
    "Hej! Jeśli nasz serwis spełnił Twoje oczekiwania, podziel się tym w krótkiej recenzji – to naprawdę pomaga nam rosnąć.",
    "Dzień dobry! Twoja opinia jest dla nas bardzo cenna – prosimy, ocenić nas, abyśmy mogli dalej doskonalić nasze usługi."
];
function getRandomIntro(){
    return introPool[Math.floor(Math.random()*introPool.length)];
}



// --- Add Order Logic ---
    function openAddOrderModal() {
        newOrderTasks = [];
        document.getElementById('form-add-order').reset();
        document.getElementById('new-order-total').innerText = '0';
        renderNewOrderTasks();
        modalAddOrder.classList.remove('hidden');
    }

    window.generateCode = function() {
        const newCode = generateSecureCode();
        document.getElementById('new-client-code').value = newCode;
    };

    window.generateManageCode = function() {
        const newCode = generateSecureCode();
        document.getElementById('manage-client-code').value = newCode;
        updateTempOrderDetails();
    };
    
    window.addQuickService = function(name, price) {
        document.getElementById('new-task-name').value = name;
        document.getElementById('new-task-price').value = price;
        addTaskToNewOrder();
    }

    window.addTaskToNewOrder = function() {
        const name = document.getElementById('new-task-name').value;
        const price = document.getElementById('new-task-price').value;

        if (name && price) {
            newOrderTasks.push({ name, price: Number(price), done: false });
            document.getElementById('new-task-name').value = '';
            document.getElementById('new-task-price').value = '';
            renderNewOrderTasks();
        }
    };

    window.removeNewTask = function(index) {
        newOrderTasks.splice(index, 1);
        renderNewOrderTasks();
    };

    function renderNewOrderTasks() {
        const container = document.getElementById('new-tasks-container');
        container.innerHTML = '';
        let total = 0;
        
        newOrderTasks.forEach((task, index) => {
            total += Number(task.price);
            const line = document.createElement('div');
            line.className = 'small-task-line';
            line.innerHTML = `
                <span>${task.name} - <span class="accent-text">${task.price} zł</span></span>
                <span style="cursor:pointer; color:var(--text-muted);" onclick="removeNewTask(${index})">&times;</span>
            `;
            container.appendChild(line);
        });
        
        document.getElementById('new-order-total').innerText = total;
    }

    formAddOrder.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let calculatedSum = newOrderTasks.reduce((sum, t) => sum + Number(t.price), 0);
        
        const newOrder = {
            id: Date.now().toString(),
            clientName: document.getElementById('new-client-name').value || 'Brak imienia',
            bikeModel: document.getElementById('new-bike-model').value,
            phone: document.getElementById('new-client-phone').value,
            clientCode: document.getElementById('new-client-code').value.toUpperCase(),
            date: new Date().toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }),
            status: calculatedSum > 0 ? (newOrderTasks.every(t => t.done) ? 'Gotowe' : 'W trakcie') : 'Diagnoza',
            tasks: [...newOrderTasks],
            customPrice: calculatedSum
        };

        orders.push(newOrder);
        saveOrders();
        closeModals();
        renderMechanicOrders();
    });

    // --- Manage Order Logic (WITH TEMPORARY EDITING) ---
    window.openManageOrder = function(orderId) {
        currentEditingOrderId = orderId;
        const originalOrder = orders.find(o => o.id === orderId);
        if (!originalOrder) return;
        
        tempOrder = JSON.parse(JSON.stringify(originalOrder));

        document.getElementById('manage-client-code').value = tempOrder.clientCode || '';
        document.getElementById('manage-client-name').value = tempOrder.clientName || '';
        document.getElementById('manage-bike-model').value = tempOrder.bikeModel || '';
        document.getElementById('manage-client-phone').value = tempOrder.phone || '';
        
        const badge = document.getElementById('manage-order-status');
        badge.className = (tempOrder.status === 'Gotowe' || tempOrder.status === 'Odebrane') ? 'badge-done' : 'badge-progress';
        badge.innerText = tempOrder.status;

        renderManageTasks();
        modalManageOrder.classList.remove('hidden');
    };

    window.updateTempOrderDetails = function() {
        if (!tempOrder) return;
        tempOrder.clientCode = document.getElementById('manage-client-code').value.trim().toUpperCase();
        tempOrder.clientName = document.getElementById('manage-client-name').value.trim();
        tempOrder.bikeModel = document.getElementById('manage-bike-model').value.trim();
        tempOrder.phone = document.getElementById('manage-client-phone').value.trim();
    };

    function renderManageTasks() {
        if (!tempOrder) return;

        const container = document.getElementById('manage-tasks-container');
        container.innerHTML = '';
        let calculatedSum = 0;

        tempOrder.tasks.forEach((task, index) => {
            calculatedSum += Number(task.price);
            
            const taskEl = document.createElement('div');
            taskEl.className = `task-item ${task.done ? 'done' : ''}`;
            taskEl.style.flexDirection = 'column';
            taskEl.style.alignItems = 'stretch';
            taskEl.style.gap = '1rem';
            
            taskEl.innerHTML = `
                <div style="display:flex; justify-content: space-between; align-items: center;">
                    <span class="task-name" style="font-size: 1.1rem; font-weight: 500;">${task.name}</span>
                    <div style="display:flex; gap:1rem; align-items:center;">
                        <span class="task-price">${task.price} zł</span>
                        <span style="cursor:pointer; color:var(--text-muted); font-size: 1.5rem; line-height: 1;" onclick="deleteTaskFromExistingOrder(${index})">&times;</span>
                    </div>
                </div>
                
                <div style="display:flex; justify-content: flex-start; align-items: center; gap: 1rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05);">
                    <label class="switch">
                        <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTaskDone(${index})">
                        <span class="slider"></span>
                    </label>
                    <span style="color: ${task.done ? 'var(--accent)' : 'var(--red)'}; font-weight: bold; letter-spacing: 0.05em; font-size: 0.9rem;">
                        ${task.done ? 'ZROBIONE' : 'NIE ZROBIONE'}
                    </span>
                </div>
            `;
            container.appendChild(taskEl);
        });

        if (tempOrder.customPrice === undefined) {
            tempOrder.customPrice = calculatedSum;
        }

        document.getElementById('manage-calculated-sum').innerText = calculatedSum;
        document.getElementById('manage-total-price-input').value = tempOrder.customPrice;
    }
    
    window.updateCustomPrice = function() {
        if (tempOrder) {
            const newPrice = document.getElementById('manage-total-price-input').value;
            tempOrder.customPrice = Number(newPrice);
        }
    }

    window.toggleTaskDone = function(taskIndex) {
        if (tempOrder) {
            tempOrder.tasks[taskIndex].done = !tempOrder.tasks[taskIndex].done;
            renderManageTasks(); 
        }
    };
    
    window.addExistingQuickService = function(name, price) {
        document.getElementById('add-task-name').value = name;
        document.getElementById('add-task-price').value = price;
        addTaskToExistingOrder();
    }

    window.addTaskToExistingOrder = function() {
        const name = document.getElementById('add-task-name').value;
        const price = document.getElementById('add-task-price').value;

        if (name && price && tempOrder) {
            tempOrder.tasks.push({ name, price: Number(price), done: false });
            
            if (tempOrder.customPrice !== undefined) {
                tempOrder.customPrice += Number(price);
            }
            
            document.getElementById('add-task-name').value = '';
            document.getElementById('add-task-price').value = '';
            renderManageTasks();
        }
    };

    window.deleteTaskFromExistingOrder = function(taskIndex) {
        if (tempOrder) {
            const removedPrice = tempOrder.tasks[taskIndex].price;
            tempOrder.tasks.splice(taskIndex, 1);
            
            if (tempOrder.customPrice !== undefined) {
                tempOrder.customPrice = Math.max(0, tempOrder.customPrice - Number(removedPrice));
            }
            
            renderManageTasks();
        }
    }

    // --- Save button clicked ---
    window.saveManageOrder = function() {
        if (!tempOrder) return;
        
        updateTempOrderDetails();

        const index = orders.findIndex(o => o.id === currentEditingOrderId);
        if (index !== -1) {
            const allDone = tempOrder.tasks.length > 0 && tempOrder.tasks.every(t => t.done);
            // Jeśli było odebrane, nie zmieniaj na siłę na gotowe/w trakcie
            if (tempOrder.status !== 'Odebrane') {
                tempOrder.status = allDone ? 'Gotowe' : 'W trakcie';
            }
            
            // Zachowaj datę i znacznik wydania jeśli zlecenie było wcześniej w archiwum
            if (orders[index].pickedUpDate && !tempOrder.pickedUpDate) {
                tempOrder.pickedUpDate = orders[index].pickedUpDate;
            }
            if (orders[index].pickedUpTimestamp && !tempOrder.pickedUpTimestamp) {
                tempOrder.pickedUpTimestamp = orders[index].pickedUpTimestamp;
            }
            
            orders[index] = tempOrder;
            
            saveOrders();
            renderMechanicOrders();
            closeModals();
        }
    };

    // ==========================================================================
    // AI CONCIERGE & NAVIGATION AGENT LOGIC (FIXIE AI)
    // ==========================================================================

    const aiSpeechBubble = document.getElementById('ai-speech-bubble');
    const aiSpeechText = document.getElementById('ai-speech-text');
    const aiChatWindow = document.getElementById('ai-chat-window');
    const aiChatBody = document.getElementById('ai-chat-body');
    const aiChatChipsBar = document.getElementById('ai-chat-chips-bar');
    const aiChatInput = document.getElementById('ai-chat-input');

    // --- Fill Demo Code ---
    window.fillDemoCode = function(code) {
        if (!accessCodeInput) return;
        accessCodeInput.value = code;
        spotlightElement('access-code', `Wpisaliśmy dla Ciebie kod <strong>${code}</strong>. Kliknij zielony przycisk <em>"Sprawdź status"</em>!`);
    };

    // --- Toggle Speech Bubble ---
    window.toggleAISpeechBubble = function(show) {
        if (!aiSpeechBubble) return;
        if (show === undefined) {
            aiSpeechBubble.classList.toggle('hidden');
        } else if (show) {
            aiSpeechBubble.classList.remove('hidden');
        } else {
            aiSpeechBubble.classList.add('hidden');
        }
    };

    // --- Toggle Chat Window ---
    window.toggleAIChatWindow = function(show) {
        if (!aiChatWindow) return;
        if (show === undefined) {
            aiChatWindow.classList.toggle('hidden');
        } else if (show) {
            aiChatWindow.classList.remove('hidden');
            toggleAISpeechBubble(false);
            updateAIChatChips();
            if (aiChatInput) aiChatInput.focus();
        } else {
            aiChatWindow.classList.add('hidden');
        }
    };

    // --- Spotlight Element on Page ---
    window.spotlightElement = function(elementIdOrSelector, message) {
        // Remove active spotlights
        document.querySelectorAll('.ai-spotlight').forEach(el => el.classList.remove('ai-spotlight'));

        let targetEl = document.getElementById(elementIdOrSelector);
        if (!targetEl) {
            targetEl = document.querySelector(elementIdOrSelector);
        }

        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.classList.add('ai-spotlight');

            if (message && aiSpeechText) {
                aiSpeechText.innerHTML = message;
                toggleAISpeechBubble(true);
            }

            setTimeout(() => {
                if (targetEl) targetEl.classList.remove('ai-spotlight');
            }, 4500);
        }
    };

    // --- Update Dynamic Chips ---
    function updateAIChatChips() {
        if (!aiChatChipsBar) return;
        aiChatChipsBar.innerHTML = '';

        let chips = [];
        if (!viewLogin.classList.contains('hidden')) {
            chips = [
                { label: '🔑 Gdzie mam wpisać kod?', action: () => askAICierge('Gdzie mam wpisać kod?') },
                { label: '❓ Skąd wziąć kod zlecenia?', action: () => askAICierge('Skąd wziąć kod zlecenia?') },
                { label: '⚡ Użyj kod TOMEK123', action: () => fillDemoCode('TOMEK123') },
                { label: '🛠️ Kod Serwisanta (ADMIN)', action: () => fillDemoCode('ADMIN') }
            ];
        } else if (!viewCustomer.classList.contains('hidden')) {
            chips = [
                { label: '🗺️ Oprowadź mnie po panelu', action: () => askAICierge('Oprowadź mnie po tym panelu') },
                { label: '⏱️ Status & Czas odbioru', action: () => askAICierge('Gdzie jest status naprawy?') },
                { label: '💰 Kosztorys & Ceny części', action: () => askAICierge('Gdzie zobaczę ceny części?') },
                { label: '📋 Lista prac i zadań', action: () => askAICierge('Pokaż listę wykonanych prac') },
                { label: '📞 Kontakt do serwisu', action: () => askAICierge('Jak skontaktować się z mechanikiem?') }
            ];
        } else if (!viewMechanic.classList.contains('hidden')) {
            chips = [
                { label: '➕ Jak dodać nowe zlecenie?', action: () => askAICierge('Jak dodać nowe zlecenie?') },
                { label: '✏️ Jak zmienić status naprawy?', action: () => askAICierge('Jak zmienić status roweru?') },
                { label: '🔍 Wyszukiwanie klientów', action: () => askAICierge('Jak znaleźć zlecenie po nazwisku?') }
            ];
        }

        chips.forEach(chip => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ai-chip';
            btn.innerText = chip.label;
            btn.onclick = chip.action;
            aiChatChipsBar.appendChild(btn);
        });
    }

    // --- Submit Chat Form ---
    window.handleAIChatSubmit = function(e) {
        if (e) e.preventDefault();
        const text = aiChatInput.value.trim();
        if (!text) return;
        aiChatInput.value = '';
        askAICierge(text);
    };

    // --- Ask AI Concierge Engine ---
    window.askAICierge = function(userQuestion) {
        toggleAIChatWindow(true);

        // Render User Message
        appendChatMessage(userQuestion, 'user');

        // Thinking simulation
        setTimeout(() => {
            const response = processAIIntent(userQuestion);
            appendChatMessage(response.html, 'bot', response.action);
        }, 350);
    };

    function appendChatMessage(content, sender, action) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-msg ai-msg--${sender}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'ai-msg-bubble';
        bubble.innerHTML = content;
        msgDiv.appendChild(bubble);

        if (action) {
            const actionBtn = document.createElement('button');
            actionBtn.type = 'button';
            actionBtn.className = 'ai-action-btn';
            actionBtn.innerHTML = action.label;
            actionBtn.onclick = action.onClick;
            msgDiv.appendChild(actionBtn);
        }

        aiChatBody.appendChild(msgDiv);
        aiChatBody.scrollTop = aiChatBody.scrollHeight;
    }

    // --- AI Intent Processing Engine ---
    function processAIIntent(q) {
        const query = q.toLowerCase();

        // 1. Login / Code location
        if (query.includes('gdzie') && (query.includes('wpisać') || query.includes('kod') || query.includes('zalogować'))) {
            spotlightElement('access-code', 'Tutaj wpisujesz Twój kod zlecenia (np. TOMEK123)!');
            return {
                html: 'Pole do wpisania kodu zlecenia znajduje się w samym centrum ekranu. Właśnie <strong>podświetliłem je dla Ciebie jasną obramówką</strong>! Wpisz tam np. <code>TOMEK123</code> i kliknij <em>Sprawdź status</em>.',
                action: {
                    label: '⚡ Wypełnij kodem demo (TOMEK123)',
                    onClick: () => fillDemoCode('TOMEK123')
                }
            };
        }

        if (query.includes('skąd') || query.includes('zapomniałem') || query.includes('brak kodu')) {
            spotlightElement('login-box', 'Kod dostępu otrzymujesz przy przekazaniu roweru!');
            return {
                html: 'Unikalny kod zlecenia (np. <code>TOMEK123</code>) otrzymałeś od nas w <strong>wiadomości SMS</strong> lub na <strong>paragonie/potwierdzeniu przyjęcia roweru</strong>.<br><br>Jeśli nie masz kodu pod ręką, użyj naszego przycisku demo!',
                action: {
                    label: '⚡ Wypróbuj demo z kodem TOMEK123',
                    onClick: () => fillDemoCode('TOMEK123')
                }
            };
        }

        // 2. Guided Tour / Onboarding
        if (query.includes('oprowadź') || query.includes('co zrobić') || query.includes('na co patrzeć') || query.includes('jak działa')) {
            if (!viewCustomer.classList.contains('hidden')) {
                spotlightElement('customer-status-dot', 'Główny status naprawy i czas!');
                return {
                    html: 'Oto szybki przewodnik po Twoim panelu zlecenia:<br>' +
                          '1️⃣ <strong>Główny status:</strong> Na samej górze widzisz aktualny stan (np. <em>W trakcie naprawy</em> lub <em>Rower gotowy!</em>).<br>' +
                          '2️⃣ <strong>Pasek postępu:</strong> Pokazuje procent wykonanych usług.<br>' +
                          '3️⃣ <strong>Suma do zapłaty:</strong> Wyliczona cena na dole.',
                    action: {
                        label: '📍 Pokaż pasek postępu',
                        onClick: () => spotlightElement('customer-progress-bar', 'Tutaj widzisz postęp prac mechanika!')
                    }
                };
            } else {
                spotlightElement('access-code', 'Zaloguj się aby zobaczyć swój panel!');
                return {
                    html: 'Aby zobaczyć stan naprawy swojego roweru, musisz się najpierw zalogować. Wpisz swój kod zlecenia (np. <code>TOMEK123</code>) w podświetlone pole.',
                    action: {
                        label: '⚡ Wpisz kod TOMEK123',
                        onClick: () => fillDemoCode('TOMEK123')
                    }
                };
            }
        }

        // 3. Status & Time
        if (query.includes('status') || query.includes('kiedy') || query.includes('gotowy') || query.includes('odbiór')) {
            if (activeCustomerOrderCode) {
                const order = orders.find(o => o.clientCode === activeCustomerOrderCode);
                if (order) {
                    spotlightElement('customer-status-text', 'Aktualny status zlecenia!');
                    return {
                        html: `Twój rower <strong>${order.bikeModel}</strong> ma obecnie status: <span style="color:var(--accent); font-weight:bold;">${order.status}</span>.<br>Serwisant Łukasz pracuje nad Twoim zleceniem.`,
                        action: {
                            label: '📍 Pokaż szczegóły na ekranie',
                            onClick: () => spotlightElement('customer-status-dot', 'Pulsujący znacznik oznacza pracę na żywo!')
                        }
                    };
                }
            }
            spotlightElement('access-code', 'Zaloguj się najpierw!');
            return {
                html: 'Zaloguj się kodem zlecenia, aby zobaczyć dokładny czas i etap naprawy Twojego roweru!'
            };
        }

        // 4. Costs & Breakdown
        if (query.includes('koszt') || query.includes('cena') || query.includes('ile') || query.includes('zapłacę') || query.includes('części')) {
            if (!viewCustomer.classList.contains('hidden')) {
                spotlightElement('customer-total-price', 'Suma do zapłaty!');
                return {
                    html: 'Łączna kwota do zapłaty znajduje się pod podsumowaniem zlecenia. Przewinąłem stronę i <strong>podświetliłem kwotę</strong> na zielono!',
                    action: {
                        label: '📍 Pokaż listę usług i cen',
                        onClick: () => spotlightElement('customer-task-list', 'Oto pełna lista wykonanych prac i podzespołów!')
                    }
                };
            }
            return {
                html: 'Ceny poszczególnych części oraz robocizny zobaczysz po wpisaniu swojego kodu zlecenia.'
            };
        }

        // 5. Contact Mechanic
        if (query.includes('kontakt') || query.includes('telefon') || query.includes('wiadomość') || query.includes('mechanik')) {
            return {
                html: 'Możesz skontaktować się bezpośrednio z naszym serwisem pod numerem <strong>+48 600 800 900</strong> lub zostawić prośbę o pilny kontakt.',
                action: {
                    label: '📞 Zamów kontakt telefoniczny',
                    onClick: () => {
                        alert('Prośba o kontakt została wysłana do mechanika! Oddzwonimy w ciągu 15 minut.');
                    }
                }
            };
        }

        // Default Fallback Response
        return {
            html: 'Chętnie pomogę Ci odnaleźć się na stronie! Zapytaj mnie np. <em>"Gdzie mam wpisać kod?"</em>, <em>"Gdzie są koszty?"</em> lub <em>"Oprowadź mnie po panelu"</em>.',
            action: {
                label: '🗺️ Oprowadź mnie krok po kroku',
                onClick: () => askAICierge('Oprowadź mnie po tym panelu')
            }
        };
    }

    // ==========================================================================
    // FIXIK AI WIDGET LOGIC & BUSINESS RESPONSES (ZIELONA GÓRA)
    // ==========================================================================
    const fixikSentences = [
        "Jestem Fixik! Służę pomocą w serwisie 🔧",
        "Masz pytanie o swój rower? Kliknij we mnie! 🚴‍♂️",
        "Przegląd z MYCIEM za 65 zł? Wszystko wytłumaczę! 🧼",
        "Sprawdźmy razem status Twojego zlecenia! ✨",
        "Coś nie działa w rowerze? Jestem tu dla Ciebie! 🛠️",
        "Chcesz wiedzieć, kiedy odbiorzesz rower? Wpisz kod! 🔑",
        "Masz pytanie do mechanika? Śmiało pytaj! 📞",
        "Zadbamy o Twój rower najlepiej w Zielonej Górze! 🏆"
    ];

    let currentFixikSentenceIdx = 0;

    window.closeFixikSpeechBubble = function(event) {
        if (event) {
            event.stopPropagation();
        }
        const bubble = document.getElementById('fixik-speech-bubble');
        if (bubble) {
            bubble.style.display = 'none';
        }
    };

    function triggerFixikLiveliness() {
        const speechText = document.getElementById('fixik-speech-text');
        const avatarImg = document.querySelector('.fixik-character-img');
        const bubble = document.getElementById('fixik-speech-bubble');

        if (!speechText || !avatarImg) return;

        // 1. Trigger Liveliness Animation (bounce & wiggle & glow)
        avatarImg.classList.remove('fixik-bounce-animate');
        void avatarImg.offsetWidth; // Force reflow
        avatarImg.classList.add('fixik-bounce-animate');

        // 2. Smoothly rotate speech text
        if (bubble && bubble.style.display !== 'none') {
            speechText.style.opacity = '0';
            speechText.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            speechText.style.transform = 'translateY(-4px)';
            
            setTimeout(() => {
                currentFixikSentenceIdx = (currentFixikSentenceIdx + 1) % fixikSentences.length;
                speechText.innerText = fixikSentences[currentFixikSentenceIdx];
                speechText.style.opacity = '1';
                speechText.style.transform = 'translateY(0)';
            }, 250);
        }
    }

    // Start 6-second liveliness rotation
    setInterval(triggerFixikLiveliness, 6000);

    window.toggleFixikWindow = function(show) {
        const win = document.getElementById('fixik-window');
        if (!win) return;
        if (show === undefined) {
            win.classList.toggle('hidden');
        } else if (show) {
            win.classList.remove('hidden');
        } else {
            win.classList.add('hidden');
        }
    };

    window.sendFixikChip = function(text) {
        const input = document.getElementById('fixik-input');
        if (input) {
            input.value = text;
            sendFixikUserMsg();
        }
    };

    window.sendFixikUserMsg = function() {
        const input = document.getElementById('fixik-input');
        if (!input) return;
        const msg = input.value.trim();
        if (!msg) return;
        
        const body = document.getElementById('fixik-messages');
        if (!body) return;
        
        // User Message
        body.innerHTML += `<div class="fixik-msg fixik-msg--user">${escapeHtml(msg)}</div>`;
        input.value = '';
        body.scrollTop = body.scrollHeight;

        // Bot AI Response
        setTimeout(() => {
            const botReply = generateFixikReply(msg);
            body.innerHTML += `<div class="fixik-msg fixik-msg--bot">${botReply}</div>`;
            body.scrollTop = body.scrollHeight;
        }, 350);
    };

    function generateFixikReply(userMsg) {
        const q = userMsg.toLowerCase().trim();

        // --- ŻELAZNA ZASADA #1: KATEGORYCZNY ZAKAZ WYCEN / KOSZTÓW NAPRAW I CZĘŚCI ---
        if ((q.includes('ile kosztuje') || q.includes('wycena') || q.includes('koszt wymiany') || q.includes('cena części') || q.includes('cena czesci') || q.includes('za ile') || q.includes('ile za')) && !q.includes('przegląd') && !q.includes('przeglad')) {
            return `Szanowny Panie / Kierowniku! 🛠️<br><br>` +
                   `Jako wirtualny asystent nie posiadam uprawnień do tworzenia wycen napraw ani podawania szacunkowych cen części zamiennych.<br><br>` +
                   `Kwestiami wycen oraz kosztów części zajmuje się nasz prawdziwy człowiek-serwisant o imieniu **Łukasz**. Z pełną elokwencją i stuprocentową kulturą odsyłam Pana do Łukasza, który po oględzinach roweru osobiście ustali z Szanownym Panem wszelkie kwestie finansowe.<br><br>` +
                   `💡 <em>P.S. Jedyną stałą kwotą bazową jaką operuję jest nasz <strong>Przegląd ogólny za 65 zł</strong> (z darmowym dojazdem i myciem roweru), a koszty ewentualnych części Łukasz omówi z Panem na bieżąco! Dziękuję za wyrozumiałość, Szefie!</em>`;
        }

        // --- ŻELAZNA ZASADA #2: JEDYNA DOPUSZCZALNA CENA (65 zł za "Przegląd ogólny") & OFEROWANIE USŁUGI ---
        if (q === 'cennik' || q.includes('oferta') || q.includes('przegląd ogólny') || q.includes('przeglad ogolny') || q.includes('ile kosztuje przegląd') || q.includes('ile przegląd')) {
            return `Uszanowanie, Szanowny Panie! 🚴‍♂️✨<br><br>` +
                   `Z wielką dumą polecam naszą flagową usługę: <strong>Przegląd ogólny za jedyne 65 złotych</strong>!<br><br>` +
                   `• <strong>Regulacja i bezpieczeństwo:</strong> pełna regulacja komponentów oraz skrupulatna kontrola każdego połączenia śrubowego.<br>` +
                   `• <strong>Mycie w pakiecie (nasza duma):</strong> w innych serwisach nie myją rowerów, a my dbamy, by Twój sprzęt wyglądał jak nowy! Pełne czyszczenie i konserwacja są w cenie 65 zł.<br>` +
                   `• <strong>Darmowy dojazd:</strong> wprowadzamy nowe standardy i dojeżdżamy do klientów za darmo, bez ukrytych opłat. 🚐<br>` +
                   `• <strong>Części:</strong> dodatkowe zużyte części uzgadnia z Panem na bieżąco serwisant Łukasz.<br><br>` +
                   `W czym jeszcze mogę pomóc, Mistrzu? Dziękuję!`;
        }

        // --- DYNAMICZNE, LOGICZNE ARGUMENTY PRZEGLĄDU PRZY INNYCH TEMATACH ---

        // 3. Pytanie o Pompowanie / Ciśnienie / Wentyle
        if (q.includes('pomp') || q.includes('koło') || q.includes('kolo') || q.includes('opon') || q.includes('ciśnienie') || q.includes('cisnienie') || q.includes('wentyl')) {
            return `Kierowniku, z przyjemnością przedstawiam prostą instrukcję pompowania: 💨<br><br>` +
                   `1️⃣ <strong>Sprawdź wentyl:</strong> rowerowy (Dunlop), samochodowy (Schrader) lub wąski Presta (pamiętaj wykręcić nakrętkę przed pompowaniem!).<br>` +
                   `2️⃣ <strong>Ciśnienie z boku opony:</strong> odczytaj zalecany zakres w BAR (np. 2.8 - 4.5 BAR).<br>` +
                   `3️⃣ <strong>Dobór:</strong> miasto/szosa wymaga 4-5 BAR, a rower górski MTB ok. 2.0 - 2.8 BAR.<br><br>` +
                   `💡 <em>P.S. Gdyby przy okazji chciał Pan pełnego przeglądu śrub i profesjonalnego mycia napędu, nasz <strong>Przegląd ogólny za 65 zł z darmowym dojazdem</strong> jest do Pana dyspozycji, Szefie!</em>`;
        }

        // 4. Pytanie o Zimowanie / Konserwację roweru
        if (q.includes('zima') || q.includes('zimow') || q.includes('konserw') || q.includes('przechowyw')) {
            return `Czołem, Mistrzu! ❄️ Oto jak pięknie przygotować rower na zimę:<br><br>` +
                   `1️⃣ Umyj rower z błota i soli oraz wysusz napęd.<br>` +
                   `2️⃣ Nasmaruj łańcuch oliwką i dopompuj koła, aby rower nie stał na flaku.<br>` +
                   `3️⃣ Przechowuj sprzęt w suchym pomieszczeniu.<br><br>` +
                   `💡 <em>P.S. Przed zimą warto oddać rower w ręce serwisu – w ramach <strong>Przeglądu ogólnego za 65 zł</strong> zmyjemy cały brud, zrobimy przegląd śrub i dowieziemy rower pod same drzwi za darmo, Szanowny Panie!</em>`;
        }

        // 5. Pytanie o Łańcuch / Napęd / Smarowanie
        if (q.includes('łańcuch') || q.includes('lancuch') || q.includes('napęd') || q.includes('naped') || q.includes('oliwka') || q.includes('smarowanie')) {
            return `Kierowniku, czysty napęd to cicha i płynna jazda! ⚙️<br><br>` +
                   `1️⃣ Odtłuść łańcuch preparatem degreaser i przetrzyj szmatką.<br>` +
                   `2️⃣ Nałóż po 1 kropli oliwki rowerowej na każde ogniwo.<br>` +
                   `3️⃣ Po 5 minutach zetrzyj nadmiar oliwki suchą szmatką.<br><br>` +
                   `💡 <em>P.S. Pamiętaj, że w bikefix profesjonalne czyszczenie, mycie i konserwację całego roweru robimy w pakiecie <strong>Przeglądu ogólnego za 65 zł</strong> (u konkurencji nie myją rowerów!), Kapitanie!</em>`;
        }

        // 6. Pytanie o Hamulce / Piszczenie / Klocki
        if (q.includes('hamulec') || q.includes('hamulce') || q.includes('piszcz') || q.includes('klocki') || q.includes('tarcza')) {
            return `Przepraszam za głośne hamulce, Szefie! 🛑<br><br>` +
                   `Piszczenie najczęściej wynika z zatłuszczenia tarczy lub zużycia klocków. Przemyj tarczę alkoholem izopropylowym (IPA).<br><br>` +
                   `💡 <em>P.S. Bezpieczeństwo jest najważniejsze – w naszym <strong>Przeglądzie ogólnym za 65 zł</strong> sprawdzamy każde połączenie śrubowe i wyregulujemy hamulce, dojeżdżając do Pana gratis, Mistrzu!</em>`;
        }

        // 7. Wiedza o Panelu Klienta & Kodzie zlecenia
        if (q.includes('panel') || q.includes('kod') || q.includes('status') || q.includes('kiedy') || q.includes('gotowy') || q.includes('zalogow') || q.includes('aplikacj')) {
            return `Kierowniku, z radością wyjaśniam działanie Panelu Klienta! 💻<br><br>` +
                   `• Panel służy do monitorowania naprawy roweru na bieżąco.<br>` +
                   `• Logowanie odbywa się kodem zlecenia (np. <strong>BK9X2M</strong>).<br>` +
                   `• Widzi Pan procentowy postęp prac w czasie rzeczywistym.<br><br>` +
                   `💡 <em>P.S. Wszystkie zlecenia naszego <strong>Przeglądu ogólnego za 65 zł</strong> można u nas wygodnie śledzić na żywo w tym panelu, Szanowny Panie!</em>`;
        }

        // 8. Powitania
        if (q === 'cześć' || q === 'czesc' || q === 'siema' || q === 'hej' || q === 'dzień dobry' || q === 'dzien dobry' || q === 'witaj') {
            return `Uszanowanie, Szanowny Panie! 👋 Jestem <strong>Fixik 🤖</strong> – asystent i pomocna dłoń mobilnego serwisu rowerowego bikefix.<br><br>` +
                   `W czym mogę Panu dzisiaj pomóc, Kierowniku? Zawsze z radością służę radą i instrukcją!<br><br>` +
                   `💡 <em>P.S. Jeśli Twój rower wymaga serwisu, polecam nasz Przegląd ogólny za 65 zł z pełnym myciem i darmowym dojazdem! Dziękuję za wizytę.</em>`;
        }

        // 9. Podziękowania
        if (q.includes('dzięki') || q.includes('dzieki') || q.includes('dziękuję') || q.includes('super') || q.includes('ok') || q.includes('dobre')) {
            return `Bardzo proszę, Kapitanie! 🌟 Stuprocentowa kultura i pomoc klientowi to mój priorytet.<br><br>` +
                   `Dziękuję ślicznie i życzę bezpiecznej jazdy, Szefie! Do usług! 🚴‍♂️💨`;
        }

        // 10. Kontakt do Łukasza
        if (q.includes('kontakt') || q.includes('telefon') || q.includes('mechanik') || q.includes('łukasz') || q.includes('lukasz')) {
            return `Kierowniku! 🛠️ Naszym serwisem zajmuje się prawdziwy człowiek-serwisant Łukasz.<br><br>` +
                   `Łukasz osobiście ustala koszty części, diagnozuje usterki i dba o najwyższą jakość serwisu.<br><br>` +
                   `💡 <em>P.S. Nasz flagowy <strong>Przegląd ogólny kosztuje 65 zł</strong> (w tym mycie i darmowy dojazd), a wymiany dodatkowych części Łukasz uzgadnia z Panem na bieżąco! Dziękuję.</em>`;
        }

        // 11. Klasowa Odpowiedź Domyślna (Z zachęceniem i delikatnym logicznym argumentem)
        return `Szanowny Panie! 🚴✨ Jako życzliwy asystent bikefix z radością pomogę w każdej kwestii.<br><br>` +
               `Bardzo proszę doprecyzować pytanie odnośnie napędu, hamulców, pompowania lub działania panelu zlecenia.<br><br>` +
               `💡 <em>P.S. Jeśli Twój rower ma usterkę, przypominam że nasz <strong>Przegląd ogólny za 65 zł</strong> obejmuje regulacje, kontrole śrub, pełne mycie oraz darmowy dojazd do klienta! W czym mogę pomóc, Szefie?</em>`;
    }

    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // ==========================================================================
    // FIXIK DRAGGABLE WIDGET (TOUCH & MOUSE DRAG & DROP)
    // ==========================================================================
    const fixikContainer = document.getElementById('fixik-draggable-container');
    const fixikFabBtn = document.getElementById('fixik-fab-btn');

    if (fixikContainer && fixikFabBtn) {
        let isDragging = false;
        let hasMoved = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        // Restore saved position if available
        const savedPos = sessionStorage.getItem('fixik_position');
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                fixikContainer.style.left = pos.left + 'px';
                fixikContainer.style.top = pos.top + 'px';
                fixikContainer.style.bottom = 'auto';
                fixikContainer.style.right = 'auto';
            } catch(e) {}
        }

        function startDrag(clientX, clientY) {
            isDragging = true;
            hasMoved = false;
            startX = clientX;
            startY = clientY;
            
            const rect = fixikContainer.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
        }

        function moveDrag(clientX, clientY) {
            if (!isDragging) return;
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                hasMoved = true;
            }

            if (hasMoved) {
                let newLeft = initialLeft + deltaX;
                let newTop = initialTop + deltaY;

                // Keep within screen boundaries
                const maxLeft = window.innerWidth - fixikContainer.offsetWidth - 10;
                const maxTop = window.innerHeight - fixikContainer.offsetHeight - 10;
                newLeft = Math.max(10, Math.min(newLeft, maxLeft));
                newTop = Math.max(10, Math.min(newTop, maxTop));

                fixikContainer.style.left = newLeft + 'px';
                fixikContainer.style.top = newTop + 'px';
                fixikContainer.style.bottom = 'auto';
                fixikContainer.style.right = 'auto';
            }
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            if (hasMoved) {
                const rect = fixikContainer.getBoundingClientRect();
                sessionStorage.setItem('fixik_position', JSON.stringify({ left: rect.left, top: rect.top }));
            }
        }

        // Mouse Events
        fixikFabBtn.addEventListener('mousedown', (e) => {
            if (e.target.closest('.fixik-close')) return;
            startDrag(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
        window.addEventListener('mouseup', () => endDrag());

        // Touch Events (Smartphones)
        fixikFabBtn.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startDrag(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (isDragging && e.touches.length === 1) {
                moveDrag(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
        window.addEventListener('touchend', () => endDrag());

        // Prevent opening chat window if user dragged the widget
        fixikFabBtn.addEventListener('click', (e) => {
            if (hasMoved) {
                e.preventDefault();
                e.stopPropagation();
                hasMoved = false;
            }
        }, true);
    }
});

