const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

const allowedOrigins = [
    'http://localhost:3000',
    'https://college-code-editor.vercel.app',
];

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        methods: ['GET', 'POST'],
        credentials: true
    },
});

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
const roomPermissionMap = {};
const socketRoomMap = {};

// Store active processes for each room
const activeProcesses = {};

// Code execution function with interactive I/O
function executeCode(code, language, roomId, io) {
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    let fileName, command, args = [];

    try {
        switch (language.toLowerCase()) {
            case 'python':
                fileName = path.join(tempDir, `code_${timestamp}.py`);
                fs.writeFileSync(fileName, code, { encoding: 'utf8' });
                command = 'python';
                args = ['-u', fileName];
                break;

            case 'javascript':
                fileName = path.join(tempDir, `code_${timestamp}.js`);
                
                // Add prompt/alert/confirm polyfill for Node.js
                const polyfill = `
// Browser function polyfills for Node.js
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Store original question function
const originalQuestion = rl.question.bind(rl);

// Synchronous-style prompt using promises
global.prompt = function(message) {
    return new Promise((resolve) => {
        originalQuestion(message, (answer) => {
            resolve(answer);
        });
    });
};

global.alert = function(message) {
    console.log(message);
};

global.confirm = function(message) {
    return new Promise((resolve) => {
        originalQuestion(message + ' (yes/no): ', (answer) => {
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
};

// Wrap user code in async function to use await with prompt
(async function() {
try {
// ==== USER CODE STARTS HERE ====
`;
                
                const codeWrapper = `
// ==== USER CODE ENDS HERE ====
} catch (error) {
    console.error(error.message);
} finally {
    rl.close();
}
})();
`;
                
                const wrappedCode = polyfill + code + codeWrapper;
                fs.writeFileSync(fileName, wrappedCode, { encoding: 'utf8' });
                command = 'node';
                args = [fileName];
                break;

            case 'java':
                const classMatch = code.match(/public\s+class\s+(\w+)/);
                const className = classMatch ? classMatch[1] : 'Main';
                fileName = path.join(tempDir, `${className}.java`);
                fs.writeFileSync(fileName, code, { encoding: 'utf8' });
                
                // First compile
                const { execSync } = require('child_process');
                try {
                    execSync(`javac -encoding UTF-8 "${fileName}"`, { 
                        cwd: tempDir,
                        encoding: 'utf8'
                    });
                    command = 'java';
                    args = ['-cp', tempDir, className];
                } catch (compileError) {
                    io.in(roomId).emit(ACTIONS.CODE_ERROR, {
                        output: compileError.stderr || compileError.message,
                    });
                    return;
                }
                break;

            case 'cpp':
            case 'c++':
                fileName = path.join(tempDir, `code_${timestamp}.cpp`);
                const outputFile = path.join(tempDir, `code_${timestamp}.exe`);
                fs.writeFileSync(fileName, code, { encoding: 'utf8' });
                
                try {
                    const { execSync } = require('child_process');
                    execSync(`g++ "${fileName}" -o "${outputFile}"`, { encoding: 'utf8' });
                    command = outputFile;
                    args = [];
                } catch (compileError) {
                    io.in(roomId).emit(ACTIONS.CODE_ERROR, {
                        output: compileError.stderr || compileError.message,
                    });
                    return;
                }
                break;

            case 'c':
                fileName = path.join(tempDir, `code_${timestamp}.c`);
                const outputFileC = path.join(tempDir, `code_${timestamp}.exe`);
                fs.writeFileSync(fileName, code, { encoding: 'utf8' });
                
                try {
                    const { execSync } = require('child_process');
                    execSync(`gcc "${fileName}" -o "${outputFileC}"`, { encoding: 'utf8' });
                    command = outputFileC;
                    args = [];
                } catch (compileError) {
                    io.in(roomId).emit(ACTIONS.CODE_ERROR, {
                        output: compileError.stderr || compileError.message,
                    });
                    return;
                }
                break;

            default:
                io.in(roomId).emit(ACTIONS.CODE_ERROR, {
                    output: `Unsupported language: ${language}`,
                });
                return;
        }

        // Spawn the process for interactive I/O
        const { spawn } = require('child_process');
        const childProcess = spawn(command, args, {
            env: { 
                ...process.env, 
                PYTHONIOENCODING: 'utf-8',
                NODE_NO_WARNINGS: '1'
            },
            shell: false
        });

        // Store the process so we can send input to it later
        activeProcesses[roomId] = {
            process: childProcess,
            fileName: fileName,
            language: language
        };

        // Stream stdout to client
        childProcess.stdout.on('data', (data) => {
            io.in(roomId).emit(ACTIONS.CODE_OUTPUT, {
                output: data.toString('utf8'),
            });
        });

        // Stream stderr to client
        childProcess.stderr.on('data', (data) => {
            io.in(roomId).emit(ACTIONS.CODE_ERROR, {
                output: data.toString('utf8'),
            });
        });

        // Handle process completion
        childProcess.on('close', (code) => {
            // Clean up files
            try {
                if (fs.existsSync(fileName)) {
                    fs.unlinkSync(fileName);
                }
                // Clean up Java class files
                if (language.toLowerCase() === 'java') {
                    const classMatch = code.match(/public\s+class\s+(\w+)/);
                    const className = classMatch ? classMatch[1] : 'Main';
                    const classFile = path.join(tempDir, `${className}.class`);
                    if (fs.existsSync(classFile)) {
                        fs.unlinkSync(classFile);
                    }
                }
                // Clean up executables
                if (language.toLowerCase() === 'cpp' || language.toLowerCase() === 'c++' || language.toLowerCase() === 'c') {
                    const exeFile = language.toLowerCase() === 'c' 
                        ? path.join(tempDir, `code_${timestamp}.exe`)
                        : path.join(tempDir, `code_${timestamp}.exe`);
                    if (fs.existsSync(exeFile)) {
                        fs.unlinkSync(exeFile);
                    }
                }
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }

            delete activeProcesses[roomId];
            
            io.in(roomId).emit(ACTIONS.EXECUTION_COMPLETE, {
                exitCode: code,
            });
        });

        // Handle errors
        childProcess.on('error', (error) => {
            if (error.code === 'ENOENT') {
                io.in(roomId).emit(ACTIONS.CODE_ERROR, {
                    output: `Error: ${language} is not installed or not in PATH.\nPlease install ${language} and try again.`,
                });
            } else {
                io.in(roomId).emit(ACTIONS.CODE_ERROR, {
                    output: error.message,
                });
            }
            delete activeProcesses[roomId];
        });

        // Set timeout
        setTimeout(() => {
            if (activeProcesses[roomId]) {
                childProcess.kill();
                io.in(roomId).emit(ACTIONS.CODE_ERROR, {
                    output: '\n\nExecution timeout (10 seconds exceeded)',
                });
                delete activeProcesses[roomId];
            }
        }, 10000);

    } catch (error) {
        io.in(roomId).emit(ACTIONS.CODE_ERROR, {
            output: `Error: ${error.message}`,
        });
    }
}

// Send input to running process
function sendInputToProcess(roomId, input) {
    if (activeProcesses[roomId] && activeProcesses[roomId].process) {
        activeProcesses[roomId].process.stdin.write(input + '\n');
    }
}


function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
                role: hasEditPermission(roomId, socketId) ? 'editor' : 'viewer',
            };
        }
    );
}

function initializeRoomPermissions(roomId, socketId) {
    if (!roomPermissionMap[roomId]) {
        roomPermissionMap[roomId] = {
            ownerSocketId: socketId,
            editorSocketIds: new Set([socketId]),
        };
        return;
    }
    if (!roomPermissionMap[roomId].editorSocketIds) {
        roomPermissionMap[roomId].editorSocketIds = new Set();
    }
}

function hasEditPermission(roomId, socketId) {
    const roomPermissions = roomPermissionMap[roomId];
    if (!roomPermissions) {
        return false;
    }
    return roomPermissions.editorSocketIds.has(socketId);
}

function cleanupRoomPermissions(roomId) {
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (!clients || clients.size === 0) {
        delete roomPermissionMap[roomId];
    }
}

function emitPermissionDenied(socket, message) {
    socket.emit(ACTIONS.PERMISSION_DENIED, {
        message,
    });
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socketRoomMap[socket.id] = roomId;
        initializeRoomPermissions(roomId, socket.id);
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        const { ownerSocketId } = roomPermissionMap[roomId];
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
                ownerSocketId,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        if (!hasEditPermission(roomId, socket.id)) {
            emitPermissionDenied(socket, 'You do not have permission to edit code.');
            return;
        }
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, roomId }) => {
        if (roomId && !hasEditPermission(roomId, socket.id)) {
            emitPermissionDenied(socket, 'You do not have permission to sync code.');
            return;
        }
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.CURSOR_POSITION, ({ roomId, cursorData }) => {
        socket.in(roomId).emit(ACTIONS.CURSOR_POSITION, {
            socketId: socket.id,
            username: userSocketMap[socket.id],
            cursorData,
        });
    });

    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
        if (!hasEditPermission(roomId, socket.id)) {
            emitPermissionDenied(socket, 'You do not have permission to change language.');
            return;
        }
        socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
    });

    socket.on(ACTIONS.RUN_CODE, ({ roomId, code, language }) => {
        if (!hasEditPermission(roomId, socket.id)) {
            emitPermissionDenied(socket, 'You do not have permission to run code.');
            return;
        }
        executeCode(code, language, roomId, io);
    });

    socket.on(ACTIONS.SEND_INPUT, ({ roomId, input }) => {
        if (!hasEditPermission(roomId, socket.id)) {
            emitPermissionDenied(socket, 'You do not have permission to send input.');
            return;
        }
        sendInputToProcess(roomId, input);
    });

    socket.on(ACTIONS.PROMOTE_TO_EDITOR, ({ roomId, targetSocketId }) => {
        const roomPermissions = roomPermissionMap[roomId];
        if (!roomPermissions) {
            return;
        }

        if (roomPermissions.ownerSocketId !== socket.id) {
            emitPermissionDenied(socket, 'Only the room editor can promote viewers.');
            return;
        }

        const roomClients = io.sockets.adapter.rooms.get(roomId);
        if (!roomClients || !roomClients.has(targetSocketId)) {
            return;
        }

        if (targetSocketId === roomPermissions.ownerSocketId) {
            emitPermissionDenied(socket, 'Room editor role cannot be changed.');
            return;
        }

        const isCurrentlyEditor = roomPermissions.editorSocketIds.has(targetSocketId);
        if (isCurrentlyEditor) {
            roomPermissions.editorSocketIds.delete(targetSocketId);
        } else {
            roomPermissions.editorSocketIds.add(targetSocketId);
        }

        io.in(roomId).emit(ACTIONS.ROLE_UPDATED, {
            socketId: targetSocketId,
            role: isCurrentlyEditor ? 'viewer' : 'editor',
        });
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });

            const roomPermissions = roomPermissionMap[roomId];
            if (roomPermissions) {
                roomPermissions.editorSocketIds.delete(socket.id);
                if (roomPermissions.ownerSocketId === socket.id) {
                    roomPermissions.ownerSocketId = null;
                }
            }
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });

    socket.on('disconnect', () => {
        const roomId = socketRoomMap[socket.id];
        if (roomId) {
            cleanupRoomPermissions(roomId);
        }
        delete socketRoomMap[socket.id];
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
