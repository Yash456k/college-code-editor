import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';
import './Editor.css';

const Editor = ({ socketRef, roomId, onCodeChange, language }) => {
    const editorRef = useRef(null);
    const cursorMarkersRef = useRef({});

    useEffect(() => {
        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: getLanguageMode(language),
                    theme: 'dracula',
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                }
            );

            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                onCodeChange(code);
                if (origin !== 'setValue') {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            });

            // Track cursor position
            editorRef.current.on('cursorActivity', () => {
                const cursor = editorRef.current.getCursor();
                const selection = editorRef.current.getSelection();
                
                socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
                    roomId,
                    cursorData: {
                        line: cursor.line,
                        ch: cursor.ch,
                        selection: selection,
                    },
                });
            });
        }
        init();
    }, []);

    // Update language mode when language changes
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setOption('mode', getLanguageMode(language));
        }
    }, [language]);

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null) {
                    editorRef.current.setValue(code);
                }
            });

            // Listen for cursor position updates from other users
            socketRef.current.on(ACTIONS.CURSOR_POSITION, ({ socketId, username, cursorData }) => {
                updateRemoteCursor(socketId, username, cursorData);
            });
        }

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE);
            socketRef.current.off(ACTIONS.CURSOR_POSITION);
        };
    }, [socketRef.current]);

    function getLanguageMode(lang) {
        const modes = {
            python: 'python',
            javascript: { name: 'javascript', json: true },
            java: 'text/x-java',
            cpp: 'text/x-c++src',
            c: 'text/x-csrc',
        };
        return modes[lang] || 'python';
    }

    function updateRemoteCursor(socketId, username, cursorData) {
        if (!editorRef.current) return;

        // Clear previous cursor if exists
        if (cursorMarkersRef.current[socketId]) {
            cursorMarkersRef.current[socketId].clear();
        }

        // Generate consistent color for user
        const color = getUserColor(socketId);

        // Create cursor element
        const cursorElement = document.createElement('span');
        cursorElement.className = 'remote-cursor';
        cursorElement.style.borderLeftColor = color;

        const label = document.createElement('span');
        label.className = 'remote-cursor-label';
        label.style.backgroundColor = color;
        label.textContent = username;

        cursorElement.appendChild(label);

        // Set cursor position
        try {
            const pos = { line: cursorData.line, ch: cursorData.ch };
            cursorMarkersRef.current[socketId] = editorRef.current.setBookmark(pos, {
                widget: cursorElement,
                insertLeft: true,
            });
        } catch (error) {
            console.error('Error setting cursor position:', error);
        }
    }

    function getUserColor(socketId) {
        // Generate a consistent color based on socket ID
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
            '#98D8C8', '#F38181', '#95E1D3', '#EAFFD0',
            '#C7CEEA', '#FFDAC1', '#B4F8C8', '#FBE7C6'
        ];
        const index = socketId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    }

    return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;

