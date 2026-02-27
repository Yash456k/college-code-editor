import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import Terminal from '../components/Terminal';
import LanguageSelector from '../components/LanguageSelector';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                        console.log(`${username} joined`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );

            // Listen for code output (streaming)
            socketRef.current.on(ACTIONS.CODE_OUTPUT, ({ output: codeOutput }) => {
                addOutput(codeOutput, 'output', false);
            });

            // Listen for code errors (streaming)
            socketRef.current.on(ACTIONS.CODE_ERROR, ({ output: errorOutput }) => {
                addOutput(errorOutput, 'error', false);
            });

            // Listen for execution complete
            socketRef.current.on(ACTIONS.EXECUTION_COMPLETE, () => {
                setIsRunning(false);
            });

            // Listen for language changes
            socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language: newLanguage }) => {
                setLanguage(newLanguage);
                toast.success(`Language changed to ${newLanguage}`);
            });
        };
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
            socketRef.current.off(ACTIONS.CODE_OUTPUT);
            socketRef.current.off(ACTIONS.CODE_ERROR);
            socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
        };
    }, []);

    function addOutput(text, type = 'output', showTimestamp = false) {
        const timestamp = new Date().toLocaleTimeString();
        setOutput((prev) => [...prev, { text, type, timestamp, showTimestamp }]);
    }

    function handleLanguageChange(newLanguage) {
        setLanguage(newLanguage);
        socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
            roomId,
            language: newLanguage,
        });
    }

    function handleRunCode() {
        if (!codeRef.current) {
            toast.error('Please write some code first!');
            return;
        }

        setIsRunning(true);
        addOutput(`Running ${language} code...`, 'output');

        socketRef.current.emit(ACTIONS.RUN_CODE, {
            roomId,
            code: codeRef.current,
            language,
        });
    }

    function handleSendInput(input) {
        // Display user's input in terminal
        addOutput(input, 'output', false);
        
        // Send input to server
        socketRef.current.emit(ACTIONS.SEND_INPUT, {
            roomId,
            input,
        });
    }

    function handleClearOutput() {
        setOutput([]);
    }

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    // Keyboard shortcut for running code (Ctrl/Cmd + Enter)
    useEffect(() => {
        const handleKeyPress = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRunCode();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [language]);

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/code-sync.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorContainer">
                <div className="toolbar">
                    <LanguageSelector
                        language={language}
                        onChange={handleLanguageChange}
                        disabled={isRunning}
                    />
                    <div className="toolbarActions">
                        <button
                            className="btn runBtn"
                            onClick={handleRunCode}
                            disabled={isRunning}
                        >
                            {isRunning ? '⏳ Running...' : '▶ Run'}
                        </button>
                        <button
                            className="btn clearBtn"
                            onClick={handleClearOutput}
                            disabled={output.length === 0}
                        >
                            🗑️ Clear
                        </button>
                    </div>
                </div>
                <div className="splitView">
                    <div className="editorWrap">
                        <Editor
                            socketRef={socketRef}
                            roomId={roomId}
                            onCodeChange={(code) => {
                                codeRef.current = code;
                            }}
                            language={language}
                        />
                    </div>
                    <div className="terminalWrap">
                        <Terminal 
                            output={output} 
                            isRunning={isRunning}
                            onSendInput={handleSendInput}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorPage;

