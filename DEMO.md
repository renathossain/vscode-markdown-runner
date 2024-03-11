# Demo of extension's features

Run the following code blocks to test out all the features:

```bash
ping google.com
```

```bash
echo "Hello"
echo "This is a bash file."
```

Mistakes in code demo:

```c
#include <stdio.h>

int main() {
    return 0;
}

}
```

Fibonacci in different programming languages:

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

```typescript
function f(n: number): number {
    if (n <= 0) {
        return 0;
    }
    if (n === 1) {
        return 1;
    }
    return f(n - 1) + f(n - 2);
}

console.log("TypeScript Fibonacci:");
console.log("[" + Array.from({ length: 10 }, (_, i) => f(i)).join(', ') + "]");
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
    printf("C Fibonacci:\n[");
    for (int i = 0; i < 10; i++) {
        printf("%d", fibonacci(i));
        if (i < 9) {
            printf(", ");
        }
    }
    printf("]\n");
    return 0;
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
    std::cout << "C++ Fibonacci:" << std::endl;
    std::cout << "[";
    for (int i = 0; i < 10; i++) {
        std::cout << fibonacci(i);
        if (i < 9) {
            std::cout << ", ";
        }
    }
    std::cout << "]" << std::endl;
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
        System.out.print("[");
        for (int i = 0; i < 10; i++) {
            System.out.print(f(i));
            if (i < 9) {
                System.out.print(", ");
            }
        }
        System.out.println("]");
    }
}
```