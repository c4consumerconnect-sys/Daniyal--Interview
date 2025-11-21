import { GoogleGenAI, Type, LiveServerMessage, Modality } from '@google/genai';
import { CVAnalysis, CVInput } from '../types';
import { createPcmBlob, decodeBase64, decodeAudioData, resampleTo16k } from '../utils/audioUtils';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- CV Analysis ---

export const analyzeCV = async (input: CVInput): Promise<CVAnalysis> => {
  try {
    const modelId = 'gemini-2.5-flash';
    let requestContents;

    if (typeof input === 'string') {
      requestContents = `
      Analyze the following CV/Resume text. 
      Extract the candidate's name (if not found, use "Candidate"), a brief professional summary, 
      a list of key technical skills, and 3-5 key topics that would be good to interview them about.
      
      CV Text:
      ${input.substring(0, 20000)}
      `;
    } else {
      // Handle Binary Input (PDF)
      requestContents = {
        parts: [
          {
            inlineData: {
              mimeType: input.mimeType,
              data: input.data
            }
          },
          {
            text: `Analyze the attached CV document. 
            Extract the candidate's name (if not found, use "Candidate"), a brief professional summary, 
            a list of key technical skills, and 3-5 key topics that would be good to interview them about.`
          }
        ]
      };
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: requestContents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            candidateName: { type: Type.STRING },
            summary: { type: Type.STRING },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['candidateName', 'summary', 'topics', 'technicalSkills']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as CVAnalysis;
  } catch (error) {
    console.error("Error analyzing CV:", error);
    throw new Error("Failed to analyze CV content.");
  }
};

// --- Live Interview Session ---

export class InterviewSession {
  private active: boolean = false;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private cleanup: (() => void) | null = null;
  
  // Callbacks for UI updates
  public onVolumeChange: ((vol: number) => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onError: ((msg: string) => void) | null = null;

  constructor(private context: CVAnalysis) {}

  async start() {
    if (this.active) return;
    this.active = true;

    try {
      // 1. Audio Setup
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const outputNode = this.outputAudioContext.createGain();
      outputNode.connect(this.outputAudioContext.destination);

      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 3. Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Professional voice
          },
          systemInstruction: `
            You are an expert technical interviewer named "Alex". 
            You are interviewing ${this.context.candidateName}.
            
            Here is the summary of their profile:
            ${this.context.summary}
            
            Focus your questions on these topics based on their CV:
            ${this.context.topics.join(', ')}
            
            Rules:
            1. Start by introducing yourself briefly as Alex.
            2. Your FIRST question must be exactly: "Could you please tell me something about yourself, your education, and your work experience?"
            3. After the candidate answers the introduction, move on to technical questions based on the topics provided.
            4. Ask one question at a time.
            5. Keep your responses concise and conversational (under 20 seconds usually).
            6. If the candidate gives a vague answer, ask for clarification.
            7. Be professional but encouraging.
          `,
        },
        callbacks: {
          onopen: () => {
            console.log("Interview connection established");
            this.startAudioStreaming(stream, sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onclose: () => {
            console.log("Interview connection closed");
            this.stop();
          },
          onerror: (e) => {
            console.error("Interview connection error", e);
            if (this.onError) this.onError("Connection error occurred.");
            this.stop();
          }
        }
      });

      // Store cleanup function
      this.cleanup = async () => {
        if (this.inputAudioContext) await this.inputAudioContext.close();
        if (this.outputAudioContext) await this.outputAudioContext.close();
        stream.getTracks().forEach(track => track.stop());
        sessionPromise.then(session => session.close());
      };

    } catch (err) {
      console.error("Failed to start interview:", err);
      if (this.onError) this.onError("Failed to access microphone or connect to AI.");
      this.stop();
    }
  }

  private startAudioStreaming(stream: MediaStream, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext) return;

    const source = this.inputAudioContext.createMediaStreamSource(stream);
    const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.active) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      if (this.onVolumeChange) this.onVolumeChange(rms);

      // Send to Gemini
      const pcmBlob = createPcmBlob(inputData);
      sessionPromise.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(processor);
    processor.connect(this.inputAudioContext.destination);
  }

  private async handleServerMessage(message: LiveServerMessage) {
    if (!this.outputAudioContext) return;

    // Handle interruptions
    if (message.serverContent?.interrupted) {
      this.sources.forEach(source => {
        try { source.stop(); } catch(e) {}
      });
      this.sources.clear();
      this.nextStartTime = 0;
      return;
    }

    // Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      try {
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        
        const audioBuffer = await decodeAudioData(
          decodeBase64(base64Audio),
          this.outputAudioContext,
          24000,
          1
        );

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        
        source.onended = () => {
          this.sources.delete(source);
        };

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);

      } catch (e) {
        console.error("Error decoding audio response", e);
      }
    }
  }

  stop() {
    this.active = false;
    if (this.cleanup) this.cleanup();
    if (this.onDisconnect) this.onDisconnect();
  }
}
