import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3" 

export const fetchAudioFromS3 = async (
    configs: { region: string; accessKeyId: string; secretAccessKey: string; },
    audioKey: string
) => {
    try {
        // Initialize the S3 client
        const s3Client = new S3Client({
            region: configs.region,
            credentials: {
                accessKeyId: configs.accessKeyId,
                secretAccessKey: configs.secretAccessKey,
            }
        });

        const s3OutputPromise = s3Client.send(new GetObjectCommand({
            Bucket: process.env.REACT_APP_S3_BUCKET!,
            // Key: "fce71d45-4abe-4d03-bd08-67cb21ab3dbe.mp3",
            Key: audioKey,
        }))
        
        s3OutputPromise.catch((error) => {
            // console.error("Error getting the audio file from S3:", error);
            // onErrorCallback?.();
        });

        const s3Output = await s3OutputPromise;

        if (!s3Output.Body) {
            // console.error("Error: No Body in S3 GetObject response.");
            return;
        }

        // Transform the S3 object to a byte array and create an audio blob
        // return await s3Output.Body.transformToByteArray();
        const audioBlob = await s3Output.Body.transformToByteArray();
        const audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: "audio/mpeg" }));

        return audioUrl;
    } catch (error) {
        // console.error("Error fetching audio from S3:", error);
        return undefined;
    }
};