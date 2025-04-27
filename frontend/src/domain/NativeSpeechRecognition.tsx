import { useEffect, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

export const useSpeechRecognitionWithSpeechEnd = (
    onSpeechEnd?: (transcript: string) => void,
    speechEndMilliseconds: number = 2000,
) => {
    const {
        transcript,
        interimTranscript,
        finalTranscript,
        listening,
        isMicrophoneAvailable,
        resetTranscript,
        browserSupportsSpeechRecognition,
        browserSupportsContinuousListening
    } = useSpeechRecognition();

    // const [,setCurrentEndSpeechTimeout] = useState<NodeJS.Timeout>();

    useEffect(() => {
        // if (finalTranscript) {
        //     console.log("Transcript updated:", finalTranscript);
        //     setCurrentEndSpeechTimeout(prev => {
        //         if (prev) {
        //             console.log("Clearing previous timeout:", prev);
        //             clearTimeout(prev);
        //         }
        //         return setTimeout(() => {
        //             onSpeechEnd?.(finalTranscript);
        //         }, speechEndMilliseconds); // Wait for 2 seconds after the last transcript update
        //     });
        // }
        if (finalTranscript) {
            onSpeechEnd?.(finalTranscript);
            resetTranscript();
        }
    }, [finalTranscript, onSpeechEnd, resetTranscript, speechEndMilliseconds]);

    const _resetTranscript = useCallback(() => {
        console.log("Resetting transcript");
        resetTranscript();
    }, [resetTranscript]);

    const startListening = useCallback(() => {
        SpeechRecognition.startListening({ continuous: true, language: 'zh-TW' });
    }, []);
    
    return {
        transcript,
        interimTranscript,
        finalTranscript,
        listening,
        isMicrophoneAvailable,
        resetTranscript: _resetTranscript,
        browserSupportsSpeechRecognition,
        browserSupportsContinuousListening,
        startListening
    }
}