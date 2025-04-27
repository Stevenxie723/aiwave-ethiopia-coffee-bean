export const playInterruptedSound = (onEnd?: () => void) => {
    try {
        const audio = new Audio(`${process.env.PUBLIC_URL}/no_problem_you_first.mp3`);
        audio.play();
        audio.onended = () => {
            console.log("Sound ended");
            // Optionally, you can set the engine state back to Wait or any other state here
            // setEngineState(ChatbotEngineState.Wait);
            // Call the onEnd callback if provided
            onEnd?.();
        };

        audio.onerror = (error) => {
            console.error("Error playing sound:", error);
            // Handle the error if needed
            onEnd?.();
        };
    } catch (error) {
        console.error("Error playing interrupted sound:", error);
        // Handle the error if needed
        onEnd?.();
    }

    return;
}