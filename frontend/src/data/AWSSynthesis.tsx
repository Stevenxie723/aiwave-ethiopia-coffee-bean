import { Engine, LanguageCode, OutputFormat, PollyClient, SynthesizeSpeechCommand, TextType, VoiceId } from "@aws-sdk/client-polly";


// Source: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/polly/command/SynthesizeSpeechCommand/
export const awsTextToSpeechSynthesis = async (
    config: { region: string; accessKeyId: string; secretAccessKey: string; },
    text: string,
) => {
    try {
        // Initialize the Polly client
        const pollyClient = new PollyClient({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            }
        });

        const input = {
            Engine: Engine.STANDARD,
            LanguageCode: LanguageCode.cmn_CN,
            OutputFormat: OutputFormat.MP3,
            SampleRate: "16000",
            Text: text,
            TextType: TextType.TEXT,
            VoiceId: VoiceId.Zhiyu,
        }

        const command = new SynthesizeSpeechCommand(input);
        const response = await pollyClient.send(command);

        if (!response.AudioStream) {
            console.error("Error: No AudioStream in Polly response.");
            return undefined;
        }

        // Transform the AudioStream to a byte array and create an audio blob
        const audioBlob = await response.AudioStream.transformToByteArray();
        const audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: "audio/mpeg" }));

        return audioUrl;
    } catch (error) {
        console.error("Error synthesizing speech:", error);
        return undefined;
    }
}