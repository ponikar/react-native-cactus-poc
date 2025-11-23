import { Text, View, TextInput, FlatList, TouchableOpacity } from "react-native";
import { Tool, useCactusLM, type Message } from 'cactus-react-native';
import { useEffect, useState } from "react";
import { initDatabase, writeEmbedding, searchSimilar } from "@/utils/database";


const tools: Tool[] = [
    {
        type: 'function',
        name: 'get_weather',
        description: 'Get current weather for a location',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'City name',
                },
            },
            required: ['location'],
        },
    },
    {
        type: 'function',
        name: 'send_email',
        description: 'Send an email to someone',
        parameters: {
            type: 'object',
            properties: {
                email: {
                    type: 'string',
                    description: 'Email address',
                },
                subject: {
                    type: 'string',
                    description: 'Email subject',
                },
                message: {
                    type: 'string',
                    description: 'Email message',
                },
            },
            required: ['email', 'subject', 'message'],
        },
    },
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

    const cactusLM = useCactusLM({

    });
    useEffect(() => {
        // Download the model if not already available
        if (!cactusLM.isDownloaded) {
            cactusLM.download();
        }
    }, []);


    if (cactusLM.isDownloading) {
        return (
            <Text>
                Downloading model: {Math.round(cactusLM.downloadProgress * 100)}%
            </Text>
        );
    }

    const handleFunctionCall = async (name: string, args: Record<string, any>): Promise<string> => {
        switch (name) {
            case 'get_weather':
                const location = args.location as string;
                return `Weather in ${location}: Sunny, 72°F`;
            case 'send_email':
                const email = args.email as string;
                const subject = args.subject as string;
                const message = args.message as string;
                return `Email sent to ${email} with subject "${subject}"`;
            case 'store_memory':
                const content = args.content as string;
                const tags = args.tags as string | undefined;
                const embeddingResult = await cactusLM.embed({ text: content });
                const id = await writeEmbedding(embeddingResult.embedding, { content, tags });
                return `Memory stored successfully with ID: ${id}`;
            case 'recall_memory':
                const query = args.query as string;
                const limit = (args.limit as number) || 5;
                const queryEmbeddingResult = await cactusLM.embed({ text: query });
                const results = await searchSimilar(queryEmbeddingResult.embedding, limit);
                if (results.length === 0) {
                    return 'No relevant memories found.';
                }
                return results.map((r, i) =>
                    `${i + 1}. ${r.metadata.content} (distance: ${r.distance.toFixed(3)})`
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
                        
                        1. get_weather: Get current weather for a location
                           - Parameters: location (city name)
                           - Example: "What's the weather in San Francisco?"
                        
                        2. send_email: Send an email to someone
                           - Parameters: email (email address), subject (email subject), message (email message)
                           - Example: "Send an email to john@example.com with subject 'Meeting' and message 'Let's meet tomorrow'"
                        
                        3. store_memory: Store important information for later retrieval
                           - Before calling, refine content to be clear and searchable
                           - Parameters: content (precise information), tags (optional)
                           - Example: "Remember that John's birthday is on March 15th"
                        
                        4. recall_memory: Search stored memories
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
            <View style={{ flexDirection: "row", marginTop: 10 }}>
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