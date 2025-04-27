import { BedrockAgentRuntimeClient, InvokeFlowCommand } from "@aws-sdk/client-bedrock-agent-runtime";

export interface ChatbotResponse {
    chatType: string,
    response: string,
}

export const getChatbotResponse = async (
    message: string,
    config?: { region: string, flowIdentifier: string, flowAliasIdentifier: string, accessKeyId: string, secretAccessKey: string },
): Promise<ChatbotResponse> => {
    // return new Promise((resolve, reject) => {
    //     setTimeout(() => {
    //         resolve({
    //             chatType: "chat",
    //             response: `Chatbot response to: ${message}`,
    //         });
    //     }, 1000); // Simulate a delay for the chatbot response
    // });

    if (!config) {
        return {
            chatType: "error",
            response: "Configuration is missing.",
        }
    }

    const client = new BedrockAgentRuntimeClient({
        region: config.region,
        credentials: {
            accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey
        }
    });
  
    const command = new InvokeFlowCommand({
        flowIdentifier: config.flowIdentifier,
        flowAliasIdentifier: config.flowAliasIdentifier,
        inputs: [
            {
            content: {
                document: message,
            },
            nodeName: "FlowInputNode",
            nodeOutputName: "document",
            },
        ],
    });
  
    let flowResponse = {};
    const response = await client.send(command);
  
    if (response.responseStream) {
        let ret: ChatbotResponse = {
            chatType: "error",
            response: "No response stream available.",
        };
        let counter = 0;

        for await (const chunkEvent of response.responseStream) {
            const { flowOutputEvent, flowCompletionEvent } = chunkEvent;
        
            if (flowOutputEvent) {
                flowResponse = { ...flowResponse, ...flowOutputEvent };
                console.log("Flow output event:", flowOutputEvent);

                if (!flowOutputEvent["content"]) continue;

                if (counter === 0) {
                    ret = {
                        response: ret.response,
                        chatType: flowOutputEvent["content"]["document"] as string,
                    };
                    counter++;
                } else {
                    ret = {
                        chatType: ret.chatType,
                        response: flowOutputEvent["content"]["document"] as string,
                    };
                }
            } else if (flowCompletionEvent) {
                flowResponse = { ...flowResponse, ...flowCompletionEvent };
                console.log("Flow completion event:", flowCompletionEvent);
            }
        }

        return ret;
    } else {
        return {
            chatType: "error",
            response: "No response stream available.",

        }
    }
};

// export const getChatbotResponse = async (message: string) => {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             resolve(`Chatbot response to: ${message}`);
//         }, 1000); // Simulate a delay for the chatbot response
//     });
// }