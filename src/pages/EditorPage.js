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
    const [ownerSocketId, setOwnerSocketId] = useState(null);
    const [mySocketId, setMySocketId] = useState(null);
    const [myRole, setMyRole] = useState('viewer');

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            setMySocketId(socketRef.current.id);
            socketRef.current.on('connect', () => {
                setMySocketId(socketRef.current.id);
            });
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
                ({ clients, username, socketId, ownerSocketId: roomOwnerSocketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                        console.log(`${username} joined`);
                    }
                    setClients(clients);
                    setOwnerSocketId(roomOwnerSocketId);

                    const currentSocketId = socketRef.current?.id;
                    if (currentSocketId) {
                        const currentClient = clients.find((client) => client.socketId === currentSocketId);
                        if (currentClient?.role) {
                            setMyRole(currentClient.role);
                        }
                        if (currentClient?.role === 'editor') {
                            socketRef.current.emit(ACTIONS.SYNC_CODE, {
                                code: codeRef.current,
                                socketId,
                                roomId,
                            });
                        }
                    }                    
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setOwnerSocketId((prev) => (prev === socketId ? null : prev));
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

            socketRef.current.on(ACTIONS.ROLE_UPDATED, ({ socketId, role }) => {
                setClients((prev) => prev.map((client) => (
                    client.socketId === socketId ? { ...client, role } : client
                )));

                if (socketRef.current?.id === socketId) {
                    setMyRole(role);
                    toast.success(`You are now an ${role}.`);
                }
            });

            socketRef.current.on(ACTIONS.PERMISSION_DENIED, ({ message }) => {
                toast.error(message || 'Permission denied');
            });
        };
        init();
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.CODE_OUTPUT);
                socketRef.current.off(ACTIONS.CODE_ERROR);
                socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
                socketRef.current.off(ACTIONS.ROLE_UPDATED);
                socketRef.current.off(ACTIONS.PERMISSION_DENIED);
            }
        };
    }, []);

    function addOutput(text, type = 'output', showTimestamp = false) {
        const timestamp = new Date().toLocaleTimeString();
        setOutput((prev) => [...prev, { text, type, timestamp, showTimestamp }]);
    }

    function handleLanguageChange(newLanguage) {
        if (myRole !== 'editor') {
            toast.error('Only editors can change language.');
            return;
        }
        setLanguage(newLanguage);
        socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
            roomId,
            language: newLanguage,
        });
    }

    function handleRunCode() {
        if (myRole !== 'editor') {
            toast.error('Only editors can run code.');
            return;
        }
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
        if (myRole !== 'editor') {
            toast.error('Only editors can send input.');
            return;
        }
        // Display user's input in terminal
        addOutput(input, 'output', false);
        
        // Send input to server
        socketRef.current.emit(ACTIONS.SEND_INPUT, {
            roomId,
            input,
        });
    }

    function handleClearOutput() {
        if (myRole !== 'editor') {
            toast.error('Only editors can clear terminal output.');
            return;
        }
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

    function handlePromoteViewer(targetSocketId) {
        socketRef.current.emit(ACTIONS.PROMOTE_TO_EDITOR, {
            roomId,
            targetSocketId,
        });
    }

    const isOwner = mySocketId === ownerSocketId;
    const canEdit = myRole === 'editor';

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
    }, [language, myRole]);

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
                                role={client.role || 'viewer'}
                                showPromote={isOwner && client.socketId !== mySocketId}
                                onPromote={() => handlePromoteViewer(client.socketId)}
                                toggleLabel={(client.role || 'viewer') === 'editor' ? 'Make Viewer' : 'Make Editor'}
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
                        disabled={isRunning || !canEdit}
                    />
                    <div className="toolbarActions">
                        <button
                            className="btn runBtn"
                            onClick={handleRunCode}
                            disabled={isRunning || !canEdit}
                        >
                            {isRunning ? '⏳ Running...' : '▶ Run'}
                        </button>
                        <button
                            className="btn clearBtn"
                            onClick={handleClearOutput}
                            disabled={output.length === 0 || !canEdit}
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
                            canEdit={canEdit}
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

