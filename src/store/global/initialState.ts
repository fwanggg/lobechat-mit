import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { SessionDefaultGroup } from '@/types/session';
import { AsyncLocalStorage } from '@/utils/localStorage';

export interface SystemStatus {
  // which sessionGroup should expand
  expandSessionGroupKeys: string[];
  hidePWAInstaller?: boolean;
  inputHeight: number;
  mobileShowTopic?: boolean;
  sessionsWidth: number;
  showSessionPanel?: boolean;
}

export interface GlobalState {
  hasNewVersion?: boolean;
  isMobile?: boolean;
  isStatusInit?: boolean;
  latestVersion?: string;
  router?: AppRouterInstance;
  status: SystemStatus;
  statusStorage: AsyncLocalStorage<SystemStatus>;
}

export const INITIAL_STATUS = {
  expandSessionGroupKeys: [SessionDefaultGroup.Pinned, SessionDefaultGroup.Default],
  hidePWAInstaller: false,
  inputHeight: 200,
  mobileShowTopic: false,
  sessionsWidth: 320,
  showSessionPanel: true,
} satisfies SystemStatus;

export const initialState: GlobalState = {
  isMobile: false,
  isStatusInit: false,
  status: INITIAL_STATUS,
  statusStorage: new AsyncLocalStorage('LOBE_SYSTEM_STATUS'),
};
