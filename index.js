import React, { useState, useCallback, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    signInAnonymously,
    signInWithCustomToken
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    onSnapshot,
    serverTimestamp,
    doc,
    deleteDoc
} from 'firebase/firestore';


// --- DATA LIBRARIES (FOR EDITOR) ---
const allPrompts = {
    "Futuristic & AI": {
        preview: 'https://placehold.co/100x100/0E7490/E2E8F0?text=Future',
        prompts: [
            { title: 'Cyberpunk Mercenary', text: 'A gritty, futuristic portrait in a neon-drenched back alley of a futuristic city.' },
            { title: 'Android Dream', text: 'A portrait of a hyper-realistic android, with subtle seams on their synthetic skin, looking thoughtful. Background is a clean, minimalist high-tech lab.' },
            { title: 'Solarpunk Utopia', text: 'A bright, optimistic portrait in a futuristic city where nature and technology harmoniously coexist.' },
        ]
    },
    "Vintage & Historical": {
        preview: 'https://placehold.co/100x100/78350F/E2E8F0?text=Vintage',
        prompts: [
            { title: 'Roaring \'20s Speakeasy', text: 'In a secret, smoky speakeasy bar, holding a vintage cocktail.' },
            { title: '1940s Film Noir', text: 'A moody, high-contrast black and white shot on a wet city street at night.' },
        ]
    },
    "Artistic Styles": {
        preview: 'https://placehold.co/100x100/831843/E2E8F0?text=Artistic',
        prompts: [
            { title: 'Oil Painting', text: 'A portrait in the style of a classic oil painting, with visible brushstrokes.' },
            { title: 'Comic Book Hero', text: 'A bold, graphic portrait in a pop art or comic book style.' },
        ]
    },
    "Fantasy Worlds": {
        preview: 'https://placehold.co/100x100/5B21B6/E2E8F0?text=Fantasy',
        prompts: [
            { title: 'High Elf Archer', text: 'Perched in the boughs of an ancient tree in a mystical forest, bow in hand.' },
            { title: 'Vampire Nobility', text: 'In a lavish, gothic castle library lit by candelabras.' },
        ]
    },
};

const outfitStyles = {
    none: { title: '🤷 None', text: '' },
    casual: { title: '👕 Casual', text: 'The person is wearing modern casual clothing like a t-shirt and jeans.' },
    formal: { title: '👔 Formal', text: 'The person is wearing formal attire, such as a suit or an elegant dress.' },
    techwear: { title: '🧥 Techwear', text: 'The person is wearing futuristic techwear.' },
    vintage: { title: '🕰️ Vintage', text: 'The person is wearing stylish vintage clothing.' },
    fantasyArmor: { title: '🛡️ Armor', text: 'The person is clad in ornate fantasy-style armor.' }
};

const hairStyles = {
    none: { title: 'Default', text: '' },
    long: { title: 'Long', text: 'The person has long, flowing hair.' },
    short: { title: 'Short', text: 'The person has short, neat hair.' },
    curly: { title: 'Curly', text: 'The person has curly, textured hair.' },
    spiky: { title: 'Spiky', text: 'The person has spiky, styled hair.'}
};

const accessories = {
    none: { title: 'None', text: '' },
    sunglasses: { title: '🕶️ Sunglasses', text: 'The person is wearing stylish sunglasses.' },
    headphones: { title: '🎧 Headphones', text: 'The person is wearing large headphones.'},
    beanie: { title: '🧢 Beanie', text: 'The person is wearing a casual beanie hat.'}
};

const emotionTones = { none: { title: 'Default', text: '' }, happy: { title: '😊 Happy', text: 'The person has a happy, joyful expression.' }, sad: { title: '😔 Sad', text: 'The person has a sad, somber expression.' }, energetic: { title: '⚡ Energetic', text: 'The person has a dynamic, energetic expression.' } };
const shotTypes = { none: { title: 'Default', text: ''}, closeup: { title: 'Close-Up', text: 'This is a close-up shot of the person\'s face.'}, medium: { title: 'Medium Shot', text: 'This is a medium shot, framing the person from the waist up.'}, wide: { title: 'Wide Shot', text: 'This is a wide shot, showing the person and their environment.'} };
const subjectPositions = { none: { title: 'Default', text: ''}, left: { title: 'Left', text: 'The person is positioned on the left side of the frame.'}, center: { title: 'Center', text: 'The person is positioned in the center of the frame.'}, right: { title: 'Right', text: 'The person is positioned on the right side of the frame.'} };
const intensityLevels = { 1: { name: "Subtle", modifier: (p) => `A minimalist, soft-focus interpretation: ${p}` }, 2: { name: "Normal", modifier: (p) => p }, 3: { name: "Strong", modifier: (p) => `An intense, ultra-detailed, dramatic version: ${p}` } };
const faceFidelityLevels = { high: { name: 'High', text: '(preserve the original person\'s face and identity 100%)'}, artistic: { name: 'Artistic', text: ''} };
const backgroundThemes = {
    none: { title: 'Custom', text: ''},
    nature: { title: '🏞️ Nature', text: 'The background is a beautiful and serene natural landscape.'},
    city: { title: '🏙️ City', text: 'A bustling, dynamic cityscape.'},
    studio: { title: '💡 Studio', text: 'A clean, professional studio setting.'},
};
const animationStyles = { none: { name: 'Still' }, 'kenburns-top': { name: 'Slow Zoom' }, 'pan-left': { name: 'Gentle Pan' }, 'pulse': { name: 'Pulse' } };
const aspectRatios = { 'free': 'Free', '1/1': 'Square (1:1)', '9/16': 'Story (9:16)', '4/5': 'Portrait (4:5)' };

const App = () => {
    const [settings, setSettings] = useState({
        selectedPromptText: allPrompts["Futuristic & AI"].prompts[0].text,
        subjectEditText: '', backgroundEditText: '', negativePrompt: '',
        selectedOutfit: 'none', selectedEmotion: 'none',
        selectedShotType: 'none', selectedSubjectPosition: 'none',
        selectedHairStyle: 'none', selectedAccessory: 'none',
        faceFidelity: 'high',
        intensity: 2,
    });
    
    const [inputImage, setInputImage] = useState(null);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [generationHistory, setGenerationHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('Scene');
    const [animationClass, setAnimationClass] = useState('none');
    const [aspectRatio, setAspectRatio] = useState('free');
    const [beforeAfter, setBeforeAfter] = useState(50);

    const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setInputImage(reader.result);
                setGeneratedImage(null);
                setGenerationHistory([]);
                setError('');
            };
            reader.readAsDataURL(file);
        }
    };

    const generateImage = useCallback(async () => {
        if (!inputImage) { setError('Please upload a photo first.'); return; }
        
        const { selectedPromptText, subjectEditText, backgroundEditText, negativePrompt, selectedOutfit, selectedEmotion, selectedShotType, selectedSubjectPosition, selectedHairStyle, selectedAccessory, faceFidelity, intensity } = settings;
        
        const promptParts = [
            faceFidelityLevels[faceFidelity].text,
            selectedPromptText,
            outfitStyles[selectedOutfit].text,
            hairStyles[selectedHairStyle].text,
            accessories[selectedAccessory].text,
            subjectEditText ? ` For the main subject, apply this edit: ${subjectEditText}.` : '',
            backgroundEditText ? ` The background is: ${backgroundEditText}.` : '',
            emotionTones[selectedEmotion]?.text || '', 
            shotTypes[selectedShotType].text,
            subjectPositions[selectedSubjectPosition].text,
            negativePrompt ? ` Avoid: ${negativePrompt}.` : ''
        ];
        
        const intensityModifier = intensityLevels[intensity].modifier;
        const finalPrompt = intensityModifier(promptParts.filter(Boolean).join(''));

        setIsLoading(true);
        setError('');
        
        const uniquePrompt = `${finalPrompt} (seed: ${Math.random()})`;
        const payload = {
            contents: [{ parts: [{ text: uniquePrompt }, { inlineData: { mimeType: inputImage.match(/data:(.*);base64/)[1], data: inputImage.split(',')[1] } }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        };
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const result = await response.json();
            const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (base64Data) {
                const newImage = `data:image/png;base64,${base64Data}`;
                setGeneratedImage(newImage);
                setGenerationHistory(prev => [{ imageSrc: newImage, settings: settings }, ...prev.slice(0, 4)]);
            } else { setError('Failed to generate image.'); }
        } catch (err) {
            setError(`An error occurred: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [inputImage, settings]);

    const handleDownload = () => { if (!generatedImage) return; const link = document.createElement('a'); link.href = generatedImage; link.download = 'ai-creative-suite.png'; link.click(); };
    
    const loadHistory = (historyItem) => { setGeneratedImage(historyItem.imageSrc); setSettings(historyItem.settings); };
    
    const aspectRatioStyle = aspectRatio === 'free' ? {} : { aspectRatio, objectFit: 'cover' };

    const ControlPanel = () => (
         <div className="flex flex-col gap-4">
            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('Scene')} className={`px-4 py-2 font-semibold ${activeTab === 'Scene' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Scene</button>
                <button onClick={() => setActiveTab('Subject')} className={`px-4 py-2 font-semibold ${activeTab === 'Subject' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Subject</button>
                <button onClick={() => setActiveTab('Advanced')} className={`px-4 py-2 font-semibold ${activeTab === 'Advanced' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500'}`}>Advanced</button>
            </div>
            <div className="p-1 space-y-4">
                {activeTab === 'Scene' && <>
                    <div>
                        <label className="text-sm font-bold text-slate-600 mb-2 block">Art Style</label>
                        <select onChange={e => updateSetting('selectedPromptText', e.target.value)} value={settings.selectedPromptText} className="w-full bg-slate-100 p-2 rounded-md border border-slate-300">
                            {Object.values(allPrompts).flatMap(cat => cat.prompts).map(p => <option key={p.title} value={p.text}>{p.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-600 mb-2 block">Background Theme</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(backgroundThemes).map(([key, { title, text }]) => <button key={key} onClick={() => updateSetting('backgroundEditText', text)} className={`p-2 rounded-lg text-sm font-semibold ${settings.backgroundEditText === text ? 'bg-indigo-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{title}</button>)}
                        </div>
                    </div>
                </>}
                 {activeTab === 'Subject' && <>
                     <div>
                        <label className="text-sm font-bold text-slate-600 mb-2 block">Outfit</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(outfitStyles).map(([key, { title }]) => <button key={key} onClick={() => updateSetting('selectedOutfit', key)} className={`p-2 rounded-lg text-sm font-semibold ${settings.selectedOutfit === key ? 'bg-indigo-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{title}</button>)}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-600 mb-2 block">Hair Style</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(hairStyles).map(([key, { title }]) => <button key={key} onClick={() => updateSetting('selectedHairStyle', key)} className={`p-2 rounded-lg text-sm font-semibold ${settings.selectedHairStyle === key ? 'bg-indigo-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{title}</button>)}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-600 mb-2 block">Accessories</label>
                        <div className="grid grid-cols-3 gap-2">
                           {Object.entries(accessories).map(([key, { title }]) => <button key={key} onClick={() => updateSetting('selectedAccessory', key)} className={`p-2 rounded-lg text-sm font-semibold ${settings.selectedAccessory === key ? 'bg-indigo-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{title}</button>)}
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-bold text-slate-600 mb-2 block">Emotion</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(emotionTones).map(([key, { title }]) => <button key={key} onClick={() => updateSetting('selectedEmotion', key)} className={`p-2 rounded-lg text-sm font-semibold ${settings.selectedEmotion === key ? 'bg-indigo-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>{title}</button>)}
                        </div>
                    </div>
                </>}
                 {activeTab === 'Advanced' && <>
                      <div>
                        <label className="text-sm font-bold text-slate-600 mb-2 block">Face Fidelity</label>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                            {Object.entries(faceFidelityLevels).map(([key, { name }]) => (
                                <button key={key} onClick={() => updateSetting('faceFidelity', key)} className={`flex-1 p-2 rounded-md text-sm font-semibold ${settings.faceFidelity === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}>{name}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-600 mb-2 block">Negative Prompt (What to avoid)</label>
                        <textarea value={settings.negativePrompt} onChange={(e) => updateSetting('negativePrompt', e.target.value)} placeholder="e.g., hats, glasses, text..." className="w-full h-20 bg-slate-100 rounded-lg p-3 border border-slate-300"/>
                    </div>
                </>}
            </div>
         </div>
    );

    if (!inputImage) {
        return (
            <div className="bg-slate-50 text-slate-800 min-h-screen font-sans flex flex-col items-center justify-center p-4">
                <style>{`@keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } } .fade-in { animation: fadeIn 0.5s ease-out; }`}</style>
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-bold text-slate-900">AI Creative Suite</h1>
                    <p className="text-slate-600 mt-2 text-lg">Transform your photos into stunning scenes with the power of AI.</p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg mx-auto text-center fade-in border border-slate-200">
                    <h2 className="text-2xl font-bold mb-6 text-indigo-600">Start a New Project</h2>
                    <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-50 transition-all">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0" />
                        <p className="text-xl font-semibold text-slate-700">Click or Drag & Drop Photo</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 text-slate-800 min-h-screen font-sans">
             <style>{`@keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } } .fade-in { animation: fadeIn 0.5s ease-out; }`}</style>
            <div className="w-full max-w-8xl mx-auto p-8">
                <header className="flex justify-between items-center mb-8">
                     <h1 className="text-3xl font-bold text-slate-900">AI Creative Suite</h1>
                     <button onClick={() => setInputImage(null)} className="font-semibold text-indigo-600 hover:text-indigo-800">Start Over</button>
                </header>
                <main className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 xl:col-span-1 bg-white p-6 rounded-2xl shadow-xl h-fit">
                        <ControlPanel />
                    </div>
                    <div className="lg:col-span-2 xl:col-span-3 bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center">
                        <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-4 relative">
                           {isLoading && <p>Rendering scene...</p>}
                           {error && <p className="text-red-500">{error}</p>}
                           {generatedImage && !isLoading && (
                                <div className="w-full h-full text-center flex flex-col fade-in">
                                    <div className="relative overflow-hidden rounded-lg mb-4 flex-grow group">
                                        <div className="absolute inset-0" style={aspectRatioStyle}>
                                            <img src={generatedImage} alt="Generated" className={`w-full h-full transition-transform duration-1000 ${animationClass !== 'none' ? `${animationClass}-effect` : ''}`} style={{ objectFit: 'contain' }}/>
                                            <img src={inputImage} alt="Original" className="absolute inset-0 w-full h-full" style={{ objectFit: 'contain', clipPath: `inset(0 ${100 - beforeAfter}% 0 0)`}}/>
                                            <input type="range" min="0" max="100" value={beforeAfter} onChange={e => setBeforeAfter(e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"/>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
                                        <button onClick={handleDownload} className="bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-lg">Download</button>
                                         <button onClick={generateImage} disabled={isLoading} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">Refresh</button>
                                    </div>
                                </div>
                           )}
                           {!generatedImage && !isLoading && !error && 
                                <div className="text-center">
                                    <img src={inputImage} alt="Preview" className="max-h-96 rounded-lg mb-8"/>
                                    <button onClick={generateImage} disabled={isLoading} className="w-full max-w-xs mx-auto bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-4 px-4 rounded-2xl hover:from-sky-600 hover:to-indigo-700 transform hover:scale-105 disabled:opacity-50 flex items-center justify-center text-lg shadow-lg">
                                        {isLoading ? 'Creating...' : '✨ Generate Scene'}
                                    </button>
                                </div>
                           }
                        </div>
                         {generationHistory.length > 0 && (
                            <div className="w-full mt-4">
                                <h3 className="text-lg font-semibold mb-2 text-slate-700">History</h3>
                                <div className="grid grid-cols-5 gap-2">
                                    {generationHistory.map((item, index) => <img key={index} src={item.imageSrc} onClick={() => loadHistory(item)} className="w-full h-auto object-cover rounded-md cursor-pointer hover:ring-2 ring-indigo-500"/>)}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
