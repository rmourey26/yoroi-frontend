// @flow
import Action from './lib/Action';

// ======= ACCOUNTS ACTIONS =======

export default class AccountsActions {
  updateDropboxToken: Action<any> = new Action;
  saveMemo: Action<{ memoId: string, memoText: string }> = new Action;
  saveMemoToLocal: Action<any> = new Action;
}
