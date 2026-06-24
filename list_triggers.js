const db = require('./db');

async function listTriggers() {
    try {
        const query = `
            SELECT 
                trigger_name, 
                event_object_table AS table_name, 
                action_statement AS action
            FROM information_schema.triggers;
        `;
        const res = await db.query(query);
        console.log("TRIGGERS:");
        console.log(JSON.stringify(res.rows, null, 2));

        const functionsQuery = `
            SELECT 
                routine_name, 
                routine_type
            FROM information_schema.routines
            WHERE routine_schema = 'public';
        `;
        const resFuncs = await db.query(functionsQuery);
        console.log("FUNCTIONS:");
        console.log(JSON.stringify(resFuncs.rows, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listTriggers();
