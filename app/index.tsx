import { Text, View, TextInput, FlatList, TouchableOpacity } from "react-native";
import { Tool, useCactusLM, type Message } from 'cactus-react-native';
import { useEffect, useState } from "react";


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

    const handleFunctionCall = (name: string, args: Record<string, any>): string => {
        switch (name) {
            case 'get_weather':
                const location = args.location as string;
                return `Weather in ${location}: Sunny, 72°F`;
            case 'send_email':
                const email = args.email as string;
                const subject = args.subject as string;
                const message = args.message as string;
                return `Email sent to ${email} with subject "${subject}"`;
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
                        `
                        },
                        ...messages, { role: 'user', content: input }], tools
                })

                console.log('Response:', message.response);
                console.log('Function calls:', message.functionCalls);

                if (message.functionCalls && message.functionCalls.length > 0) {
                    for (const call of message.functionCalls) {
                        const result = handleFunctionCall(call.name, call.arguments);
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