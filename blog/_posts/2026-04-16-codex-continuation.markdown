---
layout: post
title: "How to Keep Codex Running Indefinitely"
date: 2026-04-16 00:00:00
categories: agents

---

I've been using OpenAI's Codex for programmatically verifible tasks that can
take a long time to complete, such as formalizing a proof in Lean, or using
[autoresearch](github.com/karpathy/autoresearch) to iteratively improve ML
models. Codex tends to stop at reasonable-looking milestones even when the next
step is obvious, which can be a pain when I want it to run unattended. A `Stop`
hook that injects a continuation prompt fixes it.

You register the hook once in `~/.codex` and opt in per run, so there's nothing
to add to individual projects.  The setup is three files, and the hook stays off
unless you set `CODEX_KEEPALIVE=1`.

#### Step 1: Enable hooks

In `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

#### Step 2: Register the `Stop` hook

In `~/.codex/hooks.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 /home/your-user/.codex/hooks/keep_session_alive.py",
            "timeout": 5,
            "statusMessage": "Evaluating keep-alive hook"
          }
        ]
      }
    ]
  }
}
```

Replace `/home/your-user` with your home directory.

#### Step 3: The hook script

In `~/.codex/hooks/keep_session_alive.py`:

```python
#!/usr/bin/env python3

import json
import os
import subprocess
import sys

ENABLE_ENV = "CODEX_KEEPALIVE"
PROMPT_ENV = "CODEX_KEEPALIVE_PROMPT"
SCRIPT_ENV = "CODEX_KEEPALIVE_SCRIPT"
DEFAULT_PROMPT = (
    "Continue working in this session without waiting for the user. "
    "Do another pass: verify the latest result, look for the next "
    "concrete action, and keep going."
)


def main() -> int:
    if not os.getenv(ENABLE_ENV):
        return 0

    json.load(sys.stdin)

    script = os.getenv(SCRIPT_ENV)
    if script:
        result = subprocess.run(script, shell=True)
        if result.returncode == 0:
            return 0

    json.dump(
        {
            "decision": "block",
            "reason": os.getenv(PROMPT_ENV, DEFAULT_PROMPT),
        },
        sys.stdout,
    )
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

When `CODEX_KEEPALIVE` is set, the hook writes a `block` decision back to Codex
with a continuation prompt, and Codex treats it as a new user turn instead of
ending the session. If `CODEX_KEEPALIVE_SCRIPT` is also set, the hook runs that
command first; a zero exit lets the session end naturally, giving you an exit
condition.

#### Usage

Nothing changes by default — plain `codex` runs as before. To run unattended:

```bash
CODEX_KEEPALIVE=1 codex --yolo
```

`--yolo` auto-approves every action, so **only do this inside a sandbox**
(Docker, VM, etc.). An unattended agent with auto-approval on your host can
quietly wreck things.

With a task-specific prompt and exit condition:

```bash
CODEX_KEEPALIVE=1 \
CODEX_KEEPALIVE_PROMPT="Keep iterating until tests pass." \
CODEX_KEEPALIVE_SCRIPT="python3 check_tests.py" \
codex --yolo
```

The hook runs `check_tests.py` on every stop; as soon as it exits `0`, Codex
stops for real.
