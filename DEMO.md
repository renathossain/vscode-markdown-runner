# Demo of extension's features

Download or copy this markdown file into VS Code after installing this extension, and test all the features out!

Keep in mind that you need to install the language before running a code block of that type, or it will fail.

```
echo "This is the start of the demo"
```

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