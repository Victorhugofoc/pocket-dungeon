-- Lê módulos de dados do Dungeon Reign e imprime em JSON (usado por tests/parity.test.ts).
-- Uso: luajit tools/dr-dump.lua <raiz do dungeon-idle> <módulo> [<módulo> ...]
local root = assert(arg[1], "raiz do dungeon-idle")
package.path = root .. "/?.lua;" .. root .. "/?/init.lua;" .. package.path

local function isArray(t)
  local n = 0
  for k in pairs(t) do
    if type(k) ~= "number" or k < 1 or k % 1 ~= 0 then return false end
    n = n + 1
  end
  for i = 1, n do if t[i] == nil then return false end end
  return true
end

local function esc(s)
  local bs = string.char(92) -- barra invertida
  local out = s:gsub("[%c\"" .. bs .. bs .. "]", function(c)
    if c == '"' or c == bs then return bs .. c end
    return string.format(bs .. "u%04x", c:byte())
  end)
  return '"' .. out .. '"'
end

local function enc(v, seen)
  local t = type(v)
  if t == "number" then
    if v ~= v or v == math.huge or v == -math.huge then return "null" end
    if v % 1 == 0 and math.abs(v) < 2^53 then return string.format("%d", v) end
    return string.format("%.17g", v)
  elseif t == "string" then return esc(v)
  elseif t == "boolean" then return tostring(v)
  elseif t == "table" then
    if seen[v] then return "null" end
    seen[v] = true
    local out = {}
    if next(v) == nil then seen[v] = nil; return "{}" end
    if isArray(v) then
      for i = 1, #v do out[i] = enc(v[i], seen) end
      seen[v] = nil
      return "[" .. table.concat(out, ",") .. "]"
    end
    local keys = {}
    for k, x in pairs(v) do
      local tk = type(k)
      if (tk == "string" or tk == "number") and type(x) ~= "function" and type(x) ~= "userdata" then keys[#keys + 1] = k end
    end
    table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
    for _, k in ipairs(keys) do out[#out + 1] = esc(tostring(k)) .. ":" .. enc(v[k], seen) end
    seen[v] = nil
    return "{" .. table.concat(out, ",") .. "}"
  end
  return "null"
end

-- cada argumento é um módulo (`src.data.waves`) ou, começando com `=`, uma expressão Lua cujo valor entra no JSON
-- com o próprio texto como chave (para calcular as fórmulas de lá, onda a onda)
local compile = loadstring or load
local result = {}
for i = 2, #arg do
  local a = arg[i]
  if a:sub(1, 1) == "=" then
    result[a] = assert(compile("return " .. a:sub(2)))()
  else
    result[a] = require(a)
  end
end
io.write(enc(result, {}))
