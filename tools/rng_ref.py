M = 0xFFFFFFFF

def fnv1a(s):
    h = 2166136261
    for b in s.encode("utf-8"):
        h ^= b
        h = (h * 16777619) & M
    return h

def fmix(h):
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & M
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & M
    h ^= h >> 16
    return h

def rotl(x, k):
    return ((x << k) | (x >> (32 - k))) & M

class Rng:
    def __init__(self, seed, stream=""):
        lo = seed & M
        hi = (seed >> 32) & M
        k = fmix(lo ^ fnv1a(stream))
        self.s = [fmix((k + i * 0x9E3779B9 + hi) & M) for i in range(4)]
        if not any(self.s):
            self.s[0] = 1

    def next_u32(self):
        s = self.s
        r = (rotl((s[1] * 5) & M, 7) * 9) & M
        t = (s[1] << 9) & M
        s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]
        s[2] ^= t
        s[3] = rotl(s[3], 11)
        return r

for seed, stream in [(0, ""), (12345, "combat"), (-7, "shop"), (2**40 + 3, "waves")]:
    r = Rng(seed, stream)
    print(seed, stream, [r.next_u32() for _ in range(5)])
