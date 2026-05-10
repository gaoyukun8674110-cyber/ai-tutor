import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { TutorChatWorkspace } from '../components/TutorChatWorkspace';

const DASHBOARD_USER_ID = 'local';

export function TutorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const refreshDashboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard-summary', DASHBOARD_USER_ID] });
  }, [queryClient]);

  return (
    <TutorChatWorkspace
      trainingMode="focus"
      onExit={() => navigate('/')}
      onPomodoroLogged={refreshDashboard}
    />
  );
}
