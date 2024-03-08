# Demo of extension's features

Download or copy this markdown file into VS Code after installing this extension, and test all the features out!

Keep in mind that before running a code block:
- Make sure the code is correct
- Install the language required by the code block

On Arch Linux, you can run 1 command to install all languages!

```
sudo pacman --needed -S php perl r dart groovy go rust ghc julia lua ruby nodejs python bash
```

On other peasant operating systems, you will need to figure out the preferred installation process yourself.

Run the following code blocks to test out Fibonacci in different languages:

```bash
echo "For bash files:"
echo "1. We can run them Line by Line in the terminal."
echo "2. We can run them all at once as a Bash file."
```

```bash
#!/bin/bash

fib() {
    local n=$1
    local a=0
    local b=1
    local result="[$a"

    for ((i = 1; i < n; i++)); do
        result+=", $b"
        temp=$((a + b))
        a=$b
        b=$temp
    done

    result+="]"
    echo "$result"
}

echo "Bash Fibonacci:"
fib 10
```

```python
def f(n):
    if n <= 0:
        return 0
    if n == 1:
        return 1
    return f(n - 1) + f(n - 2)

print("Python Fibonacci:")
print([f(i) for i in range(10)])
```

```javascript
function f(n) {
    if (n <= 0) {
        return 0;
    }
    if (n === 1) {
        return 1;
    }
    return f(n - 1) + f(n - 2);
}

const result = [];
for (let i = 0; i < 10; i++) {
    result.push(f(i));
}

console.log("JavaScript Fibonacci:");
console.log("[" + result.join(", ") + "]");
```

```ruby
def f(n)
  return 0 if n <= 0
  return 1 if n == 1
  return f(n - 1) + f(n - 2)
end

result = (0...10).map { |i| f(i) }
puts "Ruby Fibonacci:"
print result
puts
```

```lua
function fibonacci(n)
    if n <= 0 then
        return 0
    elseif n == 1 then
        return 1
    else
        return fibonacci(n - 1) + fibonacci(n - 2)
    end
end

local result = {}
for i = 0, 9 do
    table.insert(result, fibonacci(i))
end

print("Lua Fibonacci:")
print("[" .. table.concat(result, ", ") .. "]")
```

```julia
function f(n)
    if n <= 0
        return 0
    elseif n == 1
        return 1
    else
        return f(n - 1) + f(n - 2)
    end
end

println("Julia Fibonacci:")
println([f(i) for i in 0:9])
```

```haskell
f :: Int -> Int
f n
    | n <= 0    = 0
    | n == 1    = 1
    | otherwise = f (n - 1) + f (n - 2)

intercalate :: String -> [String] -> String
intercalate _ [] = ""
intercalate sep [x] = x
intercalate sep (x:xs) = x ++ sep ++ intercalate sep xs

main :: IO ()
main = do
    putStrLn "Haskell Fibonacci:"
    putStrLn $ "[" ++ intercalate ", " (map show [f i | i <- [0..9]]) ++ "]"
```

```go
package main

import (
    "fmt"
    "strings"
)

func f(n int) int {
    if n <= 0 {
        return 0
    } else if n == 1 {
        return 1
    } else {
        return f(n-1) + f(n-2)
    }
}

func main() {
    fmt.Println("Go Fibonacci:")
    fibonacci := make([]string, 10)
    for i := range fibonacci {
        fibonacci[i] = fmt.Sprintf("%d", f(i))
    }
    fmt.Printf("[%s]\n", strings.Join(fibonacci, ", "))
}
```

```groovy
def f(n) {
    if (n <= 0) {
        return 0
    }
    if (n == 1) {
        return 1
    }
    return f(n - 1) + f(n - 2)
}

println("Groovy Fibonacci:")
println((0..9).collect { f(it) })
```

```dart
int f(int n) {
  if (n <= 0) {
    return 0;
  } else if (n == 1) {
    return 1;
  } else {
    return f(n - 1) + f(n - 2);
  }
}

void main() {
  print("Dart Fibonacci:");
  List<int> fibonacci = List<int>.generate(10, (i) => f(i));
  print(fibonacci);
}
```

```r
f <- function(n) {
  if (n <= 0) {
    return(0)
  } else if (n == 1) {
    return(1)
  } else {
    return(f(n - 1) + f(n - 2))
  }
}

cat("R Fibonacci:\n")
cat("[", paste(sapply(0:9, f), collapse = ", "), "]\n", sep = "")
```

```perl
sub f {
    my $n = shift;
    if ($n <= 0) {
        return 0;
    }
    if ($n == 1) {
        return 1;
    }
    return f($n - 1) + f($n - 2);
}

print "Perl Fibonacci:\n";
my @fibonacci;
for my $i (0..9) {
    push @fibonacci, f($i);
}
print "[" . join(", ", @fibonacci) . "]\n";
```

```php
<?php

function f($n) {
    if ($n <= 0) {
        return 0;
    }
    if ($n == 1) {
        return 1;
    }
    return f($n - 1) + f($n - 2);
}

echo "PHP Fibonacci:\n";
echo "[" . implode(", ", array_map("f", range(0, 9))) . "]\n";

?>
```

```c
#include <stdio.h>

int fibonacci(int n) {
    if (n <= 0) {
        return 0;
    }
    if (n == 1) {
        return 1;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    printf("C Fibonacci:\n");
    for (int i = 0; i < 10; i++) {
        printf("%d ", fibonacci(i));
    }
    printf("\n");
    return 0;
}
```

```java
public class Fibonacci {
    public static int f(int n) {
        if (n <= 0) {
            return 0;
        }
        if (n == 1) {
            return 1;
        }
        return f(n - 1) + f(n - 2);
    }

    public static void main(String[] args) {
        System.out.println("Java Fibonacci:");
        for (int i = 0; i < 10; i++) {
            System.out.print(f(i) + " ");
        }
        System.out.println();
    }
}
```

```rust
fn f(n: i32) -> i32 {
    if n <= 0 {
        return 0;
    } else if n == 1 {
        return 1;
    } else {
        return f(n - 1) + f(n - 2);
    }
}

fn main() {
    println!("Rust Fibonacci:");
    let fibonacci: Vec<i32> = (0..10).map(|i| f(i)).collect();
    println!("{:?}", fibonacci);
}
```

```cpp
#include <iostream>
#include <vector>

int f(int n) {
    if (n <= 0) {
        return 0;
    }
    if (n == 1) {
        return 1;
    }
    return f(n - 1) + f(n - 2);
}

int main() {
    std::cout << "C++ Fibonacci:" << std::endl;
    std::vector<int> fib_sequence;
    for (int i = 0; i < 10; i++) {
        fib_sequence.push_back(f(i));
    }
    for (int num : fib_sequence) {
        std::cout << num << " ";
    }
    std::cout << std::endl;
    return 0;
}
```