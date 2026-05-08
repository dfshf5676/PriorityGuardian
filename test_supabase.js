require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    console.log("Supabase URL:", process.env.SUPABASE_URL);
    console.log("Supabase Key:", process.env.SUPABASE_KEY.substring(0, 15) + "...");
    
    // Test Insert
    const { data, error } = await supabase.from('unanswered').insert([{
        name: 'Test',
        username: '@test',
        message: 'Test message',
        analysis: 'Test'
    }]).select();

    if (error) {
        console.error("Insert Error:", error.message);
    } else {
        console.log("Insert Success:", data);
        
        // Test Select
        const { data: selData, error: selError } = await supabase.from('unanswered').select('*');
        if (selError) {
            console.error("Select Error:", selError.message);
        } else {
            console.log("Select Success, rows:", selData.length);
        }
    }
}

test();
