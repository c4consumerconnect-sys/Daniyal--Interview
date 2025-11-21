import React, { useState, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import AudioVisualizer from './components/AudioVisualizer';
import { analyzeCV, InterviewSession } from './services/geminiService';
import { AppState, CVAnalysis, CVInput } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [cvText, setCvText] = useState<string>('');
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Audio Visualizer State
  const [volume, setVolume] = useState(0);
  
  // Session Ref
  const sessionRef = useRef<InterviewSession | null>(null);

  const handleCVSubmit = async (input: CVInput) => {
    // Validation for text input
    if (typeof input === 'string') {
      if (!input.trim()) return;
    }
    
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    
    try {
      const result = await analyzeCV(input);
      setAnalysis(result);
      setAppState(AppState.READY);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to analyze CV. Please ensure the file is a valid PDF or Text.");
      setAppState(AppState.IDLE);
    }
  };

  const handleStartInterview = async () => {
    if (!analysis) return;
    
    setAppState(AppState.INTERVIEWING);
    
    const session = new InterviewSession(analysis);
    sessionRef.current = session;
    
    session.onVolumeChange = (vol) => {
      setVolume(vol);
    };
    
    session.onError = (msg) => {
      setErrorMsg(msg);
      setAppState(AppState.ERROR);
    };
    
    session.onDisconnect = () => {
      setAppState(AppState.COMPLETED);
    };

    await session.start();
  };

  const handleEndInterview = () => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    setAppState(AppState.COMPLETED);
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setCvText('');
    setAnalysis(null);
    setErrorMsg(null);
    setVolume(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]" />

      {/* Navbar */}
      <nav className="relative z-10 px-8 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="font-bold text-white">AI</span>
          </div>
          <span className="font-bold text-xl tracking-tight">TalentScout</span>
        </div>
        {appState !== AppState.IDLE && (
          <button onClick={resetApp} className="text-sm text-slate-400 hover:text-white transition-colors">
            Start Over
          </button>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 container mx-auto px-4 flex flex-col items-center justify-center pb-10">
        
        {errorMsg && (
           <div className="absolute top-24 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-3 rounded-lg backdrop-blur-md animate-fade-in">
             {errorMsg}
           </div>
        )}

        {/* State: IDLE - Upload Screen */}
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center w-full max-w-2xl space-y-10 animate-fade-in-up">
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 pb-2">
                Ace Your Interview.
              </h1>
              <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                Upload your CV (PDF or Text). Our AI will analyze your profile and conduct a realistic, voice-based technical interview.
              </p>
            </div>

            <div className="w-full flex flex-col items-center space-y-6">
              <FileUpload onFileSelect={handleCVSubmit} disabled={false} />
              
              <div className="w-full flex items-center justify-center space-x-4">
                <div className="h-px bg-slate-800 flex-1"></div>
                <span className="text-slate-500 text-sm">OR PASTE TEXT</span>
                <div className="h-px bg-slate-800 flex-1"></div>
              </div>

              <div className="w-full max-w-lg relative">
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder="Paste your resume content here..."
                  className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
                />
                <button 
                  onClick={() => handleCVSubmit(cvText)}
                  disabled={!cvText.trim()}
                  className="absolute bottom-3 right-3 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Analyze
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: ANALYZING */}
        {appState === AppState.ANALYZING && (
          <div className="flex flex-col items-center space-y-6 animate-pulse">
            <div className="w-20 h-20 relative">
              <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-semibold text-slate-200">Analyzing Profile...</h2>
            <p className="text-slate-400">Extracting skills and generating questions.</p>
          </div>
        )}

        {/* State: READY */}
        {appState === AppState.READY && analysis && (
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-indigo-400 mb-4">Candidate Profile</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Name</p>
                  <p className="text-xl font-medium">{analysis.candidateName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Summary</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Key Skills</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {analysis.technicalSkills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center space-y-8 text-center bg-gradient-to-b from-indigo-900/10 to-transparent rounded-2xl p-6 border border-indigo-500/10">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready for Interview?</h3>
                <p className="text-slate-400 text-sm">Ensure your microphone is ready. The AI interviewer is prepped with questions about your experience.</p>
              </div>
              
              <div className="space-y-2 text-left w-full max-w-xs bg-black/20 p-4 rounded-lg">
                 <p className="text-xs font-semibold text-slate-500 mb-2">INTERVIEW TOPICS</p>
                 <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                    {analysis.topics.map((t, i) => <li key={i}>{t}</li>)}
                 </ul>
              </div>

              <button 
                onClick={handleStartInterview}
                className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-indigo-600 rounded-full overflow-hidden transition-all hover:bg-indigo-500 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
                <span className="relative flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Start Interview
                </span>
              </button>
            </div>
          </div>
        )}

        {/* State: INTERVIEWING */}
        {appState === AppState.INTERVIEWING && (
          <div className="flex flex-col items-center w-full max-w-4xl animate-fade-in">
             <div className="relative w-full flex flex-col items-center justify-center py-10">
                <div className="mb-8 text-center">
                   <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                     <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                     LIVE SESSION
                   </span>
                   <h2 className="text-3xl font-bold mt-4 text-white">Interview in Progress</h2>
                </div>

                {/* Visualizer Container - Wider for graph view */}
                <div className="relative w-full max-w-3xl h-48 flex items-center justify-center bg-slate-900/30 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden shadow-xl">
                   <AudioVisualizer volume={volume} active={true} />
                </div>

                <div className="mt-12 flex items-center space-x-6">
                   <button 
                     onClick={handleEndInterview}
                     className="px-6 py-3 bg-slate-800 hover:bg-red-900/30 text-slate-200 hover:text-red-200 border border-slate-700 hover:border-red-500/50 rounded-full transition-all font-medium flex items-center"
                   >
                     <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                     End Session
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* State: COMPLETED */}
        {appState === AppState.COMPLETED && (
           <div className="text-center space-y-6 animate-fade-in">
             <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
               <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
               </svg>
             </div>
             <h2 className="text-3xl font-bold text-white">Interview Completed</h2>
             <p className="text-slate-400 max-w-md mx-auto">
               Thank you for using TalentScout. You can restart the process to practice with a different profile or CV.
             </p>
             <button 
                onClick={resetApp}
                className="px-8 py-3 bg-white text-indigo-900 font-semibold rounded-full hover:bg-slate-200 transition-colors"
             >
               Start New Interview
             </button>
           </div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-slate-600 text-sm">
        <p>© {new Date().getFullYear()} TalentScout AI. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default App;