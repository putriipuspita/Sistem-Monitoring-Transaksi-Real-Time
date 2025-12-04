// app.js - JavaScript untuk frontend
// ========== KONFIGURASI ==========
const API_URL = 'http://localhost:3000/api';
let mqttClient = null;
let transferCount = 0;

// ========== INISIALISASI ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('Aplikasi dimulai...');
    
    updateTime();
    setInterval(updateTime, 1000);
    
    checkBackendStatus();
    setupMQTT();
    setupForm();
});

// ========== FUNGSI UTAMA ==========

// 1. Update waktu real-time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// 2. Cek status backend server
async function checkBackendStatus() {
    const statusElement = document.getElementById('backendStatus');
    
    try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        
        statusElement.textContent = '✅ Terhubung';
        statusElement.className = 'value';
        
        // Update total transfer
        const totalElement = document.getElementById('totalTransfers');
        if (totalElement) {
            totalElement.textContent = data.total;
            transferCount = data.total || 0;
        }
    } catch (error) {
        console.error('Backend error:', error);
        statusElement.textContent = 'Tidak terhubung';
        statusElement.className = 'value error';
    }
}

// 3. Setup koneksi MQTT (TUGAS 2)
function setupMQTT() {
    const statusElement = document.getElementById('mqttStatus');
    
    // Konfigurasi MQTT
    const options = {
        protocol: 'ws',
        hostname: 'broker.hivemq.com',
        port: 8000,
        path: '/mqtt',
        clientId: 'bank_client_' + Math.random().toString(16).substr(2, 8)
    };
    
    // Koneksi ke broker
    mqttClient = mqtt.connect(options);
    
    // Event: Terhubung
    mqttClient.on('connect', () => {
        console.log('✅ MQTT Connected!');
        statusElement.textContent = '✅ Terhubung';
        statusElement.className = 'value';
        
        // Subscribe ke topik (TUGAS 2)
        mqttClient.subscribe('bank/transfer/success', (error) => {
            if (error) {
                console.error('❌ Subscribe error:', error);
            } else {
                console.log('Subscribed to: bank/transfer/success');
            }
        });
    });
    
    // Event: Error
    mqttClient.on('error', (error) => {
        console.error('❌ MQTT Error:', error);
        statusElement.textContent = '❌ Error';
        statusElement.className = 'value error';
    });
    
    // Event: Menerima pesan (TUGAS 2)
    mqttClient.on('message', (topic, message) => {
        const data = JSON.parse(message.toString());
        console.log('MQTT Message received:', data);
        
        // Update UI
        updateLastTransaction(data);
        
        // Tampilkan notifikasi real-time
        showRealTimeNotification(data);
        
        // Tambah ke log
        addToNotificationLog(data);
        
        // Update counter
        transferCount++;
        document.getElementById('totalTransfers').textContent = transferCount;
    });
}

// 4. Setup form transfer
function setupForm() {
    const form = document.getElementById('transferForm');
    const submitBtn = document.getElementById('submitBtn');
    
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Ambil data form
        const fromAccount = document.getElementById('fromAccount').value.trim();
        const toAccount = document.getElementById('toAccount').value.trim();
        const amount = document.getElementById('amount').value;
        
        // Validasi
        if (!fromAccount || !toAccount || !amount) {
            alert('❌ Harap isi semua field!');
            return;
        }
        
        if (fromAccount === toAccount) {
            alert('❌ Akun pengirim dan penerima tidak boleh sama!');
            return;
        }
        
        if (parseInt(amount) < 1000) {
            alert('❌ Minimum transfer Rp 1.000!');
            return;
        }
        
        // Kirim ke backend
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        
        try {
            const response = await fetch(`${API_URL}/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: fromAccount,
                    to: toAccount,
                    amount: amount
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Tampilkan alert sukses
                alert(`✅ Transfer Berhasil!\nID: ${result.id}\nJumlah: Rp ${parseInt(amount).toLocaleString('id-ID')}`);
                
                // Reset form
                form.reset();
            } else {
                alert(`❌ Gagal: ${result.error || 'Terjadi kesalahan'}`);
            }
        } catch (error) {
            console.error('❌ Transfer error:', error);
            alert('❌ Gagal mengirim transfer. Pastikan backend berjalan!');
        } finally {
            // Enable button kembali
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Kirim Transfer</span>';
        }
    });
}

// 5. Update transaksi terakhir
function updateLastTransaction(data) {
    const lastTransactionElement = document.getElementById('lastTransaction');
    if (lastTransactionElement) {
        lastTransactionElement.textContent = 
            `ID ${data.id}: Rp ${data.amount.toLocaleString('id-ID')}`;
    }
}

// 6. Tampilkan notifikasi real-time (TUGAS 2 & 3)
function showRealTimeNotification(data) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    // Buat elemen notifikasi
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-check-circle"></i>
        </div>
        <div class="notification-content">
            <h4>Transfer Berhasil!</h4>
            <p><strong>ID:</strong> ${data.id}</p>
            <p><strong>Dari:</strong> ${data.from}</p>
            <p><strong>Ke:</strong> ${data.to}</p>
            <p><strong>Jumlah:</strong> Rp ${data.amount.toLocaleString('id-ID')}</p>
            <small>${new Date().toLocaleTimeString('id-ID')}</small>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Tambah ke container
    container.appendChild(notification);
    
    // Auto hapus setelah 5 detik
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// 7. Tambah ke log notifikasi
function addToNotificationLog(data) {
    const logContainer = document.getElementById('notificationLog');
    if (!logContainer) return;
    
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID');
    
    logItem.innerHTML = `
        <div class="log-header">
            <span class="log-id">ID: ${data.id}</span>
            <span class="log-time">${timeString}</span>
        </div>
        <p class="log-message">
            <strong>${data.message}</strong><br>
            <small>Dari: ${data.from} → Ke: ${data.to}</small>
        </p>
    `;
    
    // Tambah di paling atas
    if (logContainer.firstChild) {
        logContainer.insertBefore(logItem, logContainer.firstChild);
    } else {
        logContainer.appendChild(logItem);
    }
    
    // Batasi jumlah log (maksimal 10)
    const logItems = logContainer.getElementsByClassName('log-item');
    if (logItems.length > 10) {
        logContainer.removeChild(logItems[logItems.length - 1]);
    }
}

// 8. Fungsi bantuan untuk testing
window.testNotification = function() {
    const testData = {
        id: Math.floor(Math.random() * 1000),
        message: 'Transfer TEST berhasil!',
        from: '123456',
        to: '789012',
        amount: 100000,
        timestamp: new Date().toISOString()
    };
    
    showRealTimeNotification(testData);
    addToNotificationLog(testData);
};