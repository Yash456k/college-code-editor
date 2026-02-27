# Quick Start Guide

## 🚀 How to Run Your Enhanced Code Editor

### Step 1: Start the Backend Server

Open a terminal and run:
```bash
cd "d:\COLLEGE\Sem 8 Project\college-code-editor"
npm run server:dev
```

You should see: `Listening on port 5000`

### Step 2: Start the Frontend

Open a **NEW terminal** and run:
```bash
cd "d:\COLLEGE\Sem 8 Project\college-code-editor"
npm run start:front
```

The app will automatically open at `http://localhost:3000`

### Step 3: Test the Features

1. **Create a room** - Enter your name and click "Join"
2. **Open another browser** (Chrome Incognito or Firefox) and join the same room
3. **Try these features**:
   - Type code in one browser → see cursor in the other
   - Select **Python** from dropdown
   - Write: `print("Hello World!")`
   - Click **▶ Run** or press **Ctrl+Enter**
   - Watch output appear in terminal panel

## 🎯 New Features

✅ **See where others are editing** - Colored cursors with usernames  
✅ **Run code instantly** - 5 languages supported  
✅ **Integrated terminal** - Real-time output  
✅ **VS Code-like UI** - Professional split-panel layout  
✅ **Language sync** - Changes sync across all users  

## 📝 Test Code Examples

**Python**:
```python
print("Hello from Python!")
for i in range(5):
    print(f"Count: {i}")
```

**JavaScript**:
```javascript
console.log("Hello from JavaScript!");
const items = ['apple', 'banana', 'cherry'];
items.forEach(item => console.log(item));
```

**Java** (requires JDK):
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}
```

## ⚠️ Important Notes

- **Python required**: Make sure Python 3 is installed and accessible via `python` command
- **Optional runtimes**: Java (JDK) and C++ (GCC) are optional - app will show errors if not installed
- **Multi-user testing**: Open multiple browsers to test cursor tracking
- **Keyboard shortcut**: Use **Ctrl+Enter** (or **Cmd+Enter**) to run code quickly

Enjoy your enhanced collaborative code editor! 🎉
