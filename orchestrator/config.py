"""Factory-wide configuration: env vars, paths, constants."""

import os
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Directories
MEMORY_DIR = Path("memory")
AUDIT_DIR = Path("audit")
TEMPLATE_PATH = MEMORY_DIR / "_template.md"
SKILLS_DIR = Path(".claude/skills")
DB_PATH = "factory.db"

# API keys and secrets
JIRA_DOMAIN = os.getenv("JIRA_DOMAIN", "")           # e.g. "mycompany" → mycompany.atlassian.net
JIRA_EMAIL = os.getenv("JIRA_EMAIL", "")              # Atlassian account email
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")      # from id.atlassian.com/manage-profile/security/api-tokens
JIRA_WEBHOOK_SECRET = os.getenv("JIRA_WEBHOOK_SECRET", "")
JIRA_SUBTASK_ISSUETYPE = os.getenv("JIRA_SUBTASK_ISSUETYPE", "Subtask")  # may be "Sub-task" in some projects
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")

GITHUB_ORG = os.getenv("GITHUB_ORG", "ashtilawat")
WORKSPACE_DIR = Path("/app/workspace")

# Timeouts
AGENT_TIMEOUT = 1800  # 30 minutes

# Logging
logger = logging.getLogger("factory")
logging.basicConfig(level=logging.INFO)
