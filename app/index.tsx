import { Text, View, TextInput, FlatList, TouchableOpacity } from "react-native";
import { Tool, useCactusLM, type Message } from 'cactus-react-native';
import { useEffect, useState } from "react";
import { Ionicons } from '@expo/vector-icons';
import { pickPDFFile, parsePDF } from "@/utils/pdfUtils";
import { SimpleRAG } from "@/utils/rag";


const tools: Tool[] = [
    {
        type: 'function',
        name: 'store_memory',
        description: 'Store important information as a memory for later retrieval. Before calling this, refine the content to be clear, concise, and searchable.',
        parameters: {
            type: 'object',
            properties: {
                content: {
                    type: 'string',
                    description: 'The refined and precise content to store. Be explicit and include relevant context.',
                },
                tags: {
                    type: 'string',
                    description: 'Optional comma-separated tags for categorization',
                },
            },
            required: ['content'],
        },
    },
    {
        type: 'function',
        name: 'recall_memory',
        description: 'Search for relevant memories based on a query',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'What to search for in stored memories',
                },
            },
            required: ['query'],
        },
    },
];




export default function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const cactusLM = useCactusLM();
    const [rag, setRag] = useState<SimpleRAG | null>(null);

    useEffect(() => {
        // Download the model if not already available
        if (!cactusLM.isDownloaded) {
            cactusLM.download();
        }

        // Initialize RAG with a new CactusLM instance
        if (cactusLM.isDownloaded && !rag) {
            (async () => {
                const lm = new (require('cactus-react-native').CactusLM)();
                const rag = new SimpleRAG(lm)
                await rag.init();
                setRag(rag);
            })()

        }
    }, [cactusLM.isDownloaded]);


    if (cactusLM.isDownloading) {
        return (
            <Text>
                Downloading model: {Math.round(cactusLM.downloadProgress * 100)}%
            </Text>
        );
    }

    const handleFunctionCall = async (name: string, args: Record<string, any>): Promise<string> => {
        switch (name) {
            case 'store_memory':
                if (!rag) return 'RAG not initialized';
                const content = args.content as string;
                const tags = args.tags as string | undefined;
                const count = await rag.addDocument(content, { tags });
                return `Memory stored successfully (${count} chunks)`;
            case 'recall_memory':
                if (!rag) return 'RAG not initialized';
                const query = args.query as string;
                const limit = (args.limit as number) || 5;
                const results = await rag.search(query, limit);
                if (results.length === 0) {
                    return 'No relevant memories found.';
                }
                return results.map((r, i) =>
                    `${i + 1}. ${r.metadata?.content || 'No content'} (distance: ${r.distance.toFixed(3)})`
                ).join('\n');
            default:
                return `Unknown function: ${name}`;
        }
    };

    const sendMessage = async () => {
        try {
            if (input.trim()) {

                setMessages(messages => [
                    ...messages,
                    {
                        role: "user",
                        content: input
                    }
                ])
                setInput("")



                const message = await cactusLM.complete({
                    messages: [
                        {
                            role: "system", content: `
                        Use tools when needed: 
                        You have access to the following tools:
                         
                        1. store_memory: Store important information for later retrieval
                           - Before calling, refine content to be clear and searchable
                           - Parameters: content (precise information), tags (optional)
                           - Example: "Remember that John's birthday is on March 15th"
                        
                        2. recall_memory: Search stored memories
                           - Parameters: query (what to search for), limit (optional, default 5)
                           - Example: "When is John's birthday?"
                        
                        IMPORTANT: When using tools, you MUST generate all required parameters yourself based on the conversation context. 
                        DO NOT ask the user to provide tool parameters. Extract information from the user's message and generate the parameters autonomously.
                        For example, if user says "remember my favorite color is blue", immediately call store_memory with content="User's favorite color is blue" without asking for confirmation or additional details.
                        `
                        },
                        ...messages, { role: 'user', content: input }], tools
                })

                console.log('Response:', message.response);
                console.log('Function calls:', message.functionCalls);

                if (message.functionCalls && message.functionCalls.length > 0) {
                    for (const call of message.functionCalls) {
                        const result = await handleFunctionCall(call.name, call.arguments);
                        setMessages(messages => [
                            ...messages,
                            {
                                role: "assistant",
                                content: result
                            }
                        ])
                    }
                } else {
                    setMessages(messages => [
                        ...messages,
                        {
                            role: "assistant",
                            content: message.response
                        }
                    ])
                }
            }
        } catch (error) {
            console.error("Error generating response:", error);
        }
    };

    const handlePickPDF = async () => {
        try {
            const file = await pickPDFFile();
            if (file) {
                const result = await parsePDF(file.uri);
                rag?.addDocument(result.text, { tags: file.name });
                setMessages(messages => [
                    ...messages,
                    {
                        role: "user",
                        content: `[PDF: ${file.name}]\n${result.text.substring(0, 500)}${result.text.length > 500 ? '...' : ''}`
                    }
                ]);
            }
        } catch (error) {
            console.error('Error picking/parsing PDF:', error);
            setMessages(messages => [
                ...messages,
                {
                    role: "assistant",
                    content: `Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ]);
        }
    };

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <FlatList
                data={messages}
                renderItem={({ item }) => (
                    <View style={{ padding: 10, backgroundColor: "#f0f0f0", marginBottom: 5, borderRadius: 5 }}>
                        <Text>{item.content}</Text>
                    </View>
                )}
                keyExtractor={(_, index) => index.toString()}
            />
            <View style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}>
                <TouchableOpacity
                    onPress={handlePickPDF}
                    style={{
                        padding: 10,
                        borderRadius: 5,
                        borderWidth: 1,
                        borderColor: "#ccc",
                        marginRight: 8,
                        justifyContent: "center",
                        alignItems: "center"
                    }}
                >
                    <Ionicons name="attach" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TextInput
                    style={{ flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5 }}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Type a message..."
                />
                <TouchableOpacity onPress={sendMessage} style={{ marginLeft: 10, backgroundColor: "#007AFF", padding: 10, borderRadius: 5, justifyContent: "center" }}>
                    <Text style={{ color: "white" }}>Send</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}