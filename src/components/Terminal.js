import React, { useEffect, useRef, useState } from 'react';
import './Terminal.css';

const Terminal = ({ output, isRunning, onSendInput }) => {
    const terminalRef = useRef(null);
    const inputRef = useRef(null);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        // Auto-scroll to bottom when new output arrives
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [output]);

    useEffect(() => {
        // Focus input when program is running
        if (isRunning && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isRunning]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputValue.trim()) {
                onSendInput(inputValue);
                setInputValue('');
            }
        }
    };

    return (
        <div className="terminalContainer">
            <div className="terminalHeader">
                <span className="terminalTitle">Interactive Terminal</span>
                {isRunning && (
                    <span className="runningIndicator">
                        <span className="pulse"></span> Running...
                    </span>
                )}
            </div>
            <div className="terminalOutput" ref={terminalRef}>
                {output.length === 0 ? (
                    <div className="terminalPlaceholder">
                        💡 Click "Run" or press Ctrl+Enter to execute your code
                        <br />
                        <span className="terminalHint">Your output will appear here. Interactive programs can ask for input!</span>
                    </div>
                ) : (
                    output.map((entry, index) => (
                        <div
                            key={index}
                            className={`terminalLine ${entry.type}`}
                        >
                            {entry.showTimestamp && (
                                <span className="terminalTimestamp">
                                    {entry.timestamp}
                                </span>
                            )}
                            <pre className="terminalText">{entry.text}</pre>
                        </div>
                    ))
                )}
                {isRunning && (
                    <div className="terminalInputLine">
                        <span className="terminalPrompt">▶</span>
                        <input
                            ref={inputRef}
                            type="text"
                            className="terminalInput"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type input and press Enter..."
                            autoFocus
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Terminal;
