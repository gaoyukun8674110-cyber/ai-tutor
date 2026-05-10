export const tutorQueryKeys = {
  profiles: () => ['tutor', 'profiles'] as const,
  materials: () => ['tutor', 'materials'] as const,
  conversations: (search: string) => ['tutor', 'conversations', { search }] as const,
  conversation: (conversationId: number) => ['tutor', 'conversation', conversationId] as const,
};
