const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase ulanishi
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

app.get('/api/unanswered', async (req, res) => {
    try {
        const { data, error } = await supabase.from('unanswered').select('*');
        if (error) throw error;
        res.json({ pending: data || [] });
    } catch (e) {
        console.error("Supabase Error:", e);
        res.status(500).json({ error: "Failed to read data" });
    }
});

// Xabarni qo'lda "Bajarildi/Yopish" qilish uchun API
app.post('/api/resolve', async (req, res) => {
    try {
        const { username } = req.body;
        await supabase.from('unanswered').delete().ilike('username', username);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed" });
    }
});

app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 DASHBOARD TAYYOR! (Port: ${PORT})`);
    console.log(`=================================================\n`);
});
