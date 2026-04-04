/**
 * Jira webhook trigger — intercepts inbound messages containing Jira ticket data
 * and reformats them as pipeline trigger commands for the factory orchestrator.
 *
 * This is a placeholder for the full Jira integration. In production, this would
 * parse the Jira webhook payload and extract task_id + title.
 */

interface HookEvent {
  type: string;
  context: {
    content: string;
    agentId?: string;
    sessionKey?: string;
  };
  messages: string[];
}

const handler = async (event: HookEvent): Promise<void> => {
  if (event.type !== "message:received") return;

  const content = event.context.content || "";

  // Match messages like "JIRA:SFT-123:Build a todo app"
  const match = content.match(/^JIRA:([A-Z]+-\d+):(.+)$/);
  if (!match) return;

  const [, taskId, title] = match;

  // Rewrite the message to trigger the pipeline orchestrator
  event.messages.push(
    `Process task ${taskId}: ${title.trim()}`
  );
};

export default handler;
