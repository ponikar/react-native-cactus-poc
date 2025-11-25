import { CactusLM } from 'cactus-react-native';
import { OPSQLiteVectorStore } from '@react-native-rag/op-sqlite';
import { RecursiveCharacterTextSplitter } from 'react-native-rag';

export class SimpleRAG {
  private cactusLM: CactusLM;
  private vectorStore: OPSQLiteVectorStore | null = null;

  constructor(llm: CactusLM) {
    this.cactusLM = llm;

    const embeddings = {
      load: async () => embeddings,
      unload: async () => {},
      embed: async (text: string) => {
        const result = await this.cactusLM.embed({ text });
        return result.embedding;
      }
    };

    this.vectorStore = new OPSQLiteVectorStore({
      name: "rag-db-v3", // Changed name to force recreation with correct dimensions
      embeddings,
    });

  }
  async init() {
    this.vectorStore?.load();
  }

  async addDocument(text: string, metadata?: Record<string, any>): Promise<number> {
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1024, chunkOverlap: 100 });
    const chunks = await splitter.splitText(text);
    const store = this.vectorStore;

    if(!store) {
         console.error("Vector store not initialized");
         return -1;
    }

    for (const chunk of chunks) {
      const { embedding } = await this.cactusLM.embed({ text: chunk });
      await store.add({ embedding, metadata: { ...metadata, content: chunk } });
    }

    return chunks.length;
  }

  async search(query: string, limit = 5) {
    const store = this.vectorStore;
    const { embedding } = await this.cactusLM.embed({ text: query });
    
    const results = await store?.query({
      queryEmbedding: embedding,
      nResults: limit,
    });

    if(!results) {
         console.error("Vector store not initialized");
         return [];
    }

    return results.map(result => ({
      id: result.id,
      metadata: result.metadata as {
        content: string;
      },
      distance: 1 - result.similarity,
    }));
  }
}
