// @flow
import Action from './lib/Action';

// ======= ACCOUNTS ACTIONS =======

export default class AccountsActions {
  updateDropboxToken: Action<any> = new Action;
  saveMemo: Action<any> = new Action;
  saveMemoToLocal: Action<any> = new Action;
}
