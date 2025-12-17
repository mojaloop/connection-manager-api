export class MailpitHelper {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getLatestMessageForEmail(email: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/messages`);
    const data = await response.json();

    const message = data.messages?.find((msg: any) =>
      msg.To?.some((recipient: any) => recipient.Address === email)
    );

    if (!message) {
      return null;
    }

    const messageResponse = await fetch(`${this.baseUrl}/api/v1/message/${message.ID}`);
    return messageResponse.json();
  }

  extractInvitationLink(messageText: string): string | null {
    const linkMatch = messageText.match(/http:\/\/keycloak[^\s]+/);
    return linkMatch ? linkMatch[0] : null;
  }

  async deleteAllMessages(): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/messages`, { method: 'DELETE' });
  }
}
