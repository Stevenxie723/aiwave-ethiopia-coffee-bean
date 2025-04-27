import { useState, useCallback } from "react";

export const useTextToSpeechSynthesis = () => {
    const [utterance, setUtterance] = useState<SpeechSynthesisUtterance>();

    const speak = useCallback((text: string) => {
        const synth = window.speechSynthesis;
        const u = new SpeechSynthesisUtterance(text);
        u.onend = () => {
            // onSpeakEnd?.();
            setUtterance(undefined);
        }
        u.onerror = (event) => {
            console.log("Speech synthesis error:", event.error);
        };
        setUtterance(u);
        synth.speak(u);
    }, []);

    const stopSpeaking = useCallback(() => {
        const synth = window.speechSynthesis;
        if (synth.speaking) {
            synth.cancel();
            setUtterance(undefined);
        }
    }   , []);

    return {
        speak,
        stopSpeaking,
        utterance
    }
};