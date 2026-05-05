# Agent Execution Rules
- Before starting, always present a clear step-by-step plan.
- **Completion:** Once all tasks in the plan are finished, explicitly state "TASK COMPLETED" and summarize the changes.
- **Stuck/Error:** If a terminal command fails twice or you are unable to find a file after 3 attempts, STOP and ask me for guidance. Do not loop infinitely.
- **Notifications:** Use the `terminal` tool to run `echo -e "\a"` (system beep) or a desktop notification command if the OS supports it when a major milestone is reached.