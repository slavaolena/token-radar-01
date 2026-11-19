# Token Radar 01

Build the best token launch radar - pre-token protocol analysis and ranking.

## Description

A token launch radar that scores pre-token DeFi protocols by implied value, using data from DefiLlama snapshot. The model ranks protocols based on TVL, growth, and maturity to identify promising pre-token opportunities.

## Run Command

```bash
node main.ts --input input/snapshot.json
```

## Badges

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/slavaolena/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/slavaolena/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

## Requirements

- Node.js 22
- Standard library only

## Model

The scoring model (radar-1) calculates implied value from:
- Base: TVL × base_multiple (0.25)
- Growth: 7-day change weighted
- Maturity: age-based factor

See [lib/model.ts](lib/model.ts) for details.
