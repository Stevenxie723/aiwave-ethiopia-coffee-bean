import { useCallback, useState } from "react";
import { awsTextToSpeechSynthesis } from "../data/AWSSynthesis.tsx";

// const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useAWSTextToSpeechSynthesis = (
    configs: { region: string; accessKeyId: string; secretAccessKey: string; },
) => {
    const [, setAudio] = useState<HTMLAudioElement | null>(null);

    const [onStartCallbacks, setOnStartCallback] = useState<(() => void)[]>([]);
    const [onFinishCallbacks, setOnFinishCallback] = useState<(() => void)[]>([]);

    const _speak = useCallback(async (text: string) => {
        const audioUrl = await awsTextToSpeechSynthesis(configs, text);

        if (!audioUrl) {
            console.error("Error: No audio URL returned from AWS Polly.");
            onFinishCallbacks.forEach(callback => { callback() }); 
            return;
        }

        const audio = new Audio(audioUrl);
        setAudio(audio);

        onStartCallbacks.forEach(callback => { callback() });
        
        audio.play().catch((error) => {
            console.error("Error playing audio:", error);
            onFinishCallbacks.forEach(callback => { callback() }); 
        });
        
        // Clean up the object URL after playback
        audio.addEventListener("ended", () => {
            console.log(`Audio ended event listener called.`);
            onFinishCallbacks.forEach(callback => { callback() }); 
            URL.revokeObjectURL(audioUrl);
        });
    }, [configs, onFinishCallbacks, onStartCallbacks]);

    const speak = useCallback((text: string) => {
        _speak(text).catch((error) => {
            console.error("Error in speak function:", error);
        }
    );}, [_speak]);

    const stopSpeaking = useCallback(() => {
        setAudio(prev => {
            prev?.pause();
            URL.revokeObjectURL(prev?.src || "");
            // Users should call the callback function
            return null;
        })
    }, []);

    const registerOnEndListerner = useCallback((callback: () => void) => {
        console.log("Registering on end listener:", callback);
        setOnFinishCallback(prev => {
            return [...prev, callback];
        })
    }, []);

    const unregisterOnEndListener = useCallback(() => {
        console.log("Unregistering on end listener");
        setOnFinishCallback([]);
    }, []);

    const registerOnStartListerner = useCallback((callback: () => void) => {
        console.log("Registering on start listener:", callback);
        setOnStartCallback(prev => {
            return [...prev, callback];
        })
    }, []);

    const unregisterOnStartListener = useCallback(() => {
        console.log("Unregistering on start listener");
        setOnStartCallback([]);
    }, []);

    return {
        speak,
        stopSpeaking,
        registerOnEndListerner,
        unregisterOnEndListener,
        registerOnStartListerner,
        unregisterOnStartListener
    }
  };