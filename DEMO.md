# Demo of extension's features

```python
def f(n):
    if n <= 0:
        return 0
    if n == 1:
        return 1
    return f(n - 1) + f(n - 2)

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
console.log("[" + result.join(", ") + "]");
```

```ruby
def f(n)
  return 0 if n <= 0
  return 1 if n == 1
  return f(n - 1) + f(n - 2)
end

result = (0...10).map { |i| f(i) }
print result
puts
```