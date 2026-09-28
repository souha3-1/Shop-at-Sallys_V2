---
name: Conversation app handoff
description: How to recover a runnable app after moving a conversation into a Replit project.
---

After a conversation moves into a project, preserved app files can remain under the conversation workspace and the project may only have its default artifacts registered. Register the app as a real artifact before trying to launch its preview.

**Why:** The project registry and workflows are not guaranteed to discover an artifact copied after the project opens.

**How to apply:** Check `listArtifacts()` and the project artifact directories after a handoff; register the missing web app, copy the preserved implementation into it, install workspace dependencies, restart its managed workflow, and present the artifact.