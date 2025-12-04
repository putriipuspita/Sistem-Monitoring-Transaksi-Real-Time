// Import Library
const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express(); //Buat server baru
app.use(cors()); //untuk mengizinkan frontend akses
app.use(express.json()); //supaya servernya bisa nerima data json

// 1. KONEKSI MQTT (Tugas 1)
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com');
mqttClient.on('connect', () => console.log('MQTT Connected ✅'));

// Simulasi database
let transactions = [];
let nextId = 1;

// 2. API TRANSFER
app.post('/api/transfer', (req, res) => {
    const { from, to, amount } = req.body; //terima data dari frontend
    
    // Validasi mengecek apakah data nya udah di isi semua
    if (!from || !to || !amount) {
        return res.status(400).json({ error: 'Data tidak lengkap' });
    }
    
    // Simpan transaksi
    const transaction = {
        id: nextId++,
        from,
        to,
        amount: parseInt(amount),
        date: new Date().toISOString()
    };
    transactions.push(transaction);
    
    // 3. KIRIM KE MQTT
    const mqttPayload = JSON.stringify({
        id: transaction.id,
        message: `Transfer Rp${transaction.amount} dari ${transaction.from} ke ${transaction.to} berhasil`,
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount
    });
    
    mqttClient.publish('bank/transfer/success', mqttPayload);
    console.log('MQTT message sent');
    
    // Response
    res.json({ 
        success: true, 
        message: 'Transfer berhasil',
        id: transaction.id 
    });
});

// API lain
app.get('/api/transactions', (req, res) => {
    res.json({ transactions, total: transactions.length });
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'OK', 
        mqtt: mqttClient.connected ? 'Connected' : 'Disconnected',
        total: transactions.length 
    });
});

// Jalankan server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`
=====================================
SERVER BERJALAN
Port: ${PORT}
MQTT: broker.hivemq.com
=====================================
    `);
});