# **Project Lantaw (TBD)**
---

## Backend Environment & Setup

- **Python version**: Use **Python 3.11.x** (required for `dagster==1.9.9` and related packages).
- **Virtual environment** (recommended):
  - On Windows (PowerShell): `python -m venv .venv; .venv\Scripts\Activate.ps1`
  - On Linux/macOS: `python3 -m venv .venv && source .venv/bin/activate`
- **Install dependencies**:
  - Production/runtime: `pip install -r lantaw/requirements.txt`
  - Dev/testing only: `pip install -r lantaw/requirements-dev.txt` (after it is created).

### Deploying to servers (Render, other hosts)

- Ensure the server uses **Python 3.11**, not 3.13+:
  - If using a Docker-based deploy, base your image on something like `python:3.11-slim`.
  - If using the platform’s native Python runtime, configure it to use **3.11** (for example, via runtime configuration in the dashboard or a `runtime.txt` equivalent if the host supports it).
- Then install dependencies with one of:
  - **Recommended for predictable installs (prod/servers)**: `pip install -r lantaw/requirements.lock.txt`
  - **For development**: `pip install -r lantaw/requirements.txt` and optionally `pip install -r lantaw/requirements-dev.txt`

> **Why 3.11?** Dagster `1.9.9` (and `dagster-*` packages in `lantaw/requirements.txt`) declare support for Python versions `>=3.9,<3.13`. Hosts that default to Python 3.13+ will fail to install these versions, so we standardize on Python 3.11 to keep behavior consistent between your local machine and servers.

## Project Description
