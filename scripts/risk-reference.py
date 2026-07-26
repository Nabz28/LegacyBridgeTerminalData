# risk-reference — independent-language reference for riskStats (roadmap
# 4.5 gate). Generates the SAME deterministic series as the unit test in
# test-monitor-engine.js (identical LCG) and computes the same statistics
# with plain python. The printed JSON is embedded in the JS test as the
# reference constants; agreement within 1e-9 gates the JS implementation.
#   python scripts/risk-reference.py
import json
import math

# Park-Miller minstd LCG — chosen because seed*48271 stays under 2^53,
# so the recurrence is EXACT in both python ints and JS doubles (the
# glibc constants 1103515245*2^31 overflow JS float precision and the
# two languages silently diverge — caught by this gate's first run).
seed = 42
def rnd():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647

N = 501  # 501 values -> 500 returns
vals = [100.0]
for _ in range(N - 1):
    r = (rnd() - 0.5) * 0.04  # log return in [-2%, +2%]
    vals.append(vals[-1] * math.exp(r))

logr = [math.log(vals[i] / vals[i - 1]) for i in range(1, N)]
n = len(logr)
mean = sum(logr) / n
dev = [x - mean for x in logr]
m2 = sum(x * x for x in dev) / n
m3 = sum(x ** 3 for x in dev) / n
m4 = sum(x ** 4 for x in dev) / n
sd = math.sqrt(sum(x * x for x in dev) / (n - 1))  # ddof=1

def quantile(arr, q):  # numpy 'linear'
    s = sorted(arr)
    pos = (len(s) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    return s[lo] if lo == hi else s[lo] + (s[hi] - s[lo]) * (pos - lo)

Z95 = -1.6448536269514722
Z99 = -2.3263478740408408

simple = [(vals[i] / vals[i - 1] - 1) * 100 for i in range(1, N)]
worst_i = min(range(n), key=lambda i: simple[i])
best_i = max(range(n), key=lambda i: simple[i])

peak, mdd = -1e18, 0.0
for v in vals:
    peak = max(peak, v)
    mdd = min(mdd, (v / peak - 1) * 100)

skew = (n * sum(x ** 3 for x in dev)) / ((n - 1) * (n - 2) * sd ** 3)

print(json.dumps({
    "n": n,
    "annVol": sd * math.sqrt(252) * 100,
    "var95": -quantile(logr, 0.05) * 100,
    "var99": -quantile(logr, 0.01) * 100,
    "pvar95": -(mean + Z95 * sd) * 100,
    "pvar99": -(mean + Z99 * sd) * 100,
    "mdd": mdd,
    "worstRet": simple[worst_i],
    "bestRet": simple[best_i],
    "skew": skew,
    "kurtosis": m4 / (m2 * m2) - 3,
}, indent=1))
