# Interactive Input - Working Code Examples

## ✅ Python (WORKS!)
```python
name = input("Enter your name: ")
age = int(input("Enter your age: "))

print(f"Hello, {name}!")
print(f"You are {age} years old.")

if age >= 18:
    print("You can vote! ✅")
else:
    print("Too young to vote ❌")
```

## ✅ Java (Should work with Scanner)
```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        System.out.print("Enter your name: ");
        String name = sc.nextLine();
        
        System.out.print("Enter your age: ");
        int age = sc.nextInt();
        
        System.out.println("Hello, " + name + "!");
        System.out.println("You are " + age + " years old.");
        
        sc.close();
    }
}
```

## ⚠️ JavaScript (Node.js - Use readline-sync alternative)

**❌ DON'T USE** (browser only):
```javascript
const name = prompt("Enter name:");  // Won't work!
```

**✅ USE THIS** (works with our terminal):
```javascript
// For Node.js interactive terminal, we need to use stdin directly
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter your name: ', (name) => {
    rl.question('Enter your age: ', (age) => {
        console.log(`Hello, ${name}!`);
        console.log(`You are ${age} years old.`);
        rl.close();
    });
});
```

## ✅ C (Should work with scanf)
```c
#include <stdio.h>

int main() {
    char name[50];
    int age;
    
    printf("Enter your name: ");
    scanf("%s", name);
    
    printf("Enter your age: ");
    scanf("%d", &age);
    
    printf("Hello, %s!\n", name);
    printf("You are %d years old.\n", age);
    
    return 0;
}
```

## ✅ C++ (Should work with cin)
```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int age;
    
    cout << "Enter your name: ";
    cin >> name;
    
    cout << "Enter your age: ";
    cin >> age;
    
    cout << "Hello, " << name << "!" << endl;
    cout << "You are " << age << " years old." << endl;
    
    return 0;
}
```

---

## Testing Each Language

### Test Python ✅
Run the Python code above and:
1. See "Enter your name:" prompt
2. Type in terminal input field → press Enter
3. See "Enter your age:" prompt  
4. Type age → press Enter
5. See results!

### Test Java
If Java doesn't work, it might be a stdin buffering issue. Try the code above.

### Test JavaScript  
Use the readline example above - `prompt()` won't work in Node.js!

### Test C/C++
The scanf/cin examples should work if stdin is properly piped.

---

## Need Help?

If a language still doesn't work, let me know which one and I'll debug it!
