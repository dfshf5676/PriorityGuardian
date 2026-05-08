const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const UNANSWERED_FILE = path.join(__dirname, 'unanswered.json');

app.use(cors());
app.use(express.static('public'));

app.use(express.json());

app.get('/api/unanswered', (req, res) => {
    try {
        if (!fs.existsSync(UNANSWERED_FILE)) {
            return res.json({ pending: [] });
        }
        const data = fs.readFileSync(UNANSWERED_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.status(500).json({ error: "Failed to read data" });
    }
});

// Xabarni qo'lda "Bajarildi/Yopish" qilish uchun API
app.post('/api/resolve', (req, res) => {
    try {
        const { username } = req.body;
        if (!fs.existsSync(UNANSWERED_FILE)) return res.json({ success: true });
        
        let data = JSON.parse(fs.readFileSync(UNANSWERED_FILE, 'utf8'));
        const initialLength = data.pending.length;
        data.pending = data.pending.filter(p => p.username !== username);
        
        if (data.pending.length < initialLength) {
            fs.writeFileSync(UNANSWERED_FILE, JSON.stringify(data, null, 2));
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed" });
    }
});

app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 DASHBOARD TAYYOR!`);
    console.log(`Brauzeringizda quyidagi manzilni oching:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`=================================================\n`);
});
