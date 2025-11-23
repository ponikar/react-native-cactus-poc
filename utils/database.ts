import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

const TABLE_NAME = {
    memory_table: "_memory_table"
}

export const initDatabase = async () => {
    try {
        if (db) return db;
    
    console.log('[DB] Initializing database...');
    db = await SQLite.openDatabaseAsync(TABLE_NAME.memory_table, {
        useNewConnection: true,
    });
    
    // Load sqlite-vec extension
const extension = SQLite.bundledExtensions['sqlite-vec'];

console.log("extension", extension);

    if (extension) {
        db.loadExtensionSync(extension.libPath, extension.entryPoint);
        console.log('[DB] sqlite-vec extension loaded');

          await db.execAsync(`
        CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLE_NAME.memory_table} USING vec0(
            embedding float[384],
            metadata TEXT
        );
    `);
    } else {
        console.warn('[DB] sqlite-vec extension not found');
    }
    
  
    
    console.log('[DB] Database initialized');
    return db;
    } catch(e) {
        console.error('[DB] Error initializing database:', e);
        
    }
};

export const writeEmbedding = async (vector: number[], metadata?: Record<string, any>): Promise<number> => {
    const database = await initDatabase();
    const metadataStr = metadata ? JSON.stringify(metadata) : null;

    console.log("storing vector", vector);
    
    // Convert vector array to JSON string for sqlite-vec
    const vectorJson = JSON.stringify(vector);
    
    const result = await database?.runAsync(
        `INSERT INTO ${TABLE_NAME.memory_table} (embedding, metadata) VALUES (?, ?)`,
        vectorJson,
        metadataStr
    );
    
    console.log(`[DB] Write: Stored embedding with ID ${result?.lastInsertRowId}`);
    return result?.lastInsertRowId ?? -1;
};

export const searchSimilar = async (queryVector: number[], limit: number = 5): Promise<Array<{ id: number; metadata: any; distance: number }>> => {
    const database = await initDatabase();
    const queryVectorJson = JSON.stringify(queryVector);
    
    // Use KNN search with sqlite-vec
    const results = await database?.getAllAsync<{ rowid: number; metadata: string | null; distance: number }>(
        `SELECT rowid, metadata, distance 
         FROM ${TABLE_NAME.memory_table} 
         WHERE embedding MATCH ? 
         ORDER BY distance 
         LIMIT ?`,
        queryVectorJson,
        limit
    );
    
    console.log(`[DB] Search: Found ${results?.length} results`);
    return results?.map(row => ({
        id: row.rowid,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        distance: row.distance
    })) ?? [];
};

