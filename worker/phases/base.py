"""Base class for research phases."""

import json
import re
import subprocess
from worker.config import PHASE_TIMEOUT


def run_claude(prompt: str, allowed_tools: str = "Bash", timeout: int | None = None) -> dict:
    """Run Claude CLI with a prompt. Returns parsed JSON output."""
    result = subprocess.run(
        ["claude", "-p", prompt, "--allowedTools", allowed_tools],
        capture_output=True,
        text=True,
        timeout=timeout or PHASE_TIMEOUT,
    )

    if result.returncode != 0:
        error = result.stderr[:500] if result.stderr else "Unknown error"
        raise RuntimeError(f"Claude CLI failed: {error}")

    output = result.stdout.strip()

    # Try direct JSON parse
    try:
        return json.loads(output)
    except json.JSONDecodeError:
        pass

    # Extract JSON from output
    match = re.search(r'\{[\s\S]*\}', output)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Return raw output wrapped
    return {"raw_output": output}
