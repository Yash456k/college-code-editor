# User Input Support Added! 🎉

## New Feature: Interactive Code Execution

You can now provide input to your code before running it! This enables interactive programs that use:
- Python: `input()`
- JavaScript: `readline()` (with readline-sync)
- Java: `Scanner`
- C/C++: `scanf()`, `cin`

---

## How to Use

### 1. Enter Your Code

Write code that requires input:

**Python Example**:
```python
name = input("Enter your name: ")
age = int(input("Enter your age: "))

print(f"Hello, {name}!")
print(f"You are {age} years old.")

if age >= 18:
    print("You are eligible to vote ✅")
else:
    print("You are NOT eligible to vote ❌")
```

### 2. Provide Input Values

In the **Input** section below the language selector, enter the input values (one per line):
```
Alice
25
```

### 3. Click Run

Click the **▶ Run** button and see the output with your input values!

**Expected Output**:
```
Hello, Alice!
You are 25 years old.
You are eligible to vote ✅
```

---

## Examples

### Python - Calculator
**Code**:
```python
print("=== Simple Calculator ===")
num1 = int(input("Enter first number: "))
num2 = int(input("Enter second number: "))

print(f"\n{num1} + {num2} = {num1 + num2}")
print(f"{num1} - {num2} = {num1 - num2}")
print(f"{num1} * {num2} = {num1 * num2}")
print(f"{num1} / {num2} = {num1 / num2}")
```

**Input**:
```
15
3
```

### Java - Greeting Program
**Code**:
```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        System.out.println("Enter your name:");
        String name = sc.nextLine();
        
        System.out.println("Enter your age:");
        int age = sc.nextInt();
        
        System.out.println("Hello, " + name + "!");
        System.out.println("You are " + age + " years old.");
        
        sc.close();
    }
}
```

**Input**:
```
Bob
30
```

### C - Simple Math
**Code**:
```c
#include <stdio.h>

int main() {
    int a, b;
    
    printf("Enter two numbers:\n");
    scanf("%d %d", &a, &b);
    
    printf("Sum: %d\n", a + b);
    printf("Product: %d\n", a * b);
    
    return 0;
}
```

**Input**:
```
10
5
```

---

## Important Notes

> **📝 Input Format**
> - Enter each input value on a **new line**
> - Values are provided to the program in order
> - The program will read from this input instead of waiting for keyboard input

> **⏱️ Timeout**
> - Code execution has a 10-second timeout
> - If your code takes longer, it will be terminated

> **🔄 Real-time Sync**
> - All users in the same room see the same output
> - Input is shared across all users when anyone runs the code

---

## Testing

**To test the feature**:
1. Restart backend: `npm run server:dev`
2. Refresh browser (Ctrl+R)
3. Try the Python example above
4. Enter input values in the Input textarea
5. Click Run

You should see the program execute with your input values! 🚀
