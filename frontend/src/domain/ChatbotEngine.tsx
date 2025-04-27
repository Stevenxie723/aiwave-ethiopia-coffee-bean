import { useCallback, useEffect, useState } from "react";
import { getChatbotResponse } from "../data/Chatbot.tsx";
import { useAWSTextToSpeechSynthesis } from "./AWSTextToSpeechSynthesis.tsx";
import { useSpeechRecognitionWithSpeechEnd } from "./NativeSpeechRecognition.tsx";
import { playInterruptedSound } from "../data/InterruptedSound.tsx";

// export type ChatbotEngineEmojiController = {
//     idle: () => void;
//     thinking: () => void;
//     speaking: () => void;
//     listening: () => void;
// };

enum ChatbotEngineState {
    Wait,
    WaitResponse,
    Response,
    Interrupted,
    Idle,
    ByeResponse,
};

export const useChatbotEngine = (controller?: {
    idle: () => void;
    thinking: () => void;
    speaking: () => void;
    listening: () => void;
    sleep: () => void;
}) => {
    // Display the task arrangement
    const [taskArrangementText, setTextArrangementText] = useState<string>("");

    // The engine state is used to determine the current state of the chatbot engine
    const [engineState, setEngineState] = useState<ChatbotEngineState>(ChatbotEngineState.Idle);

    const setEngineStateWithController = useCallback((state: ChatbotEngineState) => {
        setEngineState(prevState => {
            if (prevState !== state) {
                switch (state) {
                    case ChatbotEngineState.Wait:
                        controller?.idle();
                        break;
                    case ChatbotEngineState.WaitResponse:
                        controller?.thinking();
                        break;
                    case ChatbotEngineState.Response:
                        controller?.speaking();
                        break;
                    case ChatbotEngineState.Interrupted:
                        controller?.listening();
                        break;
                    case ChatbotEngineState.Idle:
                        controller?.sleep();
                        break;
                    default:
                        break;
                }
            }
            return state;
        })
    }, [controller]);

    // The text-to-speech synthesis library is used to convert text to speech
    // const { utterance, speak, stopSpeaking } = useTextToSpeechSynthesis();
    const { speak, stopSpeaking, registerOnStartListerner, unregisterOnStartListener, registerOnEndListerner, unregisterOnEndListener } = useAWSTextToSpeechSynthesis({
        region: process.env.REACT_APP_REGION!,
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY!,
    });

    // Speech system for the byebye response
    const { speak: speakByebye, registerOnEndListerner: registerEndByebye, unregisterOnEndListener: unregisterEndByebye } = useAWSTextToSpeechSynthesis({
        region: process.env.REACT_APP_REGION!,
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY!,
    });

    // Speech system for the interrupted response
    const { speak: speakInterrupted, registerOnEndListerner: registerEndInterrupted, unregisterOnEndListener: unregisterEndInterrupted } = useAWSTextToSpeechSynthesis({
        region: process.env.REACT_APP_REGION!,
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY!,
    });

    // Function to do when the speech ends
    const handleSpeechEnd = useCallback((transcript: string) => {
        const containsStartCommands = transcript.includes("你好");
        const containsFinishConversationCommands = ["掰掰", "掰", "再見", "拜", "拜拜"].some(command => transcript.includes(command));

        if (engineState === ChatbotEngineState.Wait && containsFinishConversationCommands) {
            console.log("Ending conversation commands:", transcript);
            // setEngineState(ChatbotEngineState.Interrupted);
            // controller?.listening();
            setEngineStateWithController(ChatbotEngineState.ByeResponse);

            // stopSpeaking();

            setTimeout(() => {
                speakByebye("好的，掰掰！");
            }, 1000); // Delay for 1 second before speaking the message
        } else if (engineState === ChatbotEngineState.Wait || (engineState === ChatbotEngineState.Idle && containsStartCommands)) {
            // setEngineState(ChatbotEngineState.WaitResponse);
            // controller?.thinking();
            setEngineStateWithController(ChatbotEngineState.WaitResponse);

            console.log("Speech ended with transcript:", transcript);
            setTextArrangementText("");

            getChatbotResponse(transcript, {
                region: process.env.REACT_APP_REGION!,
                flowIdentifier: process.env.REACT_APP_CHATBOT_FLOW_ID!,
                flowAliasIdentifier: process.env.REACT_APP_CHATBOT_ALIAS!,
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY!,
            }).then((response) => {
                console.log("Chatbot response:", response.response);
                // setEngineState(ChatbotEngineState.Response);
                if (response.chatType === 'Task Arrangement') {
                    setTextArrangementText(response.response);
                    speak("現在開始幫你處理任務");

                    setTimeout(() => {
                        setTextArrangementText("");
                    }, 10000); // Delay for 5 seconds before clearing the text
                } else {
                    speak(response.response); // Cast response to string
                }

            }).catch((error) => {
                console.error("Error getting chatbot response:", error);
                setEngineState(ChatbotEngineState.Wait);
                controller?.listening();
            });
        }
    }, [engineState, setEngineStateWithController, speakByebye, speak, controller]);
    
    // The speech recognition library is used to convert speech to text
    const { transcript, resetTranscript, startListening: _startListening } = useSpeechRecognitionWithSpeechEnd(handleSpeechEnd);

    const onSpeakStart = useCallback(() => {
        // setEngineState(prev => {
        //     if (prev === ChatbotEngineState.WaitResponse) {
        //         controller?.speaking();
        //         return ChatbotEngineState.Response;
        //     } else {
        //         console.log("onSpeakStart: Engine state is not WaitResponse, current state:", prev);
        //         return prev;
        //     }
        // })
        setEngineStateWithController(ChatbotEngineState.Response);
    }, [setEngineStateWithController]);

    const onSpeakEnd = useCallback(() => {  
        console.log("Speech synthesis ended");
        // setEngineState(ChatbotEngineState.Wait);
        // controller?.listening();
        setEngineStateWithController(ChatbotEngineState.Wait);

        resetTranscript();
    }, [resetTranscript, setEngineStateWithController]);

    // Handle stop commands
    const handleStopCommands = useCallback((transcript: string) => {
        const stopCommands = ["停止", "結束", "關閉", "結束對話", "關閉對話", "等一下", "稍等", "等等", "稍等一下", "欸欸"];
        
        if (stopCommands.some(command => transcript.includes(command))) {
            console.log("Stopping commands:", transcript);
            // setEngineState(ChatbotEngineState.Interrupted);
            // controller?.listening();
            setEngineStateWithController(ChatbotEngineState.Interrupted);
            resetTranscript();
            
            stopSpeaking();

            setTimeout(() => {
                // Speak a message to indicate that the chatbot is stopping
                // speak("好的，請問還有什麼需要幫忙的嗎？");
                // playInterruptedSound(onSpeakEnd);
                speakInterrupted("好的，請問還有什麼需要幫忙的嗎？");
            }, 1000); // Delay for 1 second before speaking the message
        }
    }, [setEngineStateWithController, resetTranscript, stopSpeaking, speakInterrupted]);

    
    // Set continuous listening to true to allow the user to speak continuously
    const startListening = useCallback(() => {
        _startListening();
        // setEngineState(ChatbotEngineState.Wait);
        // controller?.listening();

        setEngineStateWithController(ChatbotEngineState.Idle);

        // Send response
    }, [_startListening, setEngineStateWithController]);

    useEffect(() => {
        startListening();
    }, [startListening]);

    // Handle stop commands when the engine state is at Response
    useEffect(() => {
        if (transcript && engineState === ChatbotEngineState.Response) {
            handleStopCommands(transcript);
        }
    }, [engineState, handleStopCommands, transcript])

    useEffect(() => {
        registerOnEndListerner(onSpeakEnd);
        // return unregisterOnEndListener;
    }, [onSpeakEnd, registerOnEndListerner, unregisterOnEndListener]);

    useEffect(() => {
        registerOnStartListerner(onSpeakStart);
        // return unregisterOnStartListener;
    }, [onSpeakStart, registerOnStartListerner, unregisterOnStartListener]);

    useEffect(() => {
        registerEndByebye(() => {
            setEngineStateWithController(ChatbotEngineState.Idle);
        });

        return unregisterEndByebye
    }, [registerEndByebye, unregisterEndByebye, setEngineStateWithController]);

    useEffect(() => {
        registerEndInterrupted(() => {
            setEngineStateWithController(ChatbotEngineState.Wait);
        });

        return unregisterEndInterrupted
    }, [registerEndInterrupted, unregisterEndInterrupted, setEngineStateWithController]);


    return {
        transcript,
        engineState,
        taskArrangementText,
    }
}